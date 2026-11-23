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
    var liveStarted = false
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
        DispatchQueue.main.asyncAfter(deadline: .now() + 60) { self.finish(false) }
        return true
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if liveStarted && VoidlinePolicy.isApplicationURL(webView.url) {
            webView.evaluateJavaScript("webkit.messageHandlers.probe.postMessage('live')") { _,_ in }
        }
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard !finished, let label = message.body as? String,
              ["opaque", "child", "live"].contains(label), !seen.contains(label) else { return }
        let frame = message.frameInfo
        let origin = frame.securityOrigin
        let trusted = label == "live"
        if frame.isMainFrame != (label != "child") ||
            (trusted && (origin.protocol != "https" || origin.host != VoidlinePolicy.host)) {
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
        if seen.contains("child") && seen.contains("opaque") && !liveStarted {
            liveStarted = true
            web.load(URLRequest(url: VoidlinePolicy.startURL))
        } else if seen.count == 3 { finish(true) }
    }

    func finish(_ ok: Bool) {
        if finished { return }
        finished = true
        let result: [String: Any] = ["passed": ok, "checks": records, "observedFrames": Array(seen).sorted()]
        if let bytes = try? JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted]) {
            try? bytes.write(to: documents.appendingPathComponent("media.json"), options: .atomic)
        }
    }
}
