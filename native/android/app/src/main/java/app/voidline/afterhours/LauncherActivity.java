package app.voidline.afterhours;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import androidx.browser.customtabs.CustomTabsCallback;
import com.google.androidbrowserhelper.trusted.TwaProviderPicker;

/** Browser-owned HTTPS/authentication with a narrow, visible launch-error path. */
public final class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    static final String HOST = "voidline-afterhours.pipedcactus1.chatgpt.site";
    static final Uri HOME = Uri.parse("https://" + HOST + "/");
    private boolean recoveryScheduled;

    @Override
    protected void onCreate(Bundle state) {
        boolean previousFailure = LaunchRecovery.hasPending(this);
        super.onCreate(state);
        if (previousFailure && !recoveryScheduled) showRecovery();
    }

    @Override
    protected boolean shouldLaunchImmediately() {
        return !LaunchRecovery.hasPending(this);
    }

    @Override
    protected void launchTwa() {
        if (TwaProviderPicker.pickProvider(getPackageManager()).provider == null) {
            showRecovery();
            return;
        }
        try {
            super.launchTwa();
        } catch (ActivityNotFoundException unavailableBrowser) {
            // The selected browser may disappear between discovery and launch.
            showRecovery();
        }
    }

    private void showRecovery() {
        if (recoveryScheduled) return;
        recoveryScheduled = true;
        LaunchRecovery.show(getApplicationContext());
        finish();
    }

    @Override
    protected CustomTabsCallback getCustomTabsCallback() {
        // ABH's default QualityEnforcer intentionally crashes the app process
        // when Chrome reports failed TWA quality. Handle that supported callback
        // with user recovery instead; never hide or fabricate a successful load.
        return new RecoverableTabsCallback(getApplicationContext());
    }

    static boolean isAppPage(Uri requested) {
        if (requested == null || !"https".equals(requested.getScheme())
                || !HOST.equals(requested.getHost())
                || (requested.getPort() != -1 && requested.getPort() != 443)
                || requested.getUserInfo() != null) return false;
        String path = requested.getPath();
        return "/".equals(path) || "".equals(path) || "/index.html".equals(path);
    }

    @Override
    protected Uri getLaunchingUrl() {
        Uri requested = getIntent().getData();
        // Android can deliver the original APK download link after installation.
        // A binary download is not a TWA page; always open home in that case.
        return isAppPage(requested) ? requested : HOME;
    }
}
