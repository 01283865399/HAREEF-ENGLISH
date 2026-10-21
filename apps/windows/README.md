# Hareef English for Windows

This Electron WebView opens `https://hareef-english.vercel.app/`. Supabase
authentication, courses, and purchases remain on the same site; no Supabase
secret key is included in the desktop package.

## Build

```powershell
npm install
npm run dist
```

The installer and portable x64 executable are written to `artifacts/`. Set
`HAREEF_SITE_URL` to a different HTTPS deployment URL when testing another
environment.

The generated Windows packages are not code-signed; Windows SmartScreen may
display a warning until the app is signed with the publisher's certificate.

Google sign-in and password recovery use the `hareefenglish://` app link. Add
`hareefenglish://auth/callback` and
`hareefenglish://auth/reset-password` to the Supabase Auth redirect URL allow
list before using those flows in the packaged app.
