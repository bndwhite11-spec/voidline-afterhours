# Android's default rules keep manifest entrypoints. Keep the explicit URL
# policy method as a defense against accidental removal across ABH updates.
-keep class app.voidline.afterhours.LauncherActivity { *; }
