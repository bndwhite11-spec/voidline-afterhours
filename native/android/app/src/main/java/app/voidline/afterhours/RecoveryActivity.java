package app.voidline.afterhours;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import com.google.androidbrowserhelper.trusted.TwaProviderPicker;

/** Native error recovery remains visible even when the hosted page cannot load. */
public final class RecoveryActivity extends Activity {
    static final int RETRY_ID = 10101, BROWSER_ID = 10102;
    private TextView description;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(14, 16, 19));
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(android.view.Gravity.CENTER_VERTICAL);
        int spacing = dp(24);
        content.setPadding(spacing, spacing, spacing, spacing);
        content.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(spacing + insets.getSystemWindowInsetLeft(),
                    spacing + insets.getSystemWindowInsetTop(),
                    spacing + insets.getSystemWindowInsetRight(),
                    spacing + insets.getSystemWindowInsetBottom());
            return insets;
        });
        TextView wordmark = text("VOIDLINE / AFTERHOURS", 14, Color.rgb(201, 186, 240));
        TextView heading = text("The connection was interrupted.", 28, Color.rgb(240, 238, 247));
        description = text("Voidline could not open its page. Check your connection and try again. If the problem continues, open the website in your browser. Your account and messages have not been reset.", 17, Color.rgb(187, 188, 203));
        content.addView(wordmark); content.addView(heading); content.addView(description);
        Button retry = button("Try again", RETRY_ID);
        retry.setOnClickListener(view -> {
            LaunchRecovery.clear(this);
            startActivity(new Intent(this, LauncherActivity.class).setData(LauncherActivity.HOME)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
            finish();
        });
        Button browser = button("Open in browser", BROWSER_ID);
        browser.setOnClickListener(view -> openBrowser());
        content.addView(retry); content.addView(browser);
        scroll.addView(content, new ScrollView.LayoutParams(-1, -1));
        setContentView(scroll);
        content.requestApplyInsets();
    }

    private void openBrowser() {
        String provider = TwaProviderPicker.pickProvider(getPackageManager()).provider;
        if (provider == null || getPackageName().equals(provider)) {
            description.setText("No compatible browser was found. Install or enable an updated browser such as Chrome, then try again.");
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, LauncherActivity.HOME)
                    .addCategory(Intent.CATEGORY_BROWSABLE).setPackage(provider));
            LaunchRecovery.clear(this);
            finish();
        } catch (ActivityNotFoundException unavailableBrowser) {
            description.setText("The browser is unavailable. Enable or update your browser, then try again.");
        }
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this); view.setText(value); view.setTextSize(size);
        view.setTextColor(color); view.setPadding(0, 0, 0, dp(20)); return view;
    }
    private Button button(String value, int id) {
        Button view = new Button(this); view.setId(id); view.setText(value);
        view.setAllCaps(false); view.setMinHeight(dp(52));
        LinearLayout.LayoutParams layout = new LinearLayout.LayoutParams(-1, -2);
        layout.setMargins(0, dp(8), 0, 0); view.setLayoutParams(layout); return view;
    }
}
