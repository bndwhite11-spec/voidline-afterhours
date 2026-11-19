package app.voidline.afterhours;

import android.net.Uri;

/** The browser owns HTTPS, authentication, passkeys and permission prompts.
 * This package supplies an Android launcher, not a JavaScript bridge/WebView.
 */
public final class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    private static final String HOST = "voidline-afterhours.pipedcactus1.chatgpt.site";
    private static final Uri HOME = Uri.parse("https://" + HOST + "/");

    @Override
    protected Uri getLaunchingUrl() {
        Uri requested = getIntent().getData();
        if (requested != null
                && "https".equals(requested.getScheme())
                && HOST.equals(requested.getHost())
                && (requested.getPort() == -1 || requested.getPort() == 443)
                && requested.getUserInfo() == null) {
            return requested;
        }
        return HOME;
    }
}
