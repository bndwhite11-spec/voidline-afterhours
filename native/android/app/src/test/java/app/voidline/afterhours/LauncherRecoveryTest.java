package app.voidline.afterhours;

import static org.junit.Assert.*;
import static org.robolectric.Shadows.shadowOf;

import android.app.Application;
import android.content.Intent;
import android.content.ComponentName;
import android.content.IntentFilter;
import android.content.pm.ActivityInfo;
import android.content.pm.ResolveInfo;
import android.content.pm.ServiceInfo;
import android.net.Uri;
import android.os.Bundle;
import android.os.Looper;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsService;
import androidx.browser.customtabs.CustomTabsSessionToken;
import com.google.androidbrowserhelper.trusted.QualityEnforcer;
import org.junit.Before;
import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.LooperMode;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = {24, 28, 35, 36})
@LooperMode(LooperMode.Mode.PAUSED)
public class LauncherRecoveryTest {
    private Application app;
    private final java.util.List<org.robolectric.android.controller.ActivityController<?>> activities = new java.util.ArrayList<>();

    @Before public void reset() {
        app = RuntimeEnvironment.getApplication();
        LaunchRecovery.clear(app);
        while (shadowOf(app).getNextStartedActivity() != null) { }
    }

    @After public void destroyActivities() {
        for (org.robolectric.android.controller.ActivityController<?> controller : activities) controller.destroy();
    }

    @Test public void upstreamDefaultCallbackReproducesMainThreadProcessCrash() {
        Bundle reason = new Bundle(); reason.putString("crash_reason", "Isolated failed navigation fixture");
        new QualityEnforcer().extraCallbackWithResult("quality_enforcement.crash", reason);
        RuntimeException failure = assertThrows(RuntimeException.class, () -> shadowOf(Looper.getMainLooper()).idle());
        assertTrue(failure.getMessage().contains("Isolated failed navigation fixture"));
    }

    @Test public void ourQualityFailureShowsRecoveryWithoutMainThreadCrashOrFalseSuccess() {
        LauncherActivity activity = Robolectric.buildActivity(LauncherActivity.class).get();
        CustomTabsCallback callback = activity.getCustomTabsCallback();
        assertFalse(callback instanceof QualityEnforcer);
        Bundle reason = new Bundle(); reason.putString("crash_reason", "Do not persist private URLs from a browser error");
        assertFalse(callback.extraCallbackWithResult("quality_enforcement.crash", reason).getBoolean("success"));
        shadowOf(Looper.getMainLooper()).idle();
        Intent recovery = shadowOf(app).getNextStartedActivity();
        assertEquals(RecoveryActivity.class.getName(), recovery.getComponent().getClassName());
        assertNull(recovery.getData()); assertNull(recovery.getExtras());
        assertTrue(LaunchRecovery.hasPending(app));
        callback.onNavigationEvent(CustomTabsCallback.NAVIGATION_FAILED, null);
        shadowOf(Looper.getMainLooper()).idle();
        assertNull(shadowOf(app).getNextStartedActivity());
    }

    @Test public void ordinaryNavigationFailureRecoversButCancellationDoesNotInventFailure() {
        RecoverableTabsCallback callback = new RecoverableTabsCallback(app);
        callback.onNavigationEvent(CustomTabsCallback.NAVIGATION_ABORTED, null);
        shadowOf(Looper.getMainLooper()).idle(); assertFalse(LaunchRecovery.hasPending(app));
        callback.onNavigationEvent(CustomTabsCallback.NAVIGATION_FAILED, null);
        shadowOf(Looper.getMainLooper()).idle(); assertTrue(LaunchRecovery.hasPending(app));
        callback.onNavigationEvent(CustomTabsCallback.NAVIGATION_FINISHED, null);
        assertFalse(LaunchRecovery.hasPending(app));
    }

    @Test public void aLaterSuccessfulNavigationCancelsAlreadyQueuedRecoveryAndAllowsFutureFailures() {
        RecoverableTabsCallback callback = new RecoverableTabsCallback(app);
        callback.onNavigationEvent(CustomTabsCallback.NAVIGATION_FAILED, null);
        callback.onNavigationEvent(CustomTabsCallback.NAVIGATION_FINISHED, null);
        shadowOf(Looper.getMainLooper()).idle();
        assertNull(shadowOf(app).getNextStartedActivity()); assertFalse(LaunchRecovery.hasPending(app));
        callback.onNavigationEvent(CustomTabsCallback.NAVIGATION_FAILED, null);
        shadowOf(Looper.getMainLooper()).idle();
        assertEquals(RecoveryActivity.class.getName(), shadowOf(app).getNextStartedActivity().getComponent().getClassName());
    }

