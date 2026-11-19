import Foundation

/// This wrapper has one application origin. It grants no account privilege.
enum VoidlinePolicy {
    static let host = "voidline-afterhours.pipedcactus1.chatgpt.site"
    static let origin = "https://" + host
    static let startURL = URL(string: origin + "/")!
    static let maximumDownloadBytes: Int64 = 32 * 1024 * 1024

    static func isApplicationURL(_ url: URL?) -> Bool {
        guard let url else { return false }
        return url.scheme?.lowercased() == "https"
            && url.host?.lowercased() == host
            && (url.port == nil || url.port == 443)
            && url.user == nil && url.password == nil
    }

    static func isApplicationBlob(_ url: URL?) -> Bool {
        guard let url else { return false }
        return url.absoluteString.hasPrefix("blob:" + origin + "/")
    }

    static func isExternalWebURL(_ url: URL?) -> Bool {
        guard let url, let scheme = url.scheme?.lowercased() else { return false }
        return ["https", "http"].contains(scheme) && url.host != nil
            && url.user == nil && url.password == nil
    }

    static func permitsDownload(_ url: URL?) -> Bool {
        guard let url else { return false }
        if isApplicationURL(url) || isApplicationBlob(url) { return true }
        guard url.scheme == "https", url.user == nil, url.password == nil,
              url.port == nil || url.port == 443 else { return false }
        if url.host == "github.com" {
            return url.path.hasPrefix("/bndwhite11-spec/voidline-afterhours/releases/download/")
        }
        return url.host == "release-assets.githubusercontent.com"
    }

    static func safeFilename(_ suggestion: String) -> String {
        let last = (suggestion as NSString).lastPathComponent
        let cleaned = last.unicodeScalars.filter {
            !CharacterSet.controlCharacters.contains($0) && $0 != ":" && $0 != "\\"
        }.map(String.init).joined()
        if cleaned.isEmpty || cleaned == "." || cleaned == ".." { return "VOIDLINE-download" }
        return String(cleaned.prefix(120))
    }
}

