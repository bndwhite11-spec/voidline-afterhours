import XCTest
@testable import VoidlineApp

final class VoidlinePolicyTests: XCTestCase {
    func testOnlyExactHTTPSApplicationOriginIsInternal() {
        XCTAssertTrue(VoidlinePolicy.isApplicationURL(VoidlinePolicy.startURL))
        XCTAssertTrue(VoidlinePolicy.isApplicationURL(URL(string: VoidlinePolicy.origin + "/#messages/fixture")))
        for text in ["http://" + VoidlinePolicy.host, "file:///etc/passwd", "data:text/html,hello",
                     "javascript:alert(1)", "https://" + VoidlinePolicy.host + ".evil.example/",
                     "https://user:password@" + VoidlinePolicy.host + "/",
                     "https://" + VoidlinePolicy.host + ":444/"] {
            XCTAssertFalse(VoidlinePolicy.isApplicationURL(URL(string: text)), text)
        }
    }

    func testFilesAndCustomSchemesNeverLaunchExternally() {
        for text in ["file:///private/file", "javascript:alert(1)", "voidline://owner", "tel:123", "data:text/html,x"] {
            XCTAssertFalse(VoidlinePolicy.isExternalWebURL(URL(string: text)), text)
        }
        XCTAssertTrue(VoidlinePolicy.isExternalWebURL(URL(string: "https://example.org/article")))
    }

    func testDownloadRedirectsDoNotExpandToArbitraryOrigins() {
        XCTAssertTrue(VoidlinePolicy.permitsDownload(URL(string: VoidlinePolicy.origin + "/api/media/fixture")))
        XCTAssertTrue(VoidlinePolicy.permitsDownload(URL(string: "https://github.com/bndwhite11-spec/voidline-afterhours/releases/download/android-v1.0.0/VOIDLINE.apk")))
        XCTAssertFalse(VoidlinePolicy.permitsDownload(URL(string: "https://github.com/attacker/elsewhere/releases/download/v1/file")))
        XCTAssertFalse(VoidlinePolicy.permitsDownload(URL(string: "https://release-assets.githubusercontent.com.evil.example/file")))
    }

    func testSuggestedFilenameCannotEscapeItsUniqueDirectory() {
        XCTAssertEqual(VoidlinePolicy.safeFilename("../../private/file.pdf"), "file.pdf")
        XCTAssertEqual(VoidlinePolicy.safeFilename(".."), "VOIDLINE-download")
        XCTAssertFalse(VoidlinePolicy.safeFilename("bad\nname\\file:txt").contains("\n"))
        XCTAssertFalse(VoidlinePolicy.safeFilename("bad\\file:txt").contains("\\"))
        XCTAssertLessThanOrEqual(VoidlinePolicy.safeFilename(String(repeating: "a", count: 400)).count, 120)
    }
}
