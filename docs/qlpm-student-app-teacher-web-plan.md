# QLPM Desktop redesign — Student Windows + Teacher Web
Date: 2026-11-21 · Development design/bugfix only · **No production deployment or database migration**

## Agreed architecture and current blockers

| Piece | Role | Current state |
| --- | --- | --- |
| **QLPM Student.exe** | Student learning, authentication, PC enrollment, games, notifications and progress | Windows MVP exists; first startup went blank because `UserRound` was rendered but missing from imports; repaired in this branch, fallback added. Requires Windows smoke test before school installation |
| **phong-may.vercel.app** | The **only Teacher/Admin console**: class review, PIN, PC, lesson assignments, progress, announcements, rewards, Google Sheets | Existing working website remains the management hub. The feature-branch menu **ỨNG DỤNG HỌC SINH → Quản lý Student Desktop** currently exposes PC/PIN basics, but notifications/rule editor require new backend |
| **Supabase** | Authoritative database, auth, access-control, notifications, verified results and grade/star ledgers | Existing students, classes, computers, computer_assignments, student_registrations, student_records and ic3_star_wallets reused; **draft student PIN migration is NOT live** |
| **Google Sheets** | Teacher-only synchronized workbook | Production Edge Function v57 was inspected: it does **not** list the Tauri origin `http://tauri.localhost`, explaining Windows-specific preflight failure. Teacher on website avoids the Tauri-origin issue; check actual workbook permissions/template after browser sync |
| **Teacher.exe** | Previously packaged optional desktop wrapper | Not needed for future development. Stop recommending it as the normal Teacher path. Existing binaries should not be installed in the lab |

## 1. Fix the blank white Student window before features

Root cause: `src/desktop/student/StudentDesktop.jsx` uses `<UserRound/>` in its initial header but does not import it from `lucide-react`, so React throws a reference error on first render. Vite/NSIS compilation does not exercise actual React rendering.

This branch:
- Imports the missing `UserRound` symbol.
- Adds a Student-specific React Error Boundary showing a meaningful recovery screen.
- Adds basic pre-render HTML with a Reload action if the JS entrypoint cannot boot.
- Adds regression tests for missing first-screen icon imports, wrapper and fallback.
- Existing stored pupil data, scores and machine assignments remain untouched.

Before installing widely: build fresh Student NSIS, install on a clean school Windows PC/WebView2, start it, close and reopen, test autostart, test offline startup, check Login/Guest/Game/Leaderboard and examine WebView console if a second error is reported. A successful CI build is **not** a substitute for manual Windows smoke testing.

## 2. Student account lifecycle

Target first-launch screen:

**Đăng nhập | Đăng ký | Xem BXH (public) | Học thử (no personal data)**

**Register (new Student or enrollment request)**

1. Select **School** from safe public school names; select **Class** or enter teacher-provided class registration code. Never show other schools' pupil rosters publicly.
2. Enter complete Vietnamese full name, optional gender and desired existing PC (PC01–PC40); verify legitimate assigned class before accepting. Check exact identity against existing `students` to prevent duplicate student records and allow teacher-led linking.
3. Set a student-chosen **6-digit PIN twice**, but only after a reviewed secure server endpoint exists. Never store a raw PIN in `student_registrations`, client localStorage, logs, sheet exports, notifications, or crash reports. On initial enrollment, post its hash to a protected pending-credential store, or collect the PIN only after approval via a time-limited one-use setup link. Prefer a server-generated/teacher-provided temporary activation code plus a student-chosen PIN at first verified setup.
4. Display **Chờ giáo viên duyệt** and the application reference ID, not a fake successful login. No grade/PC access before approval.
5. Teacher **Quản lý Student Desktop → Yêu cầu đăng ký**: review school, class, full name, matching existing student, requested PC. Approve/reject with reason. Verify on physical school PC if needed.
6. Once approved, Student logs in via **school/class → select own name → PIN**. Authenticate server-side; use a short-lived, revocable student identity scoped to school and device. Lock after repeated wrong PIN, rate-limit by account/device/IP and don't let the class code alone grant student access.

**Forgot PIN**: Student requests reset (generic acknowledgement, no account enumeration), teacher approves/denies; issue time-limited one-use reset code or server-generated temporary PIN. Previous sessions are revoked. Teacher never retrieves the old PIN.

**Multi-user PCs:** allow Logout / Switch Student, automatic inactivity logout, no permanent storage of PIN. Guest mode can read approved lessons and public ranks, never individual scores, saved awards, or private roster.

Current implementation: `src/desktop/student/StudentOnboarding.jsx` submits registration to existing `ic3_submit_registration`, and previews class + name + PIN flow, but the draft PIN server migration is not active. The existing registration RPC does **not** save a student-selected PIN; do not render the new PIN field as operational before backend approval.

## 3. Teacher Web: menu and functional modules

Sidebar: **ỨNG DỤNG HỌC SINH → Quản lý Student Desktop**

