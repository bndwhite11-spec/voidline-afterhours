package app.voidline.afterhours;

import static org.junit.Assert.*;
import static org.robolectric.Shadows.shadowOf;

import android.app.Application;
import android.content.ComponentName;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ServiceConnection;
import android.content.pm.ActivityInfo;
import android.content.pm.ResolveInfo;
import android.content.pm.ServiceInfo;
import android.content.res.TypedArray;
import android.net.Uri;
import android.os.Bundle;
import android.os.Looper;
import android.view.View;
import android.widget.TextView;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsService;
import androidx.browser.customtabs.CustomTabsSessionToken;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.android.controller.ActivityController;
import org.robolectric.android.controller.ServiceController;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.Implements;
import org.robolectric.annotation.Implementation;
import org.robolectric.shadows.ShadowContextImpl;
import org.robolectric.annotation.LooperMode;
import org.robolectric.shadows.ShadowPackageManager;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = {24, 28, 35, 36})
@LooperMode(LooperMode.Mode.PAUSED)
public class LauncherRecoveryTest {
    private static final String BROWSER = "org.example.trustedbrowser";
    private static final String TRUSTED = "android.support.customtabs.extra.LAUNCH_AS_TRUSTED_WEB_ACTIVITY";
    private static final ComponentName SERVICE = new ComponentName(BROWSER, BROWSER + ".Service");
    private Application app;
    private final List<ActivityController<LauncherActivity>> activities = new ArrayList<>();
    private ServiceController<FixtureBrowserService> browserService;

    @Before public void begin() {
        app = RuntimeEnvironment.getApplication();
        shadowOf(app).clearNextStartedActivities();
        SlowBrowser.connected.clear();
        SlowBrowser.last = null;
        SlowBrowser.alreadyUnbound = false;
    }

    @After public void finish() {
        for (ActivityController<LauncherActivity> c : activities) {
            if (!c.get().isDestroyed()) c.destroy();
        }
        if (browserService != null) browserService.destroy();
    }

    private Intent main() {
        return new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
    }

    private ActivityController<LauncherActivity> open(Intent intent, Bundle savedState) {
        ActivityController<LauncherActivity> c = Robolectric.buildActivity(LauncherActivity.class, intent);
        activities.add(c);
        c.create(savedState).start().resume();
        return c;
    }

    private static void idle() {
        shadowOf(Looper.getMainLooper()).idle();
    }

    private static void afterTimeout() {
        shadowOf(Looper.getMainLooper()).idleFor(10, TimeUnit.SECONDS);
    }

    private static String status(LauncherActivity activity) {
        TextView text = activity.findViewById(LauncherActivity.STATUS_ID);
        return text.getText().toString().toLowerCase(Locale.ROOT);
    }

    private void assertControls(LauncherActivity activity) {
        assertFalse("A failed launch must leave an activity with controls", activity.isFinishing());
        for (int id : new int[]{LauncherActivity.RETRY_ID, LauncherActivity.BROWSER_ID}) {
            View v = activity.findViewById(id);
            assertNotNull("Missing launcher control", v);
            assertEquals(View.VISIBLE, v.getVisibility());
        }
        assertFalse("Explain the current launch state", status(activity).isEmpty());
    }

    private void installBrowser(String pkg) {
        ResolveInfo browser = new ResolveInfo();
        browser.activityInfo = new ActivityInfo();
        browser.activityInfo.packageName = pkg;
        browser.activityInfo.name = pkg + ".Main";
        browser.activityInfo.exported = true;
        browser.isDefault = true;
        ShadowPackageManager packages = shadowOf(app.getPackageManager());
        for (String scheme : new String[]{"http", "https"}) {
            packages.addResolveInfoForIntent(new Intent(Intent.ACTION_VIEW, Uri.fromParts(scheme, "", null))
                    .addCategory(Intent.CATEGORY_BROWSABLE), browser);
        }
    }

    private void installTrustedBrowser() {
        installBrowser(BROWSER);
        ResolveInfo service = new ResolveInfo();
        service.serviceInfo = new ServiceInfo();
        service.serviceInfo.packageName = BROWSER;
        service.serviceInfo.name = SERVICE.getClassName();
        service.serviceInfo.exported = true;
        service.filter = new IntentFilter(CustomTabsService.ACTION_CUSTOM_TABS_CONNECTION);
        service.filter.addCategory("androidx.browser.trusted.category.TrustedWebActivities");
        Intent bind = new Intent(CustomTabsService.ACTION_CUSTOM_TABS_CONNECTION).setPackage(BROWSER);
        shadowOf(app.getPackageManager()).addResolveInfoForIntent(bind, service);
        browserService = Robolectric.buildService(FixtureBrowserService.class).create();
        shadowOf(app).setComponentNameAndServiceForBindService(SERVICE, browserService.get().onBind(bind));
    }

