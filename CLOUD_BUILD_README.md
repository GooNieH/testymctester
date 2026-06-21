# Build the APK without installing Android Studio

## GitHub Actions method

1. Create a new private GitHub repository.
2. Upload everything in this folder to the repository.
3. Go to the repository's **Actions** tab.
4. Select **Build Android APK**.
5. Click **Run workflow**.
6. When it finishes, open the completed workflow run.
7. Download the artifact named **snubbing-calculator-debug-apk**.
8. Unzip it and install `app-debug.apk` on your Android phone.

On your phone, Android may ask you to allow installing from unknown sources.

## Important

This is a debug APK for personal testing. Later, when the formulas are final, build a signed release APK.
