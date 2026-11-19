package app.voidline.afterhours;

import android.content.Context;
import android.os.Bundle;
import androidx.browser.customtabs.CustomTabsCallback;

/** Supported ABH callback override: a browser load error is a recovery state. */
final class RecoverableTabsCallback extends CustomTabsCallback {
    private final Context context;
    private boolean reported;

    RecoverableTabsCallback(Context context) {
        this.context = context.getApplicationContext();
    }

    private synchronized void failed() {
        if (reported) return;
        reported = true;
        LaunchRecovery.show(context);
    }

    private synchronized void finished() {
        reported = false;
        LaunchRecovery.clear(context);
    }

    @Override
    public void onNavigationEvent(int navigationEvent, Bundle extras) {
        if (navigationEvent == NAVIGATION_FAILED) failed();
        if (navigationEvent == NAVIGATION_FINISHED) finished();
    }

    @Override
    public Bundle extraCallbackWithResult(String callbackName, Bundle args) {
        if ("quality_enforcement.crash".equals(callbackName)) {
            failed();
            Bundle result = new Bundle();
            result.putBoolean("success", false); // No crash or successful load is claimed.
            return result;
        }
        return super.extraCallbackWithResult(callbackName, args);
    }
}