    private Intent next() {
        return shadowOf(app).getNextStartedActivity();
    }

    private void assertBrowser(Intent sent, Uri url, boolean trusted) {
        assertNotNull("The external browser should receive the page", sent);
        assertEquals(Intent.ACTION_VIEW, sent.getAction());
        assertEquals(url, sent.getData());
        assertEquals(BROWSER, sent.getPackage());
        assertEquals(trusted, sent.getBooleanExtra(TRUSTED, false));
        if (!trusted) assertTrue(sent.hasCategory(Intent.CATEGORY_BROWSABLE));
    }

    @Test public void settingsAndInstallerMainLaunchWithoutTaskFlagsShowAnOpaqueForeground() {
        LauncherActivity activity = open(main(), null).get();
        idle();
        assertControls(activity);
        assertTrue(status(activity).contains("browser"));
        TypedArray theme = activity.obtainStyledAttributes(new int[]{android.R.attr.windowIsTranslucent});
        try { assertFalse(theme.getBoolean(0, false)); } finally { theme.recycle(); }
        assertNull("No silent activity bounce on the first MAIN", next());
    }

    @Test public void repeatedMainWhileAnEarlierLauncherExistsNeverFinishesTheNewEntry() {
        LauncherActivity previous = open(main().addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), null).get();
        idle();
        LauncherActivity again = open(main(), null).get();
        idle();
        assertControls(previous);
        assertControls(again);
        assertNull(next());
    }

    @Test public void stateSavedByOlderBrowserHelperRemainsRecoverableAfterAnUpgrade() {
        Bundle oldState = new Bundle();
        oldState.putBoolean("android.support.customtabs.trusted.BROWSER_WAS_LAUNCHED_KEY", true);
        LauncherActivity activity = open(main(), oldState).get();
        idle();
        assertControls(activity);
        assertNull(next());
        installBrowser(BROWSER);
        activity.findViewById(LauncherActivity.RETRY_ID).performClick();
        idle();
        assertBrowser(next(), LauncherActivity.HOME, false);
        assertNull(next());
    }

    @Test public void unrelatedOrDownloadUrlsAreNeverUsedAsTrustedStartPages() {
        LauncherActivity activity = open(main(), null).get();
        for (String url : new String[]{
                "https://" + LauncherActivity.HOST + "/downloads/VOIDLINE-Android.apk?v=1.0.1",
                "https://" + LauncherActivity.HOST + "/downloads/voidline-source.zip",
                "https://" + LauncherActivity.HOST + "/api/native-release-upload/start",
                "https://" + LauncherActivity.HOST + ":444/", "http://" + LauncherActivity.HOST + "/",
                "https://user@" + LauncherActivity.HOST + "/", "https://other.example/"}) {
            activity.setIntent(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            assertEquals(LauncherActivity.HOME, activity.getLaunchingUrl());
        }
        Uri appLink = Uri.parse("https://" + LauncherActivity.HOST + "/?invitation=example#you");
        activity.setIntent(new Intent(Intent.ACTION_VIEW, appLink));
        assertEquals(appLink, activity.getLaunchingUrl());
    }

    @Test public void explicitBrowserControlReusesAnExternalBrowserAndCannotReenterVoidline() {
        LauncherActivity activity = open(main(), null).get();
        idle();
        installBrowser(app.getPackageName());
        activity.findViewById(LauncherActivity.BROWSER_ID).performClick();
        idle();
        assertNull(next());
        assertControls(activity);
        installBrowser(BROWSER);
        activity.findViewById(LauncherActivity.BROWSER_ID).performClick();
        idle();
        assertBrowser(next(), LauncherActivity.HOME, false);
    }

    @Test public void currentPageOpensOnceAndReturningFromTheBrowserNeedsAnExplicitRetry() {
        installBrowser(BROWSER);
        Uri link = Uri.parse("https://" + LauncherActivity.HOST + "/index.html#you");
        ActivityController<LauncherActivity> c = open(new Intent(Intent.ACTION_VIEW, link), null);
        idle();
        assertBrowser(next(), link, false);
        c.pause().stop().restart().start().resume();
        afterTimeout();
        assertNull("Background/resume must not loop between browser and launcher", next());
        assertControls(c.get());
        c.get().findViewById(LauncherActivity.RETRY_ID).performClick();
        idle();
        assertBrowser(next(), link, false);
        assertNull(next());
    }

    @Test public void approvedBrowserServiceGetsARealAndroidXSessionAndTheCanonicalHome() {
        installTrustedBrowser();
        LauncherActivity activity = open(main().setData(Uri.parse("https://" + LauncherActivity.HOST
                + "/downloads/VOIDLINE-Android.apk")), null).get();
        idle();
        assertNotNull(browserService.get().session);
        assertTrue(browserService.get().session.hasCallback());
        assertBrowser(next(), LauncherActivity.HOME, true);
        afterTimeout();
        assertNull("A completed handoff must cancel the timer", next());
        assertControls(activity);
    }

    @Test public void rejectedCustomTabsBindingOpensTheSamePageInTheExternalBrowser() {
        installTrustedBrowser();
        shadowOf(app).setThrowInBindService(new SecurityException("Isolated provider rejection"));
        LauncherActivity activity = open(main(), null).get();
        idle();
        assertBrowser(next(), LauncherActivity.HOME, false);
        afterTimeout();
        assertNull(next());
        assertControls(activity);
    }

    @Test public void aPausedPendingConnectionCannotOpenAnotherActivityBehindTheUser() {
        installTrustedBrowser();
        ActivityController<LauncherActivity> c = open(main(), null);
        c.pause().stop();
        afterTimeout();
        assertNull("A stale bind or timer must not start a browser after leaving", next());
        c.restart().start().resume();
        idle();
        assertControls(c.get());
    }

    @Test public void returnFromFailedBrowserNavigationShowsControlsWithoutBackgroundActivityLaunch() {
        installTrustedBrowser();
        ActivityController<LauncherActivity> c = open(main(), null);
        idle();
        assertBrowser(next(), LauncherActivity.HOME, true);
        c.pause().stop();
        CustomTabsCallback cb = browserService.get().session.getCallback();
        Bundle reason = new Bundle();
        reason.putString("crash_reason", "Isolated test failure");
        cb.extraCallbackWithResult("quality_enforcement.crash", reason);
        cb.onNavigationEvent(CustomTabsCallback.NAVIGATION_FAILED, null);
        idle();
        assertNull(next());
        c.restart().start().resume();
        idle();
        assertControls(c.get());
        assertTrue("Failed navigation needs visible feedback", status(c.get()).contains("could not load"));
        assertFalse(status(c.get()).contains("isolated test failure"));
        assertNull(next());
        cb.onNavigationEvent(CustomTabsCallback.NAVIGATION_FINISHED, null);
        idle();
        assertFalse("A later successful navigation clears the old error", status(c.get()).contains("could not load"));
    }

    /** Models an installed browser whose service binding is accepted but still pending. */
    @Implements(className = "android.app.ContextImpl", isInAndroidSdk = false)
    public static class SlowBrowser extends ShadowContextImpl {
        static final Set<ServiceConnection> connected = new HashSet<>();
        static ServiceConnection last;
        static boolean alreadyUnbound;

        @Implementation @Override protected boolean bindService(Intent intent, ServiceConnection c, int flags) {
            if (CustomTabsService.ACTION_CUSTOM_TABS_CONNECTION.equals(intent.getAction()) && BROWSER.equals(intent.getPackage())) {
                last = c;
                connected.add(c);
                return true;
            }
            return super.bindService(intent, c, flags);
        }

        @Implementation @Override protected void unbindService(ServiceConnection c) {
            if (connected.remove(c)) {
                if (alreadyUnbound) throw new IllegalArgumentException("Service already unregistered");
                return;
            }
            super.unbindService(c);
        }
    }

    @Test @Config(shadows = SlowBrowser.class)
    public void serviceAlreadyUnregisteredDuringPauseCanStillResumeAndOpenInBrowser() {
        installTrustedBrowser();
        ActivityController<LauncherActivity> c = open(main(), null);
        assertNotNull("A browser connection was pending", SlowBrowser.last);
        SlowBrowser.alreadyUnbound = true;
        c.pause().stop();
        afterTimeout();
        assertNull(next());
        c.restart().start().resume();
        assertControls(c.get());
        c.get().findViewById(LauncherActivity.BROWSER_ID).performClick();
        assertBrowser(next(), LauncherActivity.HOME, false);
        afterTimeout();
        assertNull(next());
    }

    @Test @Config(shadows = SlowBrowser.class)
    public void acceptedBindWithoutAReplyHandsOffAtDeadlineAndDiscardsLateCompletion() {
        installTrustedBrowser();
        LauncherActivity activity = open(main().addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), null).get();
        idle();
        assertControls(activity);
        ServiceConnection stale = SlowBrowser.last;
        assertNotNull("A TWA connection was attempted", stale);
        shadowOf(Looper.getMainLooper()).idleFor(LauncherActivity.BIND_TIMEOUT_MS - 1, TimeUnit.MILLISECONDS);
        assertNull(next());
        shadowOf(Looper.getMainLooper()).idleFor(1, TimeUnit.MILLISECONDS);
        assertBrowser(next(), LauncherActivity.HOME, false);
        assertFalse(SlowBrowser.connected.contains(stale));
        stale.onServiceConnected(SERVICE, browserService.get().onBind(new Intent(CustomTabsService.ACTION_CUSTOM_TABS_CONNECTION)));
        afterTimeout();
        assertNull("A late callback must not launch a second browser", next());
        assertControls(activity);
    }

    @Test @Config(shadows = SlowBrowser.class)
    public void disconnectedBindingFallsBackOnceWhileExplicitRetrySupersedesEarlierRequests() {
        installTrustedBrowser();
        LauncherActivity activity = open(main(), null).get();
        ServiceConnection first = SlowBrowser.last;
        assertNotNull(first);
        activity.findViewById(LauncherActivity.RETRY_ID).performClick();
        ServiceConnection second = SlowBrowser.last;
        assertNotSame(first, second);
        first.onServiceDisconnected(SERVICE);
        idle();
        assertNull(next());
        second.onServiceDisconnected(SERVICE);
        idle();
        assertBrowser(next(), LauncherActivity.HOME, false);
        assertTrue(SlowBrowser.connected.isEmpty());
        afterTimeout();
        assertNull(next());
    }

    @Test @Config(shadows = SlowBrowser.class)
    public void newIntentWhileWaitingOnlyLaunchesTheMostRecentPermittedLink() {
        installTrustedBrowser();
        ActivityController<LauncherActivity> c = open(main(), null);
        Uri route = Uri.parse("https://" + LauncherActivity.HOST + "/#you");
        ServiceConnection old = SlowBrowser.last;
        c.newIntent(new Intent(Intent.ACTION_VIEW, route));
        assertNotSame(old, SlowBrowser.last);
        assertFalse(SlowBrowser.connected.contains(old));
        afterTimeout();
        assertBrowser(next(), route, false);
        assertNull(next());
    }

    @Test public void recreationAfterExternalHandoffKeepsControlsWithoutOpeningAnotherBrowser() {
        installBrowser(BROWSER);
        ActivityController<LauncherActivity> c = open(main(), null);
        idle();
        assertBrowser(next(), LauncherActivity.HOME, false);
        Bundle saved = new Bundle();
        c.saveInstanceState(saved).pause().stop().destroy();
        LauncherActivity recreated = open(main(), saved).get();
        afterTimeout();
        assertNull(next());
        assertControls(recreated);
    }

    public static final class FixtureBrowserService extends CustomTabsService {
        CustomTabsSessionToken session;
        @Override protected boolean warmup(long flags) { return true; }
        @Override protected boolean newSession(CustomTabsSessionToken token) { session = token; return true; }
        @Override protected boolean mayLaunchUrl(CustomTabsSessionToken token, Uri url, Bundle extras, List<Bundle> bundles) { return true; }
        @Override protected Bundle extraCommand(String command, Bundle extras) { return Bundle.EMPTY; }
        @Override protected boolean updateVisuals(CustomTabsSessionToken token, Bundle extras) { return true; }
        @Override protected boolean requestPostMessageChannel(CustomTabsSessionToken token, Uri origin) { return true; }
        @Override protected int postMessage(CustomTabsSessionToken token, String message, Bundle extras) { return 0; }
        @Override protected boolean validateRelationship(CustomTabsSessionToken token, int relation, Uri origin, Bundle extras) { return true; }
        @Override protected boolean receiveFile(CustomTabsSessionToken token, Uri uri, int purpose, Bundle extras) { return false; }
    }
}
