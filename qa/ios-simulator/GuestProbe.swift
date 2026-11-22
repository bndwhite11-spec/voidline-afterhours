import Foundation
import UIKit
import WebKit

@main
final class GuestProbe: UIResponder, UIApplicationDelegate, WKNavigationDelegate {
    private let origin = URL(string: "https://voidline-afterhours.pipedcactus1.chatgpt.site")!
    private let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    var window: UIWindow?
    private var web: WKWebView!
    private var closed = false
    private var stage = "starting"
    private var observations: [String: Any] = [:]

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        web = WKWebView(frame: .zero, configuration: configuration)
        web.navigationDelegate = self
        let root = UIViewController()
        root.view.addSubview(web)
        web.translatesAutoresizingMaskIntoConstraints = false
        let guide = root.view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: guide.topAnchor),
            web.leadingAnchor.constraint(equalTo: guide.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: guide.trailingAnchor),
            web.bottomAnchor.constraint(equalTo: guide.bottomAnchor)
        ])
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = root
        self.window = window
        window.makeKeyAndVisible()
        DispatchQueue.main.asyncAfter(deadline: .now() + 100) {
            if !self.closed {
                self.web.evaluateJavaScript("""
                    (() => ({path:location.pathname, title:document.title, tiles:document.querySelectorAll('[data-art-open]').length,
                    selected:document.querySelector('#ar-title')?.textContent||'', status:document.querySelector('#ar-status')?.textContent||''}))()
                    """) { raw, _ in
                    self.observations["timeout"] = raw
                    self.finish("failed", "Timed out at " + self.stage)
                }
            }
        }
        stage = "login"
        web.load(URLRequest(url: URL(string: "/chats", relativeTo: origin)!.absoluteURL))
        return true
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let url = action.request.url
        let allowed = url?.host == origin.host && url?.scheme == "https" && action.request.httpMethod == "GET"
        decisionHandler(allowed ? .allow : .cancel)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        finish("failed", "Navigation failed at " + stage + ": " + error.localizedDescription)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if stage == "login" {
            waitFor("login", """
                (() => {
                  const form = document.querySelector('[data-home-form="login"]');
                  const register = document.querySelector('[data-home="auth-register"]');
                  if (!form || !form.offsetHeight || !register || !form.querySelector('input[type=password]')) return null;
                  return {viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, tab: register.textContent.trim()};
                })()
                """) {
                    self.snapshot("login") {
                        self.stage = "signup"
                        self.web.evaluateJavaScript("document.querySelector('[data-home=\"auth-register\"]').click(); true") { _, err in
                            if let err = err { self.finish("failed", err.localizedDescription); return }
                            self.checkSignup()
                        }
                    }
                }
        } else if stage == "series" {
            waitFor("series", """
                (() => {
                  const cards = [...document.querySelectorAll('[data-art-open]')].filter(el => !el.hidden);
                  if (cards.length !== 5 || !cards.every(card => card.dataset.artOpen.startsWith('gift-cartridge-'))) return null;
                  return {objects:cards.map(card => card.querySelector('strong').textContent),
                          viewport:innerWidth,pageWidth:document.documentElement.scrollWidth};
                })()
                """) { self.snapshot("series") { self.finish("passed", "Guest login, signup, original cartridge playback and five gifts rendered") } }
        } else if stage == "art" {
            waitFor("art", """
                (() => {
                  const dialog = document.querySelector('#ar-dialog[open]');
                  if (!dialog) return null;
                  const svg = dialog.querySelector('#ar-stage svg[data-art-object="gift-copium-cartridge"]');
                  if (!svg?.querySelector('[data-part="cartridge-smoke-ring"]')) return null;
                  const play = dialog?.querySelector('#ar-play');
                  const status = dialog?.querySelector('#ar-status')?.textContent || '';
                  if (!svg || !play || !svg.getBoundingClientRect().width || !/resting/i.test(status)) return null;
                  const parts = svg.querySelectorAll('[data-part]').length;
                  if (!parts) return null;
                  return {title: dialog.querySelector('#ar-title').textContent, model: svg.dataset.artObject, svgParts:parts,
                          status, viewport: innerWidth, pageWidth: document.documentElement.scrollWidth};
                })()
                """) {
                    self.snapshot("art") {
                        self.stage = "playback"
                        self.web.evaluateJavaScript("document.querySelector('#ar-play').click(); true") { _, error in
                            if let error = error { self.finish("failed", error.localizedDescription); return }
                            self.checkPlayback()
                        }
                    }
                }
        }
    }

    private func checkPlayback() {
        waitFor("playback", """
            (() => {
              const stage = document.querySelector('#ar-stage');
              const status = document.querySelector('#ar-status')?.textContent || '';
              const complete = stage?.dataset.vaState === 'complete' || stage?.querySelector('[data-va-state="complete"]');
              if (!complete || !/complete/i.test(status) || document.querySelector('#ar-frame')?.value !== '100') return null;
              return {status, state:stage?.dataset.vaState || null, viewport:innerWidth, pageWidth:document.documentElement.scrollWidth};
            })()
            """) { self.stage = "series"
                self.web.load(URLRequest(url: URL(string: "/art-review.html?series=Copium%20Cartridges", relativeTo: self.origin)!.absoluteURL)) }
    }

    private func checkSignup() {
        waitFor("signup", """
            (() => {
              const form = document.querySelector('[data-home-form="register"]');
              if (!form || !form.offsetHeight || !form.querySelector('[name=passwordConfirm]')) return null;
              return {fields:form.querySelectorAll('input').length, viewport:innerWidth, pageWidth:document.documentElement.scrollWidth};
            })()
            """) {
                self.stage = "art"
                let gallery = URL(string: "/art-review.html?item=gift-copium-cartridge", relativeTo: self.origin)!.absoluteURL
                self.web.load(URLRequest(url: gallery))
            }
    }

    private func waitFor(_ name: String, _ script: String, _ next: @escaping () -> Void) {
        guard !closed, name == stage else { return }
        web.evaluateJavaScript(script) { result, error in
            guard !self.closed, name == self.stage else { return }
            if let error = error { self.finish("failed", name + ": " + error.localizedDescription); return }
            guard let data = result as? [String: Any] else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { self.waitFor(name, script, next) }
                return
            }
            guard let view = data["viewport"] as? NSNumber, let content = data["pageWidth"] as? NSNumber,
                  view.intValue >= 300, content.intValue <= view.intValue + 1 else {
                self.finish("failed", "Invalid or overflowing viewport at " + name); return
            }
            self.observations[name] = data
            next()
        }
    }

    private func snapshot(_ name: String, _ next: @escaping () -> Void) {
        web.takeSnapshot(with: nil) { image, error in
            guard !self.closed else { return }
            guard let png = image?.pngData(), error == nil else { self.finish("failed", "Snapshot failed at " + name); return }
            do { try png.write(to: self.directory.appendingPathComponent(name + ".png"), options: .atomic) }
            catch { self.finish("failed", "Could not save snapshot at " + name); return }
            next()
        }
    }

    private func finish(_ status: String, _ message: String) {
        guard !closed else { return }
        closed = true
        let payload: [String: Any] = [
            "status": status, "message": message, "system": UIDevice.current.systemName,
            "version": UIDevice.current.systemVersion, "checks": observations
        ]
        if let json = try? JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted, .sortedKeys]) {
            try? json.write(to: directory.appendingPathComponent("result.json"), options: .atomic)
        }
    }
}
