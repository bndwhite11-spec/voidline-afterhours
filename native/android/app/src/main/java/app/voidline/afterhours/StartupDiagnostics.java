package app.voidline.afterhours;

import android.os.SystemClock;
import android.util.AtomicFile;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/** Bounded launch-only failure record. Every text field comes from this binary. */
final class StartupDiagnostics implements Thread.UncaughtExceptionHandler {
    static final int START = 0, CONNECT = 1, BROWSER = 2;
    private static final int FORMAT = 0x564c0001;
    private static final long WINDOW_MS = 10000;
    private static final String[] PHASES = {"Process startup", "App launch", "External browser"};
    private static final String[] FAILURES = {
            "Java exception", "java.lang.NullPointerException", "java.lang.UnsupportedOperationException",
            "java.lang.SecurityException", "java.lang.IllegalStateException", "java.lang.IllegalArgumentException",
            "android.content.ActivityNotFoundException", "android.content.res.Resources$NotFoundException",
            "java.lang.ClassCastException", "java.lang.NoClassDefFoundError", "java.lang.VerifyError",
            "java.lang.UnsatisfiedLinkError", "java.lang.ExceptionInInitializerError", "java.lang.RuntimeException",
            "android.view.InflateException", "java.lang.ArrayIndexOutOfBoundsException"
    };
    private static final String[] COMPONENTS = {
            "Unavailable", "app.voidline.afterhours.LauncherActivity", "app.voidline.afterhours.BrowserResolver",
            "android.app.ActivityThread", "android.app.Instrumentation", "android.app.ContextImpl",
            "android.app.ApplicationPackageManager", "android.view.ViewRootImpl",
            "androidx.browser.customtabs.CustomTabsClient", "androidx.browser.trusted.TrustedWebActivityIntentBuilder",
            "app.voidline.afterhours.VoidlineApplication"
    };
    private static final String[] METHODS = {
            "unknown", "attachBaseContext", "onCreate", "onResume", "onNewIntent", "begin", "bind",
            "release", "fallback", "regularBrowser", "openInBrowser", "showControls",
            "onCustomTabsServiceConnected", "performLaunchActivity", "startActivity", "queryIntentActivities"
    };

    private final AtomicFile file;
    private final int build, api;
    private final Thread main;
    private final Thread.UncaughtExceptionHandler previous;
    private int phase;
    private long until;
    private String previousReport;
    private boolean recoveryChecked;

    StartupDiagnostics(File directory, int build, int api, Thread main,
                       Thread.UncaughtExceptionHandler previous) {
        this.file = new AtomicFile(new File(directory, "voidline-launch-v1"));
        this.build = build;
        this.api = api;
        this.main = main;
        this.previous = previous;
        arm(START);
    }

    void arm(int stage) {
        phase = stage;
        until = SystemClock.uptimeMillis() + WINDOW_MS;
    }

    void end() { until = 0; }

    boolean takeRecovery() {
        if (recoveryChecked) return false;
        recoveryChecked = true;
        previousReport = consumeReport();
        if (previousReport != null) end();
        return previousReport != null;
    }

    String report() { return previousReport; }

    @Override public void uncaughtException(Thread thread, Throwable thrown) {
        try {
            if (thread == main && until != 0 && SystemClock.uptimeMillis() < until
                    && !(thrown instanceof VirtualMachineError)) {
                end();
                writeReport(thrown);
            }
        } catch (IOException | RuntimeException ignored) {
            // Reporting must never replace the platform's crash handling.
        } finally {
            previous.uncaughtException(thread, thrown);
        }
    }

    private static int index(String[] values, String name) {
        for (int i = 1; i < values.length; i++) if (values[i].equals(name)) return i;
        return 0;
    }

    private void writeReport(Throwable error) throws IOException {
        int failure = 0, component = 0, method = 0, line = 0;
        for (int depth = 0; error != null && depth < 6; depth++) {
            int category = index(FAILURES, error.getClass().getName());
            if (category != 0) failure = category;
            StackTraceElement[] frames = error.getStackTrace();
            for (int i = 0; i < Math.min(frames.length, 24); i++) {
                StackTraceElement frame = frames[i];
                String className = frame.getClassName();
                int nested = className.indexOf('$');
                int part = index(COMPONENTS, nested < 0 ? className : className.substring(0, nested));
                if (part != 0) {
                    component = part;
                    method = index(METHODS, frame.getMethodName());
                    line = Math.max(0, Math.min(65535, frame.getLineNumber()));
                    break;
                }
            }
            error = error.getCause();
        }
        FileOutputStream stream = file.startWrite();
        try {
            DataOutputStream data = new DataOutputStream(stream);
            data.writeInt(FORMAT);
            data.writeInt(build);
            data.writeInt(api);
            data.writeByte(phase);
            data.writeByte(failure);
            data.writeByte(component);
            data.writeByte(method);
            data.writeShort(line);
            file.finishWrite(stream);
        } catch (IOException | RuntimeException e) {
            file.failWrite(stream);
            throw e;
        }
    }

    private String consumeReport() {
        try (DataInputStream in = new DataInputStream(file.openRead())) {
            if (in.readInt() != FORMAT || in.readInt() != build) return null;
            int sdk = in.readInt(), stage = in.readUnsignedByte(), failure = in.readUnsignedByte();
            int component = in.readUnsignedByte(), method = in.readUnsignedByte(), line = in.readUnsignedShort();
            if (sdk < 24 || sdk > 255 || stage >= PHASES.length || failure >= FAILURES.length
                    || component >= COMPONENTS.length || method >= METHODS.length || in.read() != -1) return null;
            String where = COMPONENTS[component];
            if (component != 0 && method != 0) where += "." + METHODS[method];
            if (component != 0 && line > 0) where += " (line " + line + ")";
            return "VOIDLINE Android build " + build + " · Android API " + sdk + "\n"
                    + PHASES[stage] + "\n" + FAILURES[failure] + "\n" + where;
        } catch (IOException | RuntimeException ignored) {
            return null;
        } finally {
            try { file.delete(); } catch (RuntimeException ignored) { }
        }
    }
}
