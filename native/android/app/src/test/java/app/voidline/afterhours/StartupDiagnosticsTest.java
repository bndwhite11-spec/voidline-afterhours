package app.voidline.afterhours;

import static org.junit.Assert.*;
import android.content.ClipboardManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowSystemClock;
import org.robolectric.util.ReflectionHelpers;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 35)
public class StartupDiagnosticsTest {
    @Rule public TemporaryFolder temporary = new TemporaryFolder();

    private final AtomicInteger forwards = new AtomicInteger();
    private Throwable last;

    private StartupDiagnostics create(File dir, int build) {
        return new StartupDiagnostics(dir, build, 35, Thread.currentThread(), (thread, thrown) -> {
            forwards.incrementAndGet();
            last = thrown;
        });
    }

    private Throwable failure() {
        IllegalStateException cause = new IllegalStateException("private account message or https://private.example");
        cause.setStackTrace(new StackTraceElement[] {
            new StackTraceElement("app.voidline.afterhours.LauncherActivity", "begin", "private_filename", 41),
            new StackTraceElement("private.package", "privateMethod", "privateFile", 1)
        });
        return new RuntimeException("private outer exception", cause);
    }

    @Test public void recordsOnlyCompiledLabelsAndNumbersAndForwardsOriginalFailure() throws Exception {
        File dir = temporary.newFolder();
        StartupDiagnostics first = create(dir, 4);
        assertFalse(first.takeRecovery());
        first.arm(StartupDiagnostics.BROWSER);
        Throwable failure = failure();
        first.uncaughtException(Thread.currentThread(), failure);
        assertEquals(1, forwards.get()); assertSame(failure, last);
        byte[] bytes = Files.readAllBytes(new File(dir, "voidline-launch-v1").toPath());
        assertEquals(18, bytes.length);
        assertFalse(new String(bytes, StandardCharsets.UTF_8).contains("private"));

        StartupDiagnostics second = create(dir, 4);
        assertTrue(second.takeRecovery());
        String copy = second.report();
        assertTrue(copy.contains("Android build 4"));
        assertTrue(copy.contains("Android API 35"));
        assertTrue(copy.contains("External browser"));
        assertTrue(copy.contains("java.lang.IllegalStateException"));
        assertTrue(copy.contains("LauncherActivity.begin (line 41)"));
        assertFalse(copy.contains("private"));
        assertFalse(second.takeRecovery());
        assertEquals(copy, second.report());
        assertFalse(create(dir, 4).takeRecovery());
    }

    @Test public void previousBuildAndMalformedRecordsDoNotTriggerRecovery() throws Exception {
        File dir = temporary.newFolder();
        create(dir, 3).uncaughtException(Thread.currentThread(), failure());
        assertFalse(create(dir, 4).takeRecovery());
        File record = new File(dir, "voidline-launch-v1");
        Files.write(record.toPath(), "private corrupt text".getBytes(StandardCharsets.US_ASCII));
        StartupDiagnostics next = create(dir, 4);
        assertFalse(next.takeRecovery());
        assertNull(next.report());
        assertFalse(record.exists());
    }

    @Test public void captureIsOnlyOncePerAttemptAndOnlyForMainThreadDuringLaunch() throws Exception {
        File dir = temporary.newFolder();
        StartupDiagnostics tracker = create(dir, 4);
        tracker.uncaughtException(new Thread(), failure());
        tracker.end();
        tracker.uncaughtException(Thread.currentThread(), failure());
        assertFalse(create(dir, 4).takeRecovery());

        tracker.arm(StartupDiagnostics.CONNECT);
        ShadowSystemClock.advanceBy(Duration.ofSeconds(11));
        tracker.uncaughtException(Thread.currentThread(), failure());
        assertFalse(create(dir, 4).takeRecovery());

        tracker.arm(StartupDiagnostics.CONNECT);
        tracker.uncaughtException(Thread.currentThread(), new IllegalArgumentException());
        tracker.uncaughtException(Thread.currentThread(), new NullPointerException());
        StartupDiagnostics fresh = create(dir, 4);
        assertTrue(fresh.takeRecovery()); assertTrue(fresh.report().contains("IllegalArgumentException"));
        assertEquals(5, forwards.get());
    }

    @Test public void missingStorageStillForwardsAndReportsNoPreviousFailure() throws Exception {
        StartupDiagnostics tracker = create(temporary.newFile(), 4);
        Throwable failure = failure();
        tracker.uncaughtException(Thread.currentThread(), failure);
        assertEquals(1, forwards.get()); assertSame(failure, last);
        assertFalse(tracker.takeRecovery());
    }

    @Test public void nextLaunchWaitsForUserAndCopiesOnlyOnRequest() throws Exception {
        File dir = temporary.newFolder();
        create(dir, 4).uncaughtException(Thread.currentThread(), failure());
        VoidlineApplication application = (VoidlineApplication) RuntimeEnvironment.getApplication();
        // Substitute the next process's tracker without terminating a Robolectric worker.
        ReflectionHelpers.setField(application, "diagnostics", create(dir, 4));
        LauncherActivity activity = Robolectric.buildActivity(LauncherActivity.class).setup().get();
        TextView status = activity.findViewById(LauncherActivity.STATUS_ID);
        assertTrue(status.getText().toString().contains("closed during its last launch"));
        LinearLayout actions = (LinearLayout) status.getParent();
        Button copy = (Button) actions.getChildAt(actions.getChildCount() - 1);
        assertEquals("Copy launch details", copy.getText());
        ClipboardManager clipboard = activity.getSystemService(ClipboardManager.class);
        assertFalse(clipboard.hasPrimaryClip());
        copy.performClick();
        String shared = clipboard.getPrimaryClip().getItemAt(0).getText().toString();
        assertTrue(shared.contains("LauncherActivity.begin (line 41)"));
        assertFalse(shared.contains("private"));
        activity.findViewById(LauncherActivity.BROWSER_ID).performClick();
        assertFalse(status.getText().toString().contains("closed during its last launch"));
    }
}
