# VOIDLINE iOS project preparation

This directory is a concrete SwiftUI/WebKit project source for the existing
VOIDLINE service. It is **not an installable IPA**, an App Store release, or a
TestFlight invitation. No Apple Developer account, Team ID, signing material,
macOS/Xcode runtime, or iOS device is configured in the current Linux workspace.

The supported installed browser app remains available at
<https://voidline-afterhours.pipedcactus1.chatgpt.site/install.html> while this
native distribution is prepared.

## What the source implements

- A native SwiftUI container for the exact existing HTTPS origin, with persistent
  WebKit website data, normal password-manager form behavior, no injected script
  or native credential/key bridge, no ATS exception, and no account-role logic.
- Loading, failure and retry states driven by real navigation callbacks. A web
  process failure is shown explicitly; it does not invent a connected state.
- Main navigation stays on the application origin. User-selected external HTTP
  links open in the system browser; file/data/custom-scheme navigation is denied.
- WebKit's file-input UI serves profile and attachment selection. Microphone
  access remains prompted by iOS/WebKit and is restricted to the main application
  origin. WebRTC camera/video and device-motion capture are denied. The upload
  picker's user-selected Take Photo option has its own narrowly scoped camera
  usage description; photo selection/saving also carries explicit usage text.
- Authenticated WebKit downloads use a private temporary file and the native
  share sheet. Downloads have one active slot and a 32 MB accepted-file limit
  with progress cancellation, reject unrelated redirects, and delete partial
  or shared temporary files. Only the non-HttpOnly CSRF generation is compared
  in memory to cancel stale downloads/shares when a session changes; the wrapper
  does not inspect, persist or export the session-cookie value. This cleanup
  cannot retract a copy that the user already exported to another app.
- The app switcher receives a privacy cover when the scene is inactive. This
  does not claim protection against every screenshot or screen-capture method.
- XCTest policy cases cover internal/external navigation, permitted download
  redirects and filename path traversal. They require Xcode to execute.

`Resources/Assets.xcassets` contains a conventional opaque 1024px export of the
existing VOIDLINE SVG mark. No new generated artwork or third-party image was
introduced. The wrapper imports Apple frameworks only; XcodeGen is a development
tool, not an embedded dependency.

## Prepare and build on a Mac

Use a current App Store Connect-supported Xcode and its iOS SDK on macOS. The
deployment target is iOS/iPadOS 16.4; that is a runtime minimum, not a claim that
an old SDK is accepted for current uploads. Install XcodeGen **2.47.0 or newer**
from its maintained distribution, then run:

```sh
cd native/ios
python3 prepare.py --team-id YOUR_REAL_TEN_CHARACTER_TEAM_ID
xcodegen generate --spec project.yml
open Voidline.xcodeproj
```

The Team ID is public account metadata. Do not paste a signing private key,
certificate password, Apple ID password, recovery code or App Store Connect
private API key into a prompt or source file. Xcode's Accounts/Signing UI and
the Mac keychain should manage signing material.

In Xcode, select the **VoidlineApp** target, choose the user's own Apple
Developer team, keep automatic signing, and register/confirm bundle identifier
`app.voidline.afterhours`. Enable the Associated Domains capability. The checked-in
entitlement is limited to the site's `webcredentials:` relying-party domain.
Run the **Voidline** scheme on a simulator and an actual iPhone/iPad, including:

```sh
xcodebuild -project Voidline.xcodeproj -scheme Voidline \
  -destination 'platform=iOS Simulator,name=YOUR_INSTALLED_SIMULATOR' test
```

The generated `Config/LocalSigning.xcconfig`, build folders, archives and signing
files are excluded from Git. Keep the bundle identifier and Apple team stable
for later updates.

## Passkeys require the real app/domain association

Apple requires a WKWebView app to associate its relying-party domain before
it can create/use that domain's passkeys. This matters to owner administration:
the server's recent passkey requirement is retained, with no username or native
flag bypass.

`prepare.py` writes an **unpublished candidate** at
`build/site-association/apple-app-site-association` containing the real public
`TEAMID.app.voidline.afterhours` app identifier. The trusted Site operator must
review and serve that JSON over HTTPS at:

```text
https://voidline-afterhours.pipedcactus1.chatgpt.site/.well-known/apple-app-site-association
```

It must be a direct JSON response, with no redirect or authentication gate. The
example in `templates/` is deliberately marked with a placeholder and must never
be deployed. Apple's association cache and a real signed installation must then
be checked. A generated JSON candidate alone does not verify passkeys.

## Produce an installable beta

The smallest remaining distribution step is to connect the user's real Apple
Developer team to Xcode on a Mac (or an authorized Apple build service), publish
the real AASA association, complete device acceptance, and archive the app with
that team's signing. Create the matching App Store Connect app record and use
**Product → Archive → Distribute App → App Store Connect** to upload for
TestFlight. An App Store Connect role allowed to upload builds is required.

TestFlight delivery, external beta review and App Store approval are separate
Apple processes. This web-backed preparation does not guarantee approval; Apple's
minimum-functionality guidelines still apply. Complete the actual app privacy,
age/content and support metadata based on the existing service before submission.

For a personal development device, Xcode also supports development signing to
that device. That is different from distributing an IPA to arbitrary friends.
An unsigned IPA or simulator `.app` is not a usable public iPhone download.

## Verification and operating limits

`python3 validate-preparation.py` checks plist structure, the entitlement,
opaque icon dimensions and the public TeamID/AASA generator on Linux. **It does
not compile Swift, generate/inspect an Xcode build, sign an app, validate WebAuthn
on an Apple device, or verify native UI.** The XCTest sources are prepared for
the Mac build step; no passing XCTest run is claimed here.

Before enabling an iOS native download, verify login/recovery, fresh owner
passkey checks, account switching/cache isolation, image/GIF picker and crop,
voice-note recording/cancel, downloads/share cleanup, keyboard and rotation,
background/foreground, reduced motion, VoiceOver and both phone/tablet layouts.

Google is currently unconfigured in the service. Future provider OAuth needs an
approved system authentication flow such as ASWebAuthenticationSession and a
reviewed server session handoff; merely opening an external browser does not
authenticate this WebKit container. Do not enable an embedded Google OAuth flow
or weaken provider/owner checks to conceal that integration requirement.

This wrapper does not implement APNs/background push, calls or screen sharing.
It preserves the site's truthful Standard/Matrix security distinction and
requires internet for live messaging. A signed wrapper does not complete the
separately unconfigured Matrix/E2EE service.

## Maintained references

- [Apple: WKWebView](https://developer.apple.com/documentation/webkit/wkwebview)
- [Apple: supporting passkeys](https://developer.apple.com/documentation/authenticationservices/supporting-passkeys/)
- [Apple: associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains)
- [Apple: media permission delegate](https://developer.apple.com/documentation/webkit/wkuidelegate/webview(_:requestmediacapturepermissionfor:initiatedbyframe:type:decisionhandler:))
- [Apple: WKDownloadDelegate](https://developer.apple.com/documentation/webkit/wkdownloaddelegate)
- [Apple: uploading builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
- [Apple: distribution methods](https://help.apple.com/xcode/mac/current/en.lproj/dev31de635e5.html)
- [Apple: App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [XcodeGen maintained project](https://github.com/yonaskolb/XcodeGen)
