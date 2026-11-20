package app.voidline.afterhours;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import com.google.androidbrowserhelper.trusted.TwaProviderPicker;
import java.util.List;

/** Foreground entry and recovery for the browser-owned application and its account session. */
public final class LauncherActivity extends Activity {
    static final String HOST = "voidline-afterhours.pipedcactus1.chatgpt.site";
    static final Uri HOME = Uri.parse("https://" + HOST + "/");
    static final int RETRY_ID = 10101, BROWSER_ID = 10102, STATUS_ID = 10103;
    static final long BIND_TIMEOUT_MS = 3000;
    private static final String AUTO_OPEN = "voidline.auto_open";
    private static final String LAST_STATUS = "voidline.last_status";
    private static final String RETURN_MESSAGE = "Select Continue to VOIDLINE to open your conversations.";
    private static final String NO_BROWSER = "No available browser could open VOIDLINE. Enable a browser such as Chrome or Samsung Internet, then try again.";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextView status;
    private BrowserConnection connection;
    private boolean resumed, autoOpen;
    private int generation;

    @Override protected void onCreate(Bundle savedState) {
        super.onCreate(savedState);
        autoOpen = savedState == null || savedState.getBoolean(AUTO_OPEN, true);
        showControls();
        status.setText(autoOpen ? "Opening VOIDLINE…" : savedState.getString(LAST_STATUS, RETURN_MESSAGE));
    }

    @Override protected void onResume() {
        super.onResume();
        resumed = true;
        if (autoOpen) begin(true);
    }

    @Override protected void onPause() {
        resumed = false;
        if (connection != null && connection.waiting) {
            autoOpen = true;
            cancelAttempt();
        }
        super.onPause();
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        cancelAttempt();
        autoOpen = true;
        if (resumed) begin(true);
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        out.putBoolean(AUTO_OPEN, autoOpen || (connection != null && connection.waiting));
        out.putString(LAST_STATUS, status.getText().toString());
    }

    @Override protected void onDestroy() {
        cancelAttempt();
        super.onDestroy();
    }

    static boolean isAppPage(Uri requested) {
        if (requested == null || !"https".equals(requested.getScheme())
                || !HOST.equals(requested.getHost())
                || (requested.getPort() != -1 && requested.getPort() != 443)
                || requested.getUserInfo() != null) return false;
        String path = requested.getPath();
        return "/".equals(path) || "".equals(path) || "/index.html".equals(path);
    }

    Uri getLaunchingUrl() {
        Uri requested = getIntent().getData();
        return isAppPage(requested) ? requested : HOME;
    }

    private void begin(boolean preferTrusted) {
        if (!resumed || isFinishing()) return;
        cancelAttempt();
        autoOpen = false;
        status.setText("Opening VOIDLINE…");
        try {
            TwaProviderPicker.Action provider = TwaProviderPicker.pickProvider(getPackageManager());
            if (preferTrusted && external(provider.provider)
                    && provider.launchMode == TwaProviderPicker.LaunchMode.TRUSTED_WEB_ACTIVITY) {
                BrowserConnection next = new BrowserConnection(provider.provider, generation);
                connection = next;
                next.bind();
            } else {
                openInBrowser(regularBrowser(provider.provider));
            }
        } catch (SecurityException unavailable) {
            status.setText(NO_BROWSER);
        }
    }

    private boolean external(String name) {
        return name != null && !name.isEmpty() && !getPackageName().equals(name);
    }

    private String regularBrowser(String preferred) {
        // Some browsers advertise generic HTTPS handling only. Probing a generic
        // scheme keeps verified app links from resolving back to this launcher.
        Intent probe = new Intent(Intent.ACTION_VIEW, Uri.fromParts("https", "", null))
                .addCategory(Intent.CATEGORY_BROWSABLE);
        PackageManager packages = getPackageManager();
        List<ResolveInfo> candidates = packages.queryIntentActivities(probe, PackageManager.MATCH_DEFAULT_ONLY);
        ResolveInfo selected = packages.resolveActivity(probe, PackageManager.MATCH_DEFAULT_ONLY);
        String first = null;
        for (ResolveInfo candidate : candidates) {
            if (candidate.activityInfo == null) continue;
            String name = candidate.activityInfo.packageName;
            if (!external(name)) continue;
            if (selected != null && selected.activityInfo != null && name.equals(selected.activityInfo.packageName)) return name;
            if (first == null) first = name;
        }
        return external(preferred) ? preferred : first;
    }

