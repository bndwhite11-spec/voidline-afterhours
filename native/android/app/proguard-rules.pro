# Preserve the small set of launcher frames the local diagnostic format recognizes.
# Android and AndroidX otherwise keep their normal release optimization settings.
-keepattributes SourceFile,LineNumberTable
-keepclassmembers class app.voidline.afterhours.LauncherActivity {
    void begin(boolean);
    java.lang.String regularBrowser();
    void openInBrowser(java.lang.String);
    void showControls();
}
-keep class app.voidline.afterhours.LauncherActivity$BrowserConnection {
    void bind();
    void release();
    void fallback();
    void onCustomTabsServiceConnected(android.content.ComponentName, androidx.browser.customtabs.CustomTabsClient);
}
