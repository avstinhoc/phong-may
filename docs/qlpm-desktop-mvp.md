# QLPM Desktop MVP — Windows (Teacher + Student)

**Branch-only MVP, 2026-11-21. No production merge, production Vercel deployment, Supabase migration or student reward change.**

## Completed

- **Two separate, installable Tauri 2 Windows projects**: `desktop/teacher` and `desktop/student`. Different app identifiers, original SVG icons, native resizable windows, independent NSIS `.exe` installers.
- **QLPM Teacher** mounts the existing React admin/teacher `src/App.jsx` with its normal Supabase Auth/RLS and all existing functions: schedules, roll call, student records, classroom PCs, rankings, reports, Google Sheets, etc. It is not an empty decorative teacher dashboard.
- **QLPM Student** opens `student-desktop.html` with a dedicated dashboard and prominent **Bài giảng**, **Câu hỏi** and **Trò chơi** sections. This embeds the prior lesson/quiz/pixel-art RPG preview, Hardware Builder and Lesson 11 Knowledge Fishing. Level 2/3 remain locked; Lesson 8 reduced and Lesson 10 missing source are not fabricated.
- **Startup:** Student first run on Windows enables autostart for the current Windows account via the official Tauri 2 autostart plugin. Uses a one-time app-config marker to avoid re-enabling if the administrator later turns it off in Windows Startup Apps. No kiosk, background monitoring or Windows remote-control agent.
- **Desktop-only Supabase public configuration** is compiled in using Vite `--mode desktop`, with an `sb_publishable_...` API key (designed to be public; never service_role). This config is intentionally **not** used in default Vercel website builds. RLS and server-side policies remain the data authorization boundary.
- **CI:** regular `npm test` + `vite build`; separate Windows Actions workflow builds unsigned `NSIS` installers and uploads short-lived artifacts. This is a dev-branch build only, not an auto-updater or signed release.

## Important limitations

1. **Student PIN login** (school → class → name → 6-digit PIN), device pairing to PC01–PC40, student-only private records, teacher remote lesson start/stop, attendance/reward sync, grade recording and secure progress saving **are not live** in the MVP. Instead the app labels these screens explicitly. This avoids false login and leaking student rosters. Requires new reviewed backend tables, Edge Functions and school-isolated RLS in later phases.
2. **Google OAuth in native Teacher WebView is blocked intentionally.** Website Google sign-in works, but OAuth cannot simply redirect into the web page and magically transfer a session back to the Windows client. Teacher Desktop supports existing **email/password sign-in**. Before enabling native Google login, implement external browser + deep-link callback, register the custom URL with Supabase Auth and test session handling; do not change the production allowlist without approval.
3. Google Drive presentation previews require user file access/Internet and may not faithfully render all PPTX/PPSX media/transition effects.
4. **Production web remains untouched.** Teacher Desktop uses the same production Supabase instance when users enter their real accounts; testing account actions can affect real data. Use read-only navigation and test accounts until approval for a school rollout.
5. Full 22 game worlds and 88 unique final visual animations are not complete; the earlier independent prototype represents actual progress honestly.

## Build a Windows installer on your own laptop

Prerequisites: Node.js 22+, Rust stable >= 1.90, Microsoft C++ Build Tools, Windows 10/11 WebView2. Tauri CLI version is pinned to `2.12.6` in the build commands.

```powershell
git checkout feature/qlpm-desktop-teacher-student-20261121
npm ci
npm test

# Student Windows installer
npx --yes @tauri-apps/cli@2.12.6 icon desktop/student/app-icon.svg -o desktop/student/src-tauri/icons
cd desktop/student
npx --yes @tauri-apps/cli@2.12.6 build --ci
cd ../..

# Teacher Windows installer
npx --yes @tauri-apps/cli@2.12.6 icon desktop/teacher/app-icon.svg -o desktop/teacher/src-tauri/icons
cd desktop/teacher
npx --yes @tauri-apps/cli@2.12.6 build --ci
```

Both installers are placed under the corresponding `src-tauri/target/release/bundle/nsis/` directory. The included `.env.desktop` is a **publishable** key specifically for the desktop build mode, never a secret/service_role key. A public client key by itself does not give admin permission; server policy enforcement is mandatory.

### GitHub Actions

