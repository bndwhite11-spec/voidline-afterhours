import SwiftUI
import WebKit
import UIKit

struct MessengerWebView: UIViewRepresentable {
    @ObservedObject var model: MessengerModel

    func makeCoordinator() -> Coordinator { Coordinator(model: model) }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = .all
        // No JavaScript message handler, injected script or native account/key bridge.
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.055, green: 0.063, blue: 0.075, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = true
        webView.isInspectable = false
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        context.coordinator.watchSessionChanges(configuration.websiteDataStore.httpCookieStore)
        model.webView = webView
        webView.load(URLRequest(url: VoidlinePolicy.startURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        coordinator.cancelDownload()
        coordinator.stopWatchingSessionChanges()
        webView.stopLoading()
        webView.navigationDelegate = nil
        webView.uiDelegate = nil
    }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate, WKHTTPCookieStoreObserver {
        private let model: MessengerModel
        private var currentDownload: WKDownload?
        private var destination: URL?
        private var downloadTimer: Timer?
        private var cookieStore: WKHTTPCookieStore?
        private var cookieReadSerial = 0
        private var appliedCookieRead = 0
        private var sessionBaselineReady = false
        private var csrfGeneration: String?
        private var downloadGeneration: String?
        private var activeNavigation: WKNavigation?

        init(model: MessengerModel) { self.model = model }

        func watchSessionChanges(_ store: WKHTTPCookieStore) {
            cookieStore = store
            store.add(self)
            readSessionGeneration()
        }

        func stopWatchingSessionChanges() {
            cookieStore?.remove(self)
            cookieStore = nil
            cookieReadSerial += 1
        }

        func cookiesDidChange(in cookieStore: WKHTTPCookieStore) {
            readSessionGeneration()
        }

        private func readSessionGeneration(_ completion: ((String?) -> Void)? = nil) {
            guard let store = cookieStore else { return }
            cookieReadSerial += 1
            let serial = cookieReadSerial
            store.getAllCookies { [weak self, weak store] cookies in
                // Access only the non-HttpOnly CSRF generation value. Session
                // bearer values are never inspected, retained or exported.
                let matching = cookies.filter {
                    $0.name == "__Host-voidline_csrf" && $0.domain.lowercased() == VoidlinePolicy.host
                        && $0.path == "/" && $0.isSecure && !$0.isHTTPOnly
                }
                let generation = matching.count == 1 ? matching[0].value : nil
                Task { @MainActor [weak self, weak store] in
                    guard let self, let store, self.cookieStore === store else { return }
                    if serial >= self.appliedCookieRead {
                        self.appliedCookieRead = serial
                        if self.sessionBaselineReady && generation != self.csrfGeneration {
                            let hadFile = self.currentDownload != nil || self.model.downloadedFile != nil
                            self.cancelDownload()
                            self.model.removeSharedTemporaryFile()
                            if hadFile { self.model.notice = "Your session changed. Download the file again from the current account." }
                        }
                        self.csrfGeneration = generation
                        self.sessionBaselineReady = true
                    }
                    completion?(self.csrfGeneration)
                }
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            let url = action.request.url
            if action.shouldPerformDownload && VoidlinePolicy.permitsDownload(url) {
                decisionHandler(.download)
                return
            }
            if VoidlinePolicy.isApplicationURL(url) {
                decisionHandler(.allow)
                return
            }
            // Images/media/blob subresources remain WebKit's responsibility. A
            // top-level file:, data:, javascript: or arbitrary custom scheme is denied.
            decisionHandler(.cancel)
            if action.navigationType == .linkActivated, let url, VoidlinePolicy.isExternalWebURL(url) {
                UIApplication.shared.open(url)
            } else if action.targetFrame?.isMainFrame != false {
                model.notice = "This link cannot open inside VOIDLINE."
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse,
                     decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
            let attachment = (response.response as? HTTPURLResponse)?
                .value(forHTTPHeaderField: "Content-Disposition")?.lowercased().hasPrefix("attachment") ?? false
            if (attachment || !response.canShowMIMEType) && VoidlinePolicy.permitsDownload(response.response.url) {
                decisionHandler(.download)
            } else if VoidlinePolicy.isApplicationURL(response.response.url) {
                decisionHandler(.allow)
            } else {
                decisionHandler(.cancel)
            }
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            guard let url = action.request.url else { return nil }
            if VoidlinePolicy.isApplicationURL(url) { webView.load(action.request) }
            else if VoidlinePolicy.isExternalWebURL(url) { UIApplication.shared.open(url) }
            return nil
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            activeNavigation = navigation
            model.state = .loading
        }
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard let navigation, navigation === activeNavigation else { return }
            model.state = .ready
        }
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            guard let navigation, navigation === activeNavigation else { return }
            failNavigation(error)
        }
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            guard let navigation, navigation === activeNavigation else { return }
            failNavigation(error)
        }
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            activeNavigation = nil
            model.state = .failed("The page stopped. Reload to reconnect.")
        }
        private func failNavigation(_ error: Error) {
            let failure = error as NSError
            guard !(failure.domain == NSURLErrorDomain && failure.code == NSURLErrorCancelled) else { return }
            model.state = .failed("Check your internet connection, then try again.")
        }

        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            let trusted = origin.protocol == "https" && origin.host == VoidlinePolicy.host
                && (origin.port == 0 || origin.port == 443) && frame.isMainFrame
            switch type {
            case .microphone, .camera, .cameraAndMicrophone:
                decisionHandler(trusted ? .prompt : .deny)
            @unknown default:
                decisionHandler(.deny)
            }
        }

        func webView(_ webView: WKWebView, requestDeviceOrientationAndMotionPermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(.deny)
        }

        func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
            adopt(download)
        }
        func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
            adopt(download)
        }
        private func adopt(_ download: WKDownload) {
            guard sessionBaselineReady else {
                download.cancel(nil)
                model.notice = "Wait for your session to load, then retry the download."
                return
            }
            guard currentDownload == nil, model.downloadedFile == nil else {
                download.cancel(nil)
                model.notice = "Finish the current file download before opening another."
                return
            }
            currentDownload = download
            downloadGeneration = csrfGeneration
            download.delegate = self
            model.downloading = true
            downloadTimer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self, weak download] _ in
                Task { @MainActor in
                    guard let self, let download, self.currentDownload === download else { return }
                    if download.progress.completedUnitCount > VoidlinePolicy.maximumDownloadBytes {
                        self.cancelDownload()
                        self.model.notice = "This file exceeds the app's 32 MB download limit. Open it in Safari instead."
                    }
                }
            }
        }

        func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                      suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
            guard currentDownload === download, VoidlinePolicy.permitsDownload(response.url ?? download.originalRequest?.url),
                  response.expectedContentLength <= VoidlinePolicy.maximumDownloadBytes else {
                completionHandler(nil)
                cancelDownload()
                model.notice = "This file cannot be downloaded inside the app. Open it in Safari instead."
                return
            }
            do {
                let directory = FileManager.default.temporaryDirectory
                    .appendingPathComponent("VOIDLINE-download-" + UUID().uuidString, isDirectory: true)
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true,
                    attributes: [.protectionKey: FileProtectionType.complete])
                let file = directory.appendingPathComponent(VoidlinePolicy.safeFilename(suggestedFilename))
                destination = file
                completionHandler(file)
            } catch {
                completionHandler(nil)
                cancelDownload()
                model.notice = "The file could not be saved. Free some device space and try again."
            }
        }

        func download(_ download: WKDownload, willPerformHTTPRedirection response: HTTPURLResponse,
                      newRequest request: URLRequest, decisionHandler: @escaping (WKDownload.RedirectPolicy) -> Void) {
            decisionHandler(VoidlinePolicy.permitsDownload(request.url) ? .allow : .cancel)
        }

        func downloadDidFinish(_ download: WKDownload) {
            guard currentDownload === download, let file = destination else { return }
            readSessionGeneration { [weak self, weak download] generation in
                guard let self, let download, self.currentDownload === download else { return }
                guard generation == self.downloadGeneration else {
                    self.cancelDownload()
                    return
                }
                self.finishDownload(download, file: file)
            }
        }

        private func finishDownload(_ download: WKDownload, file: URL) {
            guard currentDownload === download else { return }
            let bytes = (try? file.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            if Int64(bytes) > VoidlinePolicy.maximumDownloadBytes {
                cancelDownload()
                model.notice = "The file exceeded the app's 32 MB download limit."
                return
            }
            downloadTimer?.invalidate()
            downloadTimer = nil
            currentDownload = nil
            downloadGeneration = nil
            destination = nil
            model.downloading = false
            model.presentDownloadedFile(file)
        }

        func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
            guard currentDownload === download else { return }
            cancelDownload()
            model.notice = "The download did not finish. Retry from the original conversation."
        }

        func cancelDownload() {
            downloadTimer?.invalidate()
            downloadTimer = nil
            currentDownload?.delegate = nil
            currentDownload?.cancel(nil)
            currentDownload = nil
            downloadGeneration = nil
            if let file = destination { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }
            destination = nil
            model.downloading = false
        }
    }
}

