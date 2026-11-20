# Android launch verification

## Android 1.0.3

The latest screenshot shows Samsung's app-crash dialog above the 1.0.2
download page. The handset's exception and browser version are unknown.

### Reproduction on 1.0.2

The signed 1.0.2 APK's optimized DEX calls two browser activity queries and
appends the second result to the first with `List.addAll`. We ran
`BrowserResolutionRegressionTest` against the actual launcher from
`ee4799d` and its locked Android Browser Helper 2.7.4 using
`:app:testReleaseUnitTest`. The fixture supplies specific package-manager
responses while the application's activity lifecycle and browser picker run.

| Fixture | Observed 1.0.2 exception |
| --- | --- |
| An immutable list containing a valid browser | `UnsupportedOperationException` at `TwaProviderPicker.pickProvider` line 137 |
| Null result lists | `NullPointerException` calling `addAll` on the first result |
| An activity result with missing metadata | `NullPointerException` reading `activityInfo.packageName` |
| A service result with missing metadata | `NullPointerException` reading `serviceInfo.packageName` |
| Custom Tabs service discovery throws on first open | Its `IllegalStateException` propagates out of the launcher |
| Custom Tabs service discovery throws on **Open in browser** | The manual button also calls the picker and propagates the exception |

All six failures reproduced on each of API 24, 28, 35 and 36. In the automatic
cases the exception escaped `LauncherActivity.onResume` on a fresh
`ACTION_MAIN` launch. A separate check modeled Android reporting that a pending
service connection had already been unregistered. On the same four API levels,
1.0.2 propagated `IllegalArgumentException` from `BrowserConnection.release`
through `LauncherActivity.onPause`.

### 1.0.3 regression coverage

The signed 1.0.3 APK is 93,953 bytes with SHA-256
`edd76c504ef2a065f61f5716cea345394d721eddaf5d0fec11669b1e1540c53f`.
Its binary manifest identifies version code 4, the new application class and
the exported launcher. Both classes and the recovery control are present in
the optimized DEX. The release contains 94 DEX classes, down from 433 in
1.0.2.

The launcher reads generic browser results without modifying them. It checks
the selected package's Custom Tabs service only on the trusted path. Tests on
API 24, 28, 35 and 36 exercise these outcomes:

- A usable browser receives the canonical HTTPS home exactly once despite
  immutable results, incomplete rows or an exception during service discovery.
- Empty or null results leave visible native controls. Retry succeeds after
  the browser appears. **Open in browser** bypasses service discovery.
- An already-unregistered pending connection can be released when the activity
  pauses. Resuming leaves a working manual browser action.
- Existing tests cover session callbacks, deadlines, explicit retries,
  foreground transitions, link restrictions and browserless startup.

Additional API 35 tests exercise the local diagnostic record, its allowed
fields, expiry of the launch capture window, unreadable storage, recovery
after a recorded crash, and copying only on user request.

All 89 debug and all 89 release-variant JVM tests passed with zero skips.
Each variant ran 24 package-manager cases, 60 launcher and lifecycle cases,
and five diagnostic cases. The browser and Android services in this run were
fixtures. The release-variant JVM suite runs the release source and resources;
inspection of the signed, optimized APK is recorded separately above.

Run both variants from `native/android` with the project JDK and SDK:

```sh
./gradlew :app:testDebugUnitTest :app:testReleaseUnitTest
```

Robolectric supplies the Android framework and controlled browser service.
These tests establish application behavior for the supplied responses. The
original Samsung crash still requires an on-device test or a matching report
to identify the exact incident.

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

### Reproduced library behavior

The actual cached Android Browser Helper 2.7.4 AAR was inspected with `javap`.
Its `LauncherActivity.getCustomTabsCallback()` returns `QualityEnforcer` by
default. Sending that callback `quality_enforcement.crash` with a
`crash_reason` posts a `RuntimeException` on Android's main looper. Independent
inspection of the shipped v1.0.0 DEX confirmed the same path survived R8.

The 1.0.1 regression suite executed that exact dependency callback and drains the
main looper, expecting the exception. It then verified the app's supported
`getCustomTabsCallback()` override handled that event without an exception,
without claiming a successful page load, and with explicit native recovery.

This is a reproduced unsafe callback path, not proof of the specific user's
device crash. Browser-side quality enforcement changed in Chromium over time;
the dependency containing the callback does not establish that a particular
modern Chrome build invoked it. A device logcat stack trace and browser version
are still needed to establish that incident's exact cause.

### Recovery and initial navigation

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

### Executable coverage at 1.0.1

Run `./gradlew :app:testDebugUnitTest` from `native/android` with the documented
JDK/SDK setup. Tests use Robolectric 4.18.1, JUnit 4.13.2 and Android framework
implementations for API 24, 28, 35 and 36 (Android 7, 9, 15 and 16).

The 1.0.1 suite covered the original library main-thread exception; the replacement
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