    @Test public void downloadedPackageAndUntrustedIntentsNeverBecomeTheTwaStartPage() {
        LauncherActivity activity = Robolectric.buildActivity(LauncherActivity.class).get();
        for (String value : new String[]{"https://" + LauncherActivity.HOST + "/downloads/VOIDLINE-Android.apk", "https://" + LauncherActivity.HOST + "/downloads/voidline-source.zip", "https://" + LauncherActivity.HOST + "/api/native-release-upload/start", "https://other.example/", "http://" + LauncherActivity.HOST + "/", "https://user@" + LauncherActivity.HOST + "/"}) {
            activity.setIntent(new Intent(Intent.ACTION_VIEW, Uri.parse(value)));
            assertEquals(LauncherActivity.HOME, activity.getLaunchingUrl());
        }
        Uri invite = Uri.parse("https://" + LauncherActivity.HOST + "/?login=1#join=retained");
        activity.setIntent(new Intent(Intent.ACTION_VIEW, invite)); assertEquals(invite, activity.getLaunchingUrl());
    }

    @Test public void actualActivityCreationWithNoBrowserOffersNativeRecoveryInsteadOfThrowing() {
        Intent intent = new Intent(Intent.ACTION_MAIN).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        org.robolectric.android.controller.ActivityController<LauncherActivity> controller = Robolectric.buildActivity(LauncherActivity.class, intent).create();
        activities.add(controller); LauncherActivity activity = controller.get();
        shadowOf(Looper.getMainLooper()).idle();
        Intent recovery = shadowOf(app).getNextStartedActivity();
        assertNotNull(recovery); assertEquals(RecoveryActivity.class.getName(), recovery.getComponent().getClassName());
        assertTrue(activity.isFinishing());
    }

    @Test public void recoveryRetryClearsOnlyFailureStateAndExplicitlyReturnsToHome() {
        LaunchRecovery.show(app); shadowOf(Looper.getMainLooper()).idle(); shadowOf(app).getNextStartedActivity();
        org.robolectric.android.controller.ActivityController<RecoveryActivity> controller = Robolectric.buildActivity(RecoveryActivity.class).setup();
        activities.add(controller); RecoveryActivity recovery = controller.get();
        recovery.findViewById(RecoveryActivity.RETRY_ID).performClick();
        Intent retry = shadowOf(recovery).getNextStartedActivity();
        assertEquals(LauncherActivity.class.getName(), retry.getComponent().getClassName());
        assertEquals(LauncherActivity.HOME, retry.getData()); assertFalse(LaunchRecovery.hasPending(app));
    }

    @Test public void aPreviousFailureRemainsRecoverableOnNextLaunchWithoutAutomaticRetryLoop() {
        LaunchRecovery.show(app); shadowOf(Looper.getMainLooper()).idle(); shadowOf(app).getNextStartedActivity();
        Intent intent = new Intent(Intent.ACTION_MAIN).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        org.robolectric.android.controller.ActivityController<LauncherActivity> controller = Robolectric.buildActivity(LauncherActivity.class, intent).create();
        activities.add(controller); LauncherActivity activity = controller.get();
        shadowOf(Looper.getMainLooper()).idle();
        Intent recovery = shadowOf(app).getNextStartedActivity();
        assertEquals(RecoveryActivity.class.getName(), recovery.getComponent().getClassName());
        assertNull(shadowOf(app).getNextStartedActivity()); assertTrue(activity.isFinishing());
        assertTrue(LaunchRecovery.hasPending(app));
    }

    @Test public void openingBrowserUsesExplicitProviderAndNeverLoopsBackThroughAppLinks() {
        ResolveInfo browser = new ResolveInfo(); browser.activityInfo = new ActivityInfo();
        browser.activityInfo.packageName = "com.android.chrome"; browser.activityInfo.name = "com.android.chrome.Main";
        browser.isDefault = true;
        shadowOf(app.getPackageManager()).addResolveInfoForIntent(new Intent(Intent.ACTION_VIEW,
                Uri.fromParts("http", "", null)).addCategory(Intent.CATEGORY_BROWSABLE), browser);
        LaunchRecovery.show(app); shadowOf(Looper.getMainLooper()).idle(); shadowOf(app).getNextStartedActivity();
        org.robolectric.android.controller.ActivityController<RecoveryActivity> controller = Robolectric.buildActivity(RecoveryActivity.class).setup();
        activities.add(controller); RecoveryActivity recovery = controller.get();
        recovery.findViewById(RecoveryActivity.BROWSER_ID).performClick();
        Intent launch = shadowOf(recovery).getNextStartedActivity();
        assertNotNull(launch); assertEquals("com.android.chrome", launch.getPackage());
        assertEquals(LauncherActivity.HOME, launch.getData()); assertEquals(Intent.ACTION_VIEW, launch.getAction());
        assertFalse(LaunchRecovery.hasPending(app));
    }

