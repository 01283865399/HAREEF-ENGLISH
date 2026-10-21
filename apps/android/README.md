# Hareef English Android WebView

This native Android shell opens `https://hareef-english.vercel.app/`; it does not
bundle Supabase credentials or a second copy of the website. Authentication,
course data, and purchases use the same website and Supabase configuration as
the browser.

## Build

Open this folder in Android Studio with Android SDK Platform 35 and Build Tools
35.0.0 installed. Use a JDK supported by the installed Android Gradle Plugin.
Run `gradlew.bat assembleDebug` to create a debug APK for device testing at
`app/build/outputs/apk/debug/app-debug.apk`. The APK uses the standard Android
debug signing key and is debuggable; it is for testing, not Play Store release.

For production distribution, use the owner's release signing key, build the
signed release APK/AAB, and keep the key outside the repository. Add
`hareefenglish://auth/callback` and `hareefenglish://auth/reset-password` to
the Supabase Auth redirect URL allow list before using Google sign-in or email
password recovery in the app.