    private void openInBrowser(String browser) {
        if (!resumed || isFinishing()) return;
        if (!external(browser)) {
            status.setText(NO_BROWSER);
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, getLaunchingUrl())
                    .addCategory(Intent.CATEGORY_BROWSABLE).setPackage(browser));
            status.setText(RETURN_MESSAGE);
        } catch (ActivityNotFoundException | SecurityException unavailable) {
            status.setText(NO_BROWSER);
        }
    }

    private void cancelAttempt() {
        generation++;
        BrowserConnection previous = connection;
        connection = null;
        if (previous != null) previous.release();
    }

    private final class BrowserConnection extends CustomTabsServiceConnection {
        final String browser;
        final int attempt;
        boolean bound, waiting = true;
        final Runnable timeout = this::fallback;

        BrowserConnection(String browser, int attempt) {
            this.browser = browser;
            this.attempt = attempt;
        }

        void bind() {
            handler.postDelayed(timeout, BIND_TIMEOUT_MS);
            try {
                bound = CustomTabsClient.bindCustomTabsService(LauncherActivity.this, browser, this);
                if (!bound) fallback();
            } catch (SecurityException unavailable) {
                fallback();
            }
        }

        void release() {
            handler.removeCallbacks(timeout);
            waiting = false;
            if (bound) {
                bound = false;
                unbindService(this);
            }
        }

        private boolean canOpen() {
            return connection == this && waiting && resumed && !isFinishing();
        }

        private void fallback() {
            if (!canOpen()) return;
            cancelAttempt();
            openInBrowser(browser);
        }

        @Override public void onServiceDisconnected(ComponentName name) { fallback(); }
        @Override public void onNullBinding(ComponentName name) { fallback(); }
        @Override public void onBindingDied(ComponentName name) { fallback(); }

        @Override public void onCustomTabsServiceConnected(ComponentName name, CustomTabsClient client) {
            if (!canOpen()) return;
            if (!browser.equals(name.getPackageName())) { fallback(); return; }
            try {
                CustomTabsSession session = client.newSession(new NavigationFeedback(attempt));
                if (session == null) { fallback(); return; }
                new TrustedWebActivityIntentBuilder(getLaunchingUrl()).build(session)
                        .launchTrustedWebActivity(LauncherActivity.this);
                waiting = false;
                handler.removeCallbacks(timeout);
                status.setText(RETURN_MESSAGE);
            } catch (ActivityNotFoundException | SecurityException unavailable) {
                fallback();
            }
        }
    }

    private final class NavigationFeedback extends CustomTabsCallback {
        private final int attempt;
        NavigationFeedback(int attempt) { this.attempt = attempt; }

        private void reportFailure() {
            // Browser callbacks may arrive on a binder thread with this Activity
            // behind the browser. Update its controls without starting a task.
            handler.post(() -> {
                if (attempt == generation && !isFinishing())
                    status.setText("The browser could not load VOIDLINE. Check your connection and try again, or choose Open in browser.");
            });
        }

        @Override public void onNavigationEvent(int event, Bundle extras) {
            if (event == NAVIGATION_FAILED) reportFailure();
            if (event == NAVIGATION_FINISHED) handler.post(() -> {
                if (attempt == generation && !isFinishing()) status.setText(RETURN_MESSAGE);
            });
        }

        @Override public Bundle extraCallbackWithResult(String name, Bundle extras) {
            if ("quality_enforcement.crash".equals(name)) {
                reportFailure();
                Bundle result = new Bundle();
                result.putBoolean("success", false);
                return result;
            }
            return super.extraCallbackWithResult(name, extras);
        }
    }

    private void showControls() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(14,16,19));
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_VERTICAL);
        int spacing = dp(24);
        content.setPadding(spacing, spacing, spacing, spacing);
        content.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(spacing + insets.getSystemWindowInsetLeft(), spacing + insets.getSystemWindowInsetTop(),
                    spacing + insets.getSystemWindowInsetRight(), spacing + insets.getSystemWindowInsetBottom());
            return insets;
        });
        content.addView(text("VOIDLINE", 34, Color.rgb(236,239,244)));
        status = text("", 17, Color.rgb(180,187,196));
        status.setId(STATUS_ID);
        status.setAccessibilityLiveRegion(android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE);
        content.addView(status);
        Button retry = button("Continue to VOIDLINE", RETRY_ID);
        retry.setOnClickListener(v -> begin(true));
        Button browser = button("Open in browser", BROWSER_ID);
        browser.setOnClickListener(v -> begin(false));
        content.addView(retry);
        content.addView(browser);
        scroll.addView(content);
        setContentView(scroll);
        content.requestApplyInsets();
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setPadding(0,0,0,dp(18));
        return view;
    }
    private Button button(String value, int id) {
        Button button = new Button(this);
        button.setId(id);
        button.setText(value);
        button.setAllCaps(false);
        button.setMinHeight(dp(48));
        return button;
    }
}
