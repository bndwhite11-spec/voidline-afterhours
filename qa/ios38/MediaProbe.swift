import UIKit
import WebKit

@main
@MainActor
final class MediaProbe: UIResponder, UIApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    var window: UIWindow?
    var web: WKWebView!
    var coordinator: MessengerWebView.Coordinator!
    var seen = Set<String>()
    var records: [[String: Any]] = []
    var stage = 0
    var events: [String] = []
    var finished = false
    let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]

    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        coordinator = MessengerWebView.Coordinator(model: MessengerModel())
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.userContentController.add(self, name: "probe")
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        let root = UIViewController()
        root.view = web
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = root
        window?.makeKeyAndVisible()
        // This probe never requests a media stream or issues a VOIDLINE account mutation.
        web.loadHTMLString("""
            <html><body><iframe srcdoc="<script>webkit.messageHandlers.probe.postMessage('child')</script>"></iframe>
            <script>webkit.messageHandlers.probe.postMessage('opaque')</script></body></html>
        """, baseURL: nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 95) { self.finish(false) }
        return true
    }

    // WebKit assigns security origins to these synthetic HTTPS responses. Every
    // labeled document and its inherited-origin child are fixtures in this QA app.
    func loadFixture(_ url: URL, main: String, child: String? = nil) {
        let embedded = child.map { "<iframe srcdoc=\"<script>webkit.messageHandlers.probe.postMessage('\($0)')</script>\"></iframe>" } ?? ""
        let html = "<html><body>\(embedded)<script>webkit.messageHandlers.probe.postMessage('\(main)')</script></body></html>"
        web.loadSimulatedRequest(URLRequest(url: url), response: HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: ["Content-Type":"text/html; charset=utf-8"])!, responseData: Data(html.utf8))
    }

    func stageComplete() {
        if stage == 0 && seen.isSuperset(of: ["opaque","child"]) {
            stage = 1
            DispatchQueue.main.async {
                self.loadFixture(VoidlinePolicy.startURL, main: "trusted", child: "trusted-child")
            }
        } else if stage == 1 && seen.isSuperset(of: ["trusted","trusted-child"]) {
            stage = 2
            DispatchQueue.main.async {
                self.loadFixture(URL(string: "https://" + VoidlinePolicy.host + ":444/capture-test")!, main: "other-port")
            }
        } else if stage == 2 && seen.contains("other-port") { finish(true) }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { events.append("finished " + (webView.url?.absoluteString ?? "nil")) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { events.append(error.localizedDescription) }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { events.append(error.localizedDescription) }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard !finished, let label = message.body as? String,
              ["opaque","child","trusted","trusted-child","other-port"].contains(label), !seen.contains(label) else { return }
        let frame = message.frameInfo
        let origin = frame.securityOrigin
        let trusted = label == "trusted"
        events.append("\(label) \(origin.protocol)://\(origin.host):\(origin.port) main=\(frame.isMainFrame)")
        let expectedMain = !["child","trusted-child"].contains(label)
        if frame.isMainFrame != expectedMain ||
            (["trusted","trusted-child","other-port"].contains(label) && (origin.protocol != "https" || origin.host != VoidlinePolicy.host)) ||
            (["trusted","trusted-child"].contains(label) && ![0,443].contains(origin.port)) ||
            (label == "other-port" && origin.port != 444) {
            finish(false); return
        }
        seen.insert(label)
        var matched = true
        for (name, kind) in [("microphone",WKMediaCaptureType.microphone),("camera",.camera),("combined",.cameraAndMicrophone)] {
            var answer: WKPermissionDecision?
            coordinator.webView(web, requestMediaCapturePermissionFor: origin, initiatedByFrame: frame,
                                type: kind, decisionHandler: { answer = $0 })
            let expected: WKPermissionDecision = trusted ? .prompt : .deny
            if answer != expected { matched = false }
            records.append(["frame": label, "scheme": origin.protocol, "host": origin.host, "port": origin.port,
                            "mainFrame": frame.isMainFrame, "type": name,
                            "decision": answer == .prompt ? "prompt" : answer == .deny ? "deny" : "other"])
        }
        if !matched { finish(false); return }
        stageComplete()
    }

    func finish(_ ok: Bool) {
        if finished { return }
        finished = true
        let result: [String: Any] = ["passed": ok, "checks": records, "observedFrames": Array(seen).sorted(), "events": events]
        if let bytes = try? JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted]) {
            try? bytes.write(to: documents.appendingPathComponent("media.json"), options: .atomic)
        }
    }
}