Tabs:
- **Tổng quan:** linked PCs online/offline (heartbeat-based, not an assertion that Windows is running if no recent ping), pupils logged in, recent tasks, unresolved requests.
- **Đăng ký & duyệt:** existing school/class registration queue, identity-duplicate checking, student-requested PC, accept/reject.
- **Tài khoản & PIN:** issue/setup/reset/revoke PIN, view masked identity and activity; no plain stored PIN.
- **Thiết bị PC:** PC01–PC40, current assignment, join code, approve/revoke pairing, student logged into that PC, last-seen. Device ID alone proves nothing; pair using authenticated teacher-controlled challenge.
- **Thông báo:** message to student, class, chosen PCs or entire lab; subject/body, expiry, urgent flag (not intrusive), sender, read acknowledgement, optional lesson deep-link. App receives via Supabase Realtime while online and pulls missed notices when reconnecting. Never allow arbitrary code or shell commands in messages.
- **Điểm & sao:** manual teacher-confirmed points/rewards, review automatically verified game completions and grade/class totals.
- **Quy đổi điểm thành sao:** teacher-configured thresholds (see below), policy version, date effective, caps, approval.
- **Bài giảng & bài tập:** teacher assigns from 22 Level 1 slots, deadlines, released questions, allows/removes games, progress/mastery by student and class. Level 2/3 remain locked.
- **Nhật ký / báo cáo:** activity feed, outcome by lesson, pending PIN/PC/registration, auditing and spreadsheet export.

The old Teacher Windows installer is retired as the primary workflow; browser Google OAuth remains standard. No native deep-link work is required.

## 4. Reliable synchronization and safe rewards

**Single Source of Truth**: existing `students.id`, `schools.id`, `classes.id`, `computers.id`, `computer_assignments`, `student_records`, `ic3_star_wallets`. No duplicate students or shadow leaderboard.

**Event flow:**
- App logs in → server verifies short student session → checks PC pairing and assignments.
- Teacher posts notice/lesson assignment to server → device receives via Realtime, with polling/reconnect fallback, read receipt and expiration.
- Student answers approved questions → app submits `attemptId, questionId, chosenAnswer, nonce` to server. Server validates correctness, question version, student/class/lesson, timestamps and replay, then transactionally records attempt & mastery.
- **Do not accept raw client-submitted “earnedPoints”, “wonBoss” or “stars”.** An offline score or a localStorage value from Săn Sao is not verified and must not mint real stars.
- Server calculates approved points and any school rewards, writes an idempotent audit event and forwards to existing `student_records`/`ic3_star_wallets` only through the current authorized reward pipeline. Preserve earliest-achievement tie-break order in school BXH.
- Reconnecting retries with the same idempotency key and never double-awards points/sao. A temporary network loss queues authorized attempts safely and shows Pending Sync, not fake rewards.

**Conversion policy (teacher configurable)**

An illustrative, editable table:

| Cumulative verified game points | Cumulative school stars |
|---:|---:|
| 600 | 2 |
| 1,200 | 3 |
| 2,400 | 4 |

These are **examples only** drawn from previously discussed strict progression, not active rules. School/class scope, caps and the meaning of cumulative vs additional stars must be explicit. Changing a rule creates a **new version effective for future approved attempts**, never silently recalculates old pupil wallets. A school-wide leaderboard shared among teachers should have one approved school policy (or normalized scoring) for fairness; a teacher may draft or propose custom class rules without silently altering school-rank fairness.

Server rule transaction: `verified score total + active rule version + prior-awarded milestones → delta school stars`, capped/idempotent by `student_id + rule_version + threshold_milestone`. Duplicate events never create extra stars. Teacher/Admin gets an audit log and may reverse mistakes by explicit correction rather than deleting historic events.

## 5. Data model proposal (not yet migrated)

- `student_desktop_enrollments`: pending requests, student reference or identity resolution, school, class, requested PC, status, approved_by, reference ID; reusable existing registration tables where possible.
- `student_desktop_credentials`: password/PIN hash, lockout, setup nonce, rotation; protected server-only.
- `student_desktop_sessions`: hashed session token, student id, school, app device install id, expiration/revocation.
- `student_desktop_devices` and `device_pairing_challenges`: bind installs to existing computers; approved/revoked by teacher.
- `student_desktop_messages` and `message_receipts`: school scoped, target student/class/PC, expiry, read status.
- `ic3_learning_attempts`, `ic3_verified_scores`: approved question version, server-calculated results, immutable idempotency keys.
- `ic3_star_conversion_rules`, `ic3_star_conversion_events`: approved versioned policy, audited, idempotent earned stars.
- Reuse existing teacher profile, class/school RLS and star ledger. All privileged operations require server-side teacher authorization, with strong RLS or restricted endpoints. **No public SECURITY DEFINER function returning identifiable school rosters without suitable gating/rate limits.**

The current branch contains an earlier, **unapplied** draft migration `20261121170000_qlpm_desktop_students_pin_pc_approval.sql`. It is **not production-ready**: review pre-auth roster exposure, PIN credential flow, IP/device rate-limiting, server-side multi-school authorization and review conflict/idempotency semantics before executing. Do not apply it to the live project as-is.

## 6. Delivery order

1. Fix blank Student window, build + manual boot smoke test, and use Teacher Web now.
2. Verify Sheets in browser using original shared school file; solve real permission/layout issues if present, without copying original or forcing public access.
3. Implement secure school→class→name→PIN→PC registration and Teacher Web approvals in a test environment; review row-level access.
4. Implement teacher-issued/reset PIN, authenticated PC pairing and school-scoped push notifications with reconnect fallback.
5. Integrate Săn Sao and IC3 question answers through a trusted server grading engine, learning progress and reports.
6. Implement configurable fair reward conversion, audit history and school-wide ranking integration; stage testing with dummy records before school rollout.

**Production safety:** no changes to existing web Production, student records, real PINs, Sheets source files or school star balances until the rollout is reviewed and specifically approved.
