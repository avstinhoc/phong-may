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

**Integration preview:** Google Sign-In now uses a system-browser PKCE + deep-link flow (`qlpmteacher://auth/callback`). Its destination **must first be allowlisted in Supabase Auth URL Configuration**; a successful Windows build is not proof of successful Google login. Do not require teachers to disable Google security checks or share Google tokens. The existing website OAuth flow is untouched.

Teacher menu `Máy học sinh & PIN` previews PC assignments, student PIN change/PC pairing approvals and teacher-confirmed points/sao rewards. New RPCs require the draft migration and school security review; never apply to live children untested. Google Sheets Tauri CORS patch also remains unapplied until approved.
