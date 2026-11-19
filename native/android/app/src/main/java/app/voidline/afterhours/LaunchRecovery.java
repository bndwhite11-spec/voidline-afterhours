package app.voidline.afterhours;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import java.util.concurrent.atomic.AtomicLong;

/** Retain only a generic local failure flag, never a URL or browser error text. */
final class LaunchRecovery {
    private static final String STORE = "voidline-launch-recovery";
    private static final String PENDING = "pending";
    private static final AtomicLong GENERATION = new AtomicLong();

    static boolean hasPending(Context context) {
        return context.getSharedPreferences(STORE, Context.MODE_PRIVATE).getBoolean(PENDING, false);
    }

    static void clear(Context context) {
        GENERATION.incrementAndGet();
        context.getSharedPreferences(STORE, Context.MODE_PRIVATE).edit().remove(PENDING).apply();
    }

    static void show(Context context) {
        Context app = context.getApplicationContext();
        long generation = GENERATION.incrementAndGet();
        app.getSharedPreferences(STORE, Context.MODE_PRIVATE).edit().putBoolean(PENDING, true).apply();
        new Handler(Looper.getMainLooper()).post(() -> {
            if (GENERATION.get() == generation && hasPending(app)) {
                app.startActivity(new Intent(app, RecoveryActivity.class)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP));
            }
        });
    }
}
