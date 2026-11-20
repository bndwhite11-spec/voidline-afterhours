package app.voidline.afterhours;

import static org.junit.Assert.*;
import static org.robolectric.Shadows.shadowOf;

import android.app.Application;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.ResolveInfo;
import android.os.Looper;
import android.view.View;
import android.widget.TextView;
import androidx.browser.customtabs.CustomTabsService;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.android.controller.ActivityController;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.Implementation;
import org.robolectric.annotation.Implements;
import org.robolectric.annotation.LooperMode;
import org.robolectric.shadows.ShadowApplicationPackageManager;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = {24, 28, 35, 36}, shadows = BrowserResolutionRegressionTest.OemPackages.class)
@LooperMode(LooperMode.Mode.PAUSED)
public class BrowserResolutionRegressionTest {
    private static final String BROWSER = "test.browser";
    private static final String TRUSTED = "android.support.customtabs.extra.LAUNCH_AS_TRUSTED_WEB_ACTIVITY";
    private Application app;
    private ActivityController<LauncherActivity> controller;

    private enum Results { ORDINARY, IMMUTABLE, BAD_ACTIVITY_ROW, BAD_SERVICE_ROW, NULL_LISTS, SERVICE_ERROR }

    @Implements(className = "android.app.ApplicationPackageManager", isInAndroidSdk = false)
    public static class OemPackages extends ShadowApplicationPackageManager {
        static Results results;
        static int serviceQueries;

        private static boolean isBrowserSearch(Intent intent) {
            return Intent.ACTION_VIEW.equals(intent.getAction())
                    && ("http".equals(intent.getScheme()) || "https".equals(intent.getScheme()));
        }

        private static ResolveInfo browser() {
            ResolveInfo row = new ResolveInfo();
            row.activityInfo = new ActivityInfo();
            row.activityInfo.name = BROWSER + ".Main";
            row.activityInfo.packageName = BROWSER;
            row.activityInfo.exported = true;
            row.isDefault = true;
            return row;
        }

        @Override @Implementation protected List<ResolveInfo> queryIntentActivities(Intent intent, int flags) {
            if (!isBrowserSearch(intent)) return super.queryIntentActivities(intent, flags);
            if (results == Results.NULL_LISTS) return null;
            List<ResolveInfo> rows = new ArrayList<>();
            if (results == Results.BAD_ACTIVITY_ROW) {
                rows.add(new ResolveInfo());
                rows.add(null);
            }
            rows.add(browser());
            return results == Results.IMMUTABLE ? Collections.unmodifiableList(rows) : rows;
        }

        @Override @Implementation protected ResolveInfo resolveActivity(Intent intent, int flags) {
            if (!isBrowserSearch(intent)) return super.resolveActivity(intent, flags);
            return results == Results.NULL_LISTS ? null : browser();
        }

        @Override @Implementation protected List<ResolveInfo> queryIntentServices(Intent intent, int flags) {
            if (!CustomTabsService.ACTION_CUSTOM_TABS_CONNECTION.equals(intent.getAction())) {
                return super.queryIntentServices(intent, flags);
            }
            serviceQueries++;
            if (results == Results.SERVICE_ERROR) throw new IllegalStateException("Browser service directory unavailable");
            if (results == Results.NULL_LISTS) return null;
            List<ResolveInfo> services = new ArrayList<>();
            if (results == Results.BAD_SERVICE_ROW) {
                services.add(new ResolveInfo());
                services.add(null);
            }
            return services;
        }
    }

    @Before public void reset() {
        app = RuntimeEnvironment.getApplication();
        OemPackages.serviceQueries = 0;
        OemPackages.results = Results.ORDINARY;
        shadowOf(app).clearNextStartedActivities();
    }

    @After public void finish() {
        if (controller != null) controller.pause().stop().destroy();
    }

    private LauncherActivity launch(Results results) {
        OemPackages.results = results;
        Intent main = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        controller = Robolectric.buildActivity(LauncherActivity.class, main).create().start().resume();
        shadowOf(Looper.getMainLooper()).idle();
        LauncherActivity launcher = controller.get();
        assertFalse(launcher.isFinishing());
        for (int id : new int[] {LauncherActivity.BROWSER_ID, LauncherActivity.RETRY_ID}) {
            assertEquals(View.VISIBLE, launcher.findViewById(id).getVisibility());
        }
        TextView status = launcher.findViewById(LauncherActivity.STATUS_ID);
        assertFalse(status.getText().toString().isEmpty());
        return launcher;
    }

    private void assertSingleBrowserLaunch() {
        Intent sent = shadowOf(app).getNextStartedActivity();
        assertNotNull("The ordinary browser must receive the URL", sent);
        assertEquals(Intent.ACTION_VIEW, sent.getAction());
        assertEquals(LauncherActivity.HOME, sent.getData());
        assertEquals(BROWSER, sent.getPackage());
        assertTrue(sent.hasCategory(Intent.CATEGORY_BROWSABLE));
        assertFalse(sent.getBooleanExtra(TRUSTED, false));
        assertNull("Exactly one handoff per attempt", shadowOf(app).getNextStartedActivity());
    }

    @Test public void immutableBrowserResultsCanOpenTheSiteFromAFreshMainActivity() {
        launch(Results.IMMUTABLE);
        assertSingleBrowserLaunch();
    }

    @Test public void incompleteActivityRowsDoNotHideTheNextValidBrowser() {
        launch(Results.BAD_ACTIVITY_ROW);
        assertSingleBrowserLaunch();
    }

    @Test public void incompleteServiceRowsStillAllowOrdinaryBrowsing() {
        launch(Results.BAD_SERVICE_ROW);
        assertSingleBrowserLaunch();
    }

    @Test public void nullListsLeaveAWorkingRetryButtonWhenBrowserDiscoveryRecovers() {
        LauncherActivity activity = launch(Results.NULL_LISTS);
        assertNull(shadowOf(app).getNextStartedActivity());
        OemPackages.results = Results.ORDINARY;
        assertTrue(activity.findViewById(LauncherActivity.RETRY_ID).performClick());
        assertSingleBrowserLaunch();
    }

    @Test public void unavailableServiceDiscoveryAutomaticallyFallsBackToOrdinaryBrowsing() {
        launch(Results.SERVICE_ERROR);
        assertSingleBrowserLaunch();
    }

    @Test public void openInBrowserSkipsServiceEnumerationEvenWhenItWouldThrow() {
        LauncherActivity activity = launch(Results.ORDINARY);
        assertSingleBrowserLaunch();
        OemPackages.results = Results.SERVICE_ERROR;
        int previous = OemPackages.serviceQueries;
        assertTrue(activity.findViewById(LauncherActivity.BROWSER_ID).performClick());
        assertEquals(previous, OemPackages.serviceQueries);
        assertSingleBrowserLaunch();
    }
}
