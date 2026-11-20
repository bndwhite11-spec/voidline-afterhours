# VOIDLINE for Android

This project builds a signed, installable Android APK for the hosted VOIDLINE
app. A native launcher asks Android for the user's default visible browser that
handles generic HTTPS links, falling back to another matching browser or HTTP
handler as needed. It checks that browser for Trusted Web Activity support and
opens the site with AndroidX Browser. If the bind fails or times out, it opens
the same HTTPS page in the chosen browser. **Open in browser** goes straight to
ordinary browsing even when the Custom Tabs service directory is unavailable.
On return, the native launcher offers both options again. The user's browser
supplies the web runtime and signed-in session.

If a main-thread Java exception interrupts launch, the next start can offer
**Open in browser** and **Copy launch details** before another connection
attempt. The short report stays on the device until the user chooses to copy
and share it. It contains build and API numbers, launch phase, exception type
and a recognized code location. Android's normal crash handling still runs.

The APK needs Android 7.0/API 24 or later and a compatible updated browser.
It uses the live service, so installing it does not make shared conversations
available without a network connection. Existing website offline behavior still
applies. A physical-device smoke test remains required before claiming that
login, passkeys, microphone/camera, notifications, or Android back behavior have
been verified in this package.

## Pinned build

| Input | Version |
| --- | --- |
| AndroidX Browser | 1.10.0, Apache-2.0 |
| Android Gradle plugin | 8.11.1 |
| Gradle | 8.13, checked wrapper SHA-256 |
| Compile/target SDK | 36 |
| Build tools | 35.0.0 |
| Minimum SDK | 24 |
| Java source/target | 17; build with a complete JDK 17 or 21 |
| Application ID | `app.voidline.afterhours` |
| Current release | `1.0.3`, version code `4` |

Transitive dependency locks and SHA-256 verification metadata are committed.
R8 and resource shrinking reduce the installed wrapper; the release is not
debuggable. The Android manifest declares Internet access. Browser-origin
permissions govern web microphone/camera and other web capabilities.

Install official Android command-line tools, SDK platform 36 and build tools
35.0.0. Set `JAVA_HOME` to a complete JDK, and `ANDROID_HOME` to that SDK.
Keep tool caches outside source, for example:

```sh
export JAVA_HOME=/workspace/.voidline-android-tools/jdk-21.0.13.1+2
export ANDROID_HOME=/workspace/.voidline-android-tools/android-sdk
export GRADLE_USER_HOME=/workspace/.voidline-android-tools/gradle-user-home
python3 native/android/build-release.py
```

The startup regression suite uses Robolectric 4.18.1 and JUnit 4.13.2:

```sh
cd native/android
./gradlew :app:testDebugUnitTest :app:testReleaseUnitTest
```

It executes the Android activity/callback paths with Android API 24, 28, 35 and
36 framework implementations. See [startup evidence](STARTUP-TESTS.md) for what
this establishes and the remaining real-device verification gap.

The checked-in wrapper downloads Gradle 8.13 and checks its distribution hash.
An existing verified installation can be selected with `VOIDLINE_GRADLE_BIN`.
For an intentional first resolution/update, `--write-locks` writes Gradle lock
and verification files. Review dependency changes before committing them.

`VOIDLINE_ANDROID_VERSION_NAME` and `VOIDLINE_ANDROID_VERSION_CODE` select a
future release version. Increment the code for updates. `VOIDLINE_ANDROID_OUTPUT`
selects the release output directory; the default is
`/workspace/voidline-release/android`, outside the repository.

The build verifies the actual APK with `apksigner`, checks its public signing
certificate, package name, version name/code, minimum/target SDK and release manifest, then
runs `zipalign` with 16 KB page alignment. It emits the APK, a SHA-256 checksum,
public release metadata and the signature-verification report. These checks
establish a signed Android package; they do not replace installing it on a real
Android device.

## Signing and future updates

`build-release.py --prepare-signing` creates one RSA-3072 release key if no key
exists. It uses the JDK's `keytool` and reads the password through a protected
file, never as a password argument. Defaults:

- Private directory: `/workspace/.voidline-private/android` (mode 700).
- Keystore: `voidline-release.p12` (mode 600).
- Password: `release.password` (mode 600).
- Settings: `signing.json` (mode 600).

The key remains outside the repository, source downloads and public releases.
Back up all private signing material securely. Losing this key means future
APKs cannot update this installed package using the same signing identity.
Do not regenerate it casually. The script stops on incomplete signing state
instead of silently replacing the key. `VOIDLINE_ANDROID_PRIVATE_DIR` selects a
different protected directory; it must remain outside the repository.

`release-certificate.json` contains only the public certificate fingerprint and
application/site identifiers. Public fingerprints are safe to publish.

## Site association

Serve `https://voidline-afterhours.pipedcactus1.chatgpt.site/.well-known/assetlinks.json`
as public JSON with a `delegate_permission/common.handle_all_urls` statement
for this package and the exact release certificate SHA-256 fingerprint from
`release-certificate.json`. Never put a private key or password in that file.
The app also declares the inverse site association in Android resources.

A trusted-capable browser can show its Custom Tab toolbar when site association
verification fails. A browser without trusted support opens the URL in its
ordinary browsing interface. The launcher accepts the configured HTTPS app root
and `/index.html` as starting URLs and preserves root query/hash navigation.
Binary downloads and unknown paths reopen home. The browser retains its cookies
and local account storage.

Because the browser supplies the website runtime, Google sign-in and passkeys
continue through website/browser flows, subject to their existing provider
configuration and device support. Navigating to a different origin can reveal
browser controls. The wrapper does not create a separate messaging backend,
account, encryption system, or native notification/call transport.

## Distribution

A signed APK can be offered directly for Android installation. The user may
need to allow installations from their chosen download source. This project
does not publish to Google Play. No Play Store ownership, listing, review, or
store signing claim is implied. It does not build an iOS IPA or an Apple App
Store release.

## Official references

- [AndroidX Browser release notes](https://developer.android.com/jetpack/androidx/releases/browser)
- [TWA setup and signing](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start)
- [Browser state and TWA behavior](https://developer.chrome.com/docs/android/trusted-web-activity)
- [Digital Asset Links](https://developers.google.com/digital-asset-links/v1/getting-started)
- [Android Gradle plugin 8.11 compatibility](https://developer.android.com/build/releases/agp-8-11-0-release-notes)
- [Android command-line builds and signing](https://developer.android.com/build/building-cmdline)