    @Test public void actualBrowserPresentStartupHandsHomeToBrowserAndSurvivesActivityLifecycle() {
        ResolveInfo browser = new ResolveInfo(); browser.activityInfo = new ActivityInfo();
        browser.activityInfo.packageName = "com.android.chrome"; browser.activityInfo.name = "com.android.chrome.Main";
        browser.isDefault = true;
        shadowOf(app.getPackageManager()).addResolveInfoForIntent(new Intent(Intent.ACTION_VIEW,
                Uri.fromParts("http", "", null)).addCategory(Intent.CATEGORY_BROWSABLE), browser);
        Intent intent = new Intent(Intent.ACTION_MAIN).setData(Uri.parse("https://" + LauncherActivity.HOST + "/downloads/VOIDLINE-Android.apk"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        org.robolectric.android.controller.ActivityController<LauncherActivity> controller = Robolectric.buildActivity(LauncherActivity.class, intent).create().start().resume();
        activities.add(controller);
        shadowOf(Looper.getMainLooper()).idle();
        Intent launch = shadowOf(controller.get()).getNextStartedActivity();
        assertNotNull(launch); assertEquals(LauncherActivity.HOME, launch.getData());
        assertEquals("com.android.chrome", launch.getPackage()); assertFalse(LaunchRecovery.hasPending(app));
        Bundle state = new Bundle(); controller.saveInstanceState(state).pause().stop();
        assertNotNull(state);
    }

    @Test public void trustedBrowserServiceBindingRoutesQualityFailureToRecoveryThroughTheActualSession() {
        ResolveInfo browser = new ResolveInfo(); browser.activityInfo = new ActivityInfo(); browser.isDefault = true;
        browser.activityInfo.packageName = "org.example.trustedbrowser"; browser.activityInfo.name = "org.example.trustedbrowser.Main";
        shadowOf(app.getPackageManager()).addResolveInfoForIntent(new Intent(Intent.ACTION_VIEW,
                Uri.fromParts("http", "", null)).addCategory(Intent.CATEGORY_BROWSABLE), browser);
        ResolveInfo serviceInfo = new ResolveInfo(); serviceInfo.serviceInfo = new ServiceInfo();
        serviceInfo.serviceInfo.packageName = browser.activityInfo.packageName; serviceInfo.serviceInfo.name = "org.example.trustedbrowser.Service";
        serviceInfo.filter = new IntentFilter(CustomTabsService.ACTION_CUSTOM_TABS_CONNECTION);
        serviceInfo.filter.addCategory("androidx.browser.trusted.category.TrustedWebActivities");
        shadowOf(app.getPackageManager()).addResolveInfoForIntent(new Intent(CustomTabsService.ACTION_CUSTOM_TABS_CONNECTION), serviceInfo);
        org.robolectric.android.controller.ServiceController<FixtureBrowserService> service = Robolectric.buildService(FixtureBrowserService.class).create();
        shadowOf(app).setComponentNameAndServiceForBindService(new ComponentName(serviceInfo.serviceInfo.packageName, serviceInfo.serviceInfo.name),
                service.get().onBind(new Intent(CustomTabsService.ACTION_CUSTOM_TABS_CONNECTION)));
        Intent intent = new Intent(Intent.ACTION_MAIN).setData(LauncherActivity.HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        org.robolectric.android.controller.ActivityController<LauncherActivity> controller = Robolectric.buildActivity(LauncherActivity.class, intent).create();
        activities.add(controller);
        shadowOf(Looper.getMainLooper()).idle();
        assertNotNull(service.get().session); assertTrue(service.get().session.hasCallback());
        Intent browserLaunch = shadowOf(controller.get()).getNextStartedActivity();
        assertNotNull(browserLaunch); assertEquals(LauncherActivity.HOME, browserLaunch.getData());
        assertTrue(browserLaunch.getBooleanExtra("android.support.customtabs.extra.LAUNCH_AS_TRUSTED_WEB_ACTIVITY", false));
        Bundle failure = new Bundle(); failure.putString("crash_reason", "Isolated fixture browser callback");
        service.get().session.getCallback().extraCallbackWithResult("quality_enforcement.crash", failure);
        shadowOf(Looper.getMainLooper()).idle();
        Intent recovery = shadowOf(app).getNextStartedActivity();
        assertNotNull(recovery); assertEquals(RecoveryActivity.class.getName(), recovery.getComponent().getClassName());
        service.destroy();
    }

    public static final class FixtureBrowserService extends CustomTabsService {
        CustomTabsSessionToken session; int warmups;
        @Override protected boolean warmup(long flags) { warmups++; return true; }
        @Override protected boolean newSession(CustomTabsSessionToken token) { session = token; return true; }
        @Override protected boolean mayLaunchUrl(CustomTabsSessionToken token, Uri url, Bundle extras, java.util.List<Bundle> bundles) { return true; }
        @Override protected Bundle extraCommand(String command, Bundle extras) { return Bundle.EMPTY; }
        @Override protected boolean updateVisuals(CustomTabsSessionToken token, Bundle extras) { return true; }
        @Override protected boolean requestPostMessageChannel(CustomTabsSessionToken token, Uri origin) { return true; }
        @Override protected int postMessage(CustomTabsSessionToken token, String message, Bundle extras) { return 0; }
        @Override protected boolean validateRelationship(CustomTabsSessionToken token, int relation, Uri origin, Bundle extras) { return true; }
        @Override protected boolean receiveFile(CustomTabsSessionToken token, Uri uri, int purpose, Bundle extras) { return false; }
    }
}
