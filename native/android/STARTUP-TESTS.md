# Android launch verification

## Android 1.0.2

The device recording shows Android completing the 1.0.1 update, then remaining
on App info when Open is pressed. It does not show the state of an Android
activity, browser binding or crash stack. For a device regression check, update
over 1.0.1 and launch from both the installer and App info. Confirm that the
account page or sign-in screen becomes usable, then return to the launcher and
open the site again. Record Android version, browser version and the last screen
visible if either launch fails.

The baseline launcher from commit 799db3e reproduced a silent failure under
Robolectric on API 35 and 36. With a browser service accepting a bind and
withholding its reply, the launcher had no content after 45 virtual seconds.
A subsequent Settings-style MAIN launch finished immediately. The handset
recording cannot distinguish this path from other browser or OS failures.

The replacement ran 14 scenarios on each of API 24, 28, 35 and 36. All 56
debug and 56 release-variant JVM cases passed, including stalled binds,
duplicate Open, explicit browser fallback, loss of foreground, late callbacks
and recreation. Independent inspection of the signed APK verified its package
ID, version code 3, release signature, launcher manifest and new control text
in the optimized DEX. Physical Samsung launch, photo picker and keyboard
behavior still need on-device verification.

## Historical investigation of Android 1.0.1

Version 1.0.1 (version code 2) preserves the v1.0.0 package and signing
certificate, so it updates the existing installation. No account, browser
cookie, message, or signing key is reset.

## Reproduced library behavior

The actual cached Android Browser Helper 2.7.4 AAR was inspected with `javap`.
Its `LauncherActivity.getCustomTabsCallback()` returns `QualityEnforcer` by
default. Sending that callback `quality_enforcement.crash` with a
`crash_reason` posts a `RuntimeException` on Android's main looper. Independent
inspection of the shipped v1.0.0 DEX confirmed the same path survived R8.

The regression suite executes that exact dependency callback and drains the
main looper, expecting the exception. It then verifies the app's supported
`getCustomTabsCallback()` override handles that event without an exception,
without claiming a successful page load, and with explicit native recovery.

This is a reproduced unsafe callback path, not proof of the specific user's
device crash. Browser-side quality enforcement changed in Chromium over time;
the dependency containing the callback does not establish that a particular
modern Chrome build invoked it. A device logcat stack trace and browser version
are still needed to establish that incident's exact cause.

## Recovery and initial navigation

- Failed navigation opens a native explanation with **Try again** and
  **Open in browser** actions. The recovery surface does not depend on a page
  successfully loading.
- Navigation cancellation alone does not invent a failure. A later successful
  navigation cancels queued recovery; a generation guard prevents a stale
  error overlay after that success.
- Only a generic local pending-failure flag is retained. Browser error strings
  and private URLs are not persisted or copied into error UI.
- If Android blocks the recovery activity from taking focus while another app
  is foreground, the pending flag keeps recovery available on the next launch.
- No compatible browser produces a useful native state. A browser disappearing
  during launch is handled specifically through `ActivityNotFoundException`;
  unrelated exceptions are not caught broadly.
- Initial app intents accept only the configured HTTPS root or `/index.html`.
  Root query/hash navigation is preserved. APK/ZIP downloads, API paths,
  unknown paths, other origins, HTTP and user-info URLs reopen home.
- Manifest app links likewise match only `/` and `/index.html`, so installing
  the app does not register it as the handler for its own binary download.
- Retry explicitly opens home. Browser fallback explicitly chooses the browser
  package, avoiding a verified-app-link loop back into the launcher.

## Executable coverage

Run `./gradlew :app:testDebugUnitTest` from `native/android` with the documented
JDK/SDK setup. Tests use Robolectric 4.18.1, JUnit 4.13.2 and Android framework
implementations for API 24, 28, 35 and 36 (Android 7, 9, 15 and 16).

The suite covers the original library main-thread exception; the replacement
callback; failure versus cancellation; stale queued recovery; download and
origin validation; no-browser activity creation; native retry and pending-state
behavior; explicit browser fallback; and browser-present activity startup with
save/pause/stop/destroy lifecycle. A fixture Custom Tabs service exercises the
real browser-helper session-binding and callback path without contacting a
real account or remote browser service.

These are executable Android-framework tests, not a physical-device install,
real Chrome/Google sign-in exchange, Digital Asset Links validation on a
handset, browser network test, or screenshot verification. APK signing,
manifest/DEX inspection and byte alignment remain separate release checks.