Open **Actions → QLPM Desktop Windows installers (development only)**. Dev-branch pushes to desktop source trigger Windows builds. The `workflow_dispatch` allows manually re-running a controlled build later when the workflow is present on the default branch. Find download packages under the successful run's **Artifacts** section (they expire after 14 days).

Unsigned installers can show Windows SmartScreen warnings. Do not encourage teachers to bypass security warnings in managed school PCs; ask the school's IT administrator to verify the source/hash and approve a trusted installation policy. Future releases may require paid code signing; no signing service or subscription has been purchased.

## Next milestone

- Build credentialed Student auth with server-side PIN hash/rate limits, per-school/class RLS, short session expiry and teacher reset; no additional students/duplicate rosters.
- Device pairing: link a device installation to an existing `computers.id` and lab without allowing a student to assign their own PC number.
- Teacher assigns slides, practice questions and approved games to classes; Student securely retrieves assignments and submits learning attempts idempotently.
- Protect question answers/teacher data on server and keep the **existing QLPM star leaderboard separate** from game mastery stars unless teacher explicitly approves a reward policy.
- Verify original PPT/PPSX slide fidelity, full Windows installer performance on school PCs and obtain approval before merging into main/Production.

## Integration branch 2026-11-21: Teacher ↔ Student preview

Branch `feature/qlpm-desktop-integration-20261121`, stacked on the first Windows MVP. **No Production Supabase migrations or Edge Function updates have been applied**.

- Student starts on native login screen: existing school registration code → active class roster → select name → six-digit PIN, with optional no-login trial (no private data) and existing `ic3_submit_registration` submit-to-teacher flow.
- Proposed migration `20261121170000_qlpm_desktop_students_pin_pc_approval.sql` (NOT APPLIED): cryptographically hashed PIN, five wrong attempts then 15-minute lock, short revocable student session, public class-code-gated roster, teacher reset approval and PC pairing requests. Teacher-only verification uses `public.can_access_school`. Review/pen-test/rate-limit by client/IP on gateway before applying to real children.
- Student UI retains school Top 5 and grade 1–9 Top 10 via existing public `ic3_school_public_portal`; do not reorder same-earned ties client-side.
- Student lessons open a fullscreen overlay immediately; PPSX Google Drive iframe controls pages and keyboard/swipe events INSIDE Google, while optional fully-authorized per-slide images will use real horizontal swipe carousel.
- **GPT Work 12-stage original Săn Sao arcade** and all its existing source/assets were copied from PR #75 into `src/learning-arcade/` without overwriting the existing IC3 prototype. Student game iframe `/san-sao.html` runs isolated. Its offline stars/rewards are NOT real student stars; no synchronized awards.
- Teacher menu `Máy học sinh & PIN` lists existing PCs and assigned pupils, teacher-approves pairing and PIN change requests, issues one-time PINs, and allows explicit teacher-confirmed existing `student_records` point/star inserts, only if authorized.
- Google Sheets Edge CORS patch permits exact `http://tauri.localhost` while enforcing JWT and per-school access. **Not deployed**. Existing Sheets source file untouched.
- Teacher Google OAuth is designed using Tauri external browser + Windows `qlpmteacher://auth/callback` deep link and Supabase PKCE on the **same** desktop client. **Before it can work end-to-end**, an Admin must add that exact URL to Supabase Authentication → URL Configuration → Redirect URLs; installation and testing are required. Do not allow arbitrary redirects or grant role via Google metadata. Web OAuth remains unchanged.
- Pending: QA on real Windows laptops and school-classroom network; edge deployment approval; student PIN migration/security test/teacher issuance; synchronized lessons, secure server-graded games and 22 complete worlds; actual Teacher remote screen control via approved separate local agent (not implemented).

### Controlled rollout safety gates
1. Review SQL (security-definer RPC with correct revoke/grants, per-school check, no duplicate students), perform test school with non-sensitive dummy accounts, verify no cross-school access.
2. Confirm teacher PC assignment and points triggers, record idempotent actions.
3. Deploy reviewed Sheets CORS patch to Edge Function after approval; ensure JWT school scope still enforced; test both Windows/website.
4. Set Supabase approved desktop OAuth redirect, package installer, try Google OAuth external browser flow on Windows.
5. Build unsigned NSIS installers, review binary provenance before lab rollout. No signed release or installer auto-update.
