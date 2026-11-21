# QLPM Teacher (Windows)

Tauri 2 wrapper of the **existing** QLPM React teacher/Admin UI.
This uses the same `src/App.jsx` and school-scoped Supabase policies. No additional admin APIs and no database migrations.

**Development from repository root:**
```powershell
npm ci
npx --yes @tauri-apps/cli@2.12.6 icon desktop/teacher/app-icon.svg -o desktop/teacher/src-tauri/icons
cd desktop/teacher
npx --yes @tauri-apps/cli@2.12.6 dev
```

**Release:** `npx --yes @tauri-apps/cli@2.12.6 build` from this folder. Windows installer appears in `src-tauri/target/release/bundle/nsis/`.

Set frontend `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or legacy anon key) through local `.env.local` or CI secrets **before** building. Never put a service_role key in the desktop bundle.

**OAuth status:** Email/password Supabase auth works with existing QLPM frontend. Google OAuth from inside a native WebView is intentionally blocked for now: a proper external browser + registered deep-link callback is required. Google sign-in still works on the website. Do not assume the website session transfers to Windows; do not add unapproved redirect allowlist entries or new server policies.
