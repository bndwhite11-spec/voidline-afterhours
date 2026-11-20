package app.voidline.afterhours;

import android.app.Activity;
import android.app.Application;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Looper;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Toast;
import java.io.File;

public final class VoidlineApplication extends Application {
    private StartupDiagnostics diagnostics;

    @Override protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        try {
            Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
            File directory = base.getNoBackupFilesDir();
            if (previous == null || directory == null) return;
            int build = base.getPackageManager().getPackageInfo(base.getPackageName(), 0).versionCode;
            StartupDiagnostics tracker = new StartupDiagnostics(directory, build, Build.VERSION.SDK_INT,
                    Looper.getMainLooper().getThread(), previous);
            Thread.setDefaultUncaughtExceptionHandler(tracker);
            diagnostics = tracker;
        } catch (PackageManager.NameNotFoundException | RuntimeException ignored) {
            // Opening the signed app must work when diagnostic storage is unavailable.
        }
    }

    private static StartupDiagnostics tracker(Activity activity) {
        Application app = activity.getApplication();
        return app instanceof VoidlineApplication ? ((VoidlineApplication) app).diagnostics : null;
    }

    static boolean takeRecovery(Activity activity) {
        StartupDiagnostics tracker = tracker(activity);
        return tracker != null && tracker.takeRecovery();
    }

    static void arm(Activity activity, boolean preferTrusted) {
        StartupDiagnostics tracker = tracker(activity);
        if (tracker != null) tracker.arm(preferTrusted ? StartupDiagnostics.CONNECT : StartupDiagnostics.BROWSER);
    }

    static void endLaunch(Activity activity) {
        StartupDiagnostics tracker = tracker(activity);
        if (tracker != null) tracker.end();
    }

    static void addReportButton(Activity activity, LinearLayout layout) {
        StartupDiagnostics tracker = tracker(activity);
        String report = tracker == null ? null : tracker.report();
        if (report == null) return;
        Button copy = new Button(activity);
        copy.setText("Copy launch details");
        copy.setAllCaps(false);
        copy.setOnClickListener(view -> {
            try {
                ClipboardManager clipboard = activity.getSystemService(ClipboardManager.class);
                if (clipboard == null) throw new IllegalStateException();
                clipboard.setPrimaryClip(ClipData.newPlainText("VOIDLINE launch details", report));
                if (Build.VERSION.SDK_INT < 33) Toast.makeText(activity, "Launch details copied.", Toast.LENGTH_SHORT).show();
            } catch (RuntimeException denied) {
                copy.setText(report);
                copy.setTextIsSelectable(true);
            }
        });
        layout.addView(copy);
    }
}
