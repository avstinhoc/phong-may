# QLPM Student (Windows)

A separate Tauri 2 installer that opens `student-desktop.html`, not the teacher/Admin app. Bài giảng and Bài tập load the independent learning preview under `src/learning/`.

**Development:**
```powershell
npm ci
npx --yes @tauri-apps/cli@2.12.6 icon desktop/student/app-icon.svg -o desktop/student/src-tauri/icons
cd desktop/student
npx --yes @tauri-apps/cli@2.12.6 dev
```

On its **first launch under a Windows user**, Student registers to auto-start at that user's login using the official Tauri autostart plugin. It opens a normal resizable window, not kiosk/fullscreen. A one-time marker prevents subsequent launches from re-enabling startup after an administrator disables it in **Windows Settings → Apps → Startup**.

Current milestone: public curriculum preview, Quiz and games. Student personal PIN login, secure student sessions, real machine pairing, reward persistence and classroom controls are **not yet implemented**. The landing page labels them honestly. No fake student sign-in, no private roster download, no real star awards. No student data migration or edits.
