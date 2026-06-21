# Snubbing Calculator Android APK Project

This is a native Android WebView wrapper around the snubbing calculator web app.

## Build APK
1. Install Android Studio.
2. Open this folder as a project.
3. Let Android Studio sync Gradle.
4. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. The APK will be created at `app/build/outputs/apk/debug/app-debug.apk`.

## Install on Android
1. Copy `app-debug.apk` to your phone.
2. Open it from Files.
3. Allow installation from unknown sources if Android asks.

The app loads the bundled calculator and attempts to refresh live data from the Google Sheet.
If it cannot reach the sheet, it uses cached/bundled data.
