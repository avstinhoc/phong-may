# QLPM Student — IC3 GS6 Level 1: Learning, quizzes and educational RPG

> **Development-only architecture and functional prototype.** The live QLPM website, Supabase project, student records and reward ledgers have not been modified. Do not merge, migrate or deploy without explicit approval.

## Source audit

The teacher supplied 19 Drive presentation files representing 20 of the 22 lesson slots. Files 1–7, 9 and 12–22 were checked by presentation filename and/or slide contents; Bài 11 is an Office PowerPoint opened through a Google Slides editor link. The shared Bài 2–3 deck has **37 slides**, with Bài 2 on slides **1–16** and Bài 3 starting on **slide 17**. Bài 1 has **28 slides**. The curriculum metadata is at `src/learning/curriculum.js`.

| Slot | Source-confirmed lesson topic | Slide status | Question/game state |
| --- | --- | --- | --- |
| 1 | Tìm hiểu phần cứng cơ bản của máy tính | Linked, 28 slides | 12 review-only questions; playable Round 1 |
| 2 | Các thiết bị nhập và thiết bị xuất cơ bản | Linked, shared 37-slide deck, slides 1–16 | 5 review-only questions |
| 3 | Tìm hiểu các loại máy tính | Linked, shared 37-slide deck, slides 17–37 | 3 review-only questions |
| 4 | Tìm hiểu về phần mềm và ứng dụng | Linked | Questions need authoring/approval |
| 5 | Tìm hiểu về hệ điều hành | Linked | Questions need authoring/approval |
| 6 | Tài khoản đăng nhập và các tác vụ điều hướng | Linked | Questions need authoring/approval |
| 7 | Quản lí tập tin và sao lưu dự phòng | Linked | Questions need authoring/approval |
| 8 | **Giảm tải** | No source requested | Skipped/locked; not a progression blocker |
| 9 | Tìm hiểu về kết nối mạng không dây | Linked | Questions need authoring/approval |
| 10 | **Chưa có tài liệu** | **No link supplied** | Locked until approved source is provided |
| 11 | Các trình duyệt Web phổ biến và quản lí Bookmark | Linked (Office PPTX in Drive) | Questions need authoring/approval |
| 12 | Tìm kiếm thông tin và thu hẹp phạm vi tìm kiếm | Linked | Questions need authoring/approval |
| 13 | Tìm hiểu về tài sản công cộng và giấy phép Creative Commons | Linked | Questions need authoring/approval |
| 14 | Danh tính kĩ thuật số | Linked | Questions need authoring/approval |
| 15 | Các hành vi trực tuyến | Linked | Questions need authoring/approval |
| 16 | Một số mạng truyền thông xã hội phổ biến | Linked | Questions need authoring/approval |
| 17 | Các nguyên tắc và chính sách khi tham gia mạng truyền thông xã hội | Linked | Questions need authoring/approval |
| 18 | Tương tác trên môi trường kĩ thuật số | Linked | Questions need authoring/approval |
| 19 | Sự cần thiết của bảo mật thông tin | Linked | Questions need authoring/approval |
| 20 | Các mối nguy hiểm và cách phòng chống khi sử dụng công nghệ kĩ thuật số | Linked | Questions need authoring/approval |
| 21 | Cách phòng chống khi sử dụng công nghệ kĩ thuật số | Linked | Questions need authoring/approval |
| 22 | Tìm hiểu công nghệ thu thập dữ liệu | Linked | Questions need authoring/approval |

**Level 2 and Level 3 are locked.** Do not invent unprovided lesson topics or questions. All 20 current prototype questions are teacher-review drafts grounded in the stated source slides; they have **not** been presented as an official IC3 question bank.

The supplied inspiration website `https://on-luyen-ic3.netlify.app/` could not be retrieved/verified during this audit. No questions or visual assets were copied from it. Its content should be separately reviewed when accessible, with permission for reuse where necessary.

## Navigation and presentation viewer

- `QLPM Student → Bài giảng`: cards 1–22, Level 2/3 disabled, lesson title, status.
- Clicking a sourced lesson opens Google Drive's `/file/d/{id}/preview` in a 16:9 iframe with `Mở file gốc` fallback.
- The Google Drive viewer's own navigation is used to switch slides; we **cannot** reliably jump directly to slide 17 of a PPSX using the Drive iframe API. Students opening Bài 3 are instructed to select slide 17.
- Access requires appropriate Google Drive **viewer permissions** and Internet. Do not make Drive folders public or rewrite file ACLs automatically.
- Google Drive might not accurately display native PowerPoint transitions, audio, embedded videos or interactions. For fidelity, a future **approved** import pipeline can convert teacher-owned files into per-slide images, preserve metadata/voiceovers separately, and stream them from controlled storage. Do not silently modify source presentations.
- `QLPM Student → Bài tập → Câu hỏi`: 22 lesson slots; only authored question drafts are selectable in preview.
- `QLPM Student → Bài tập → Trò chơi`: subsections **Phiêu lưu, Trò chơi vui, Nhân vật, Trang bị, Thành tích, Ôn tập**. Navigation works; not-yet-built subsections are explicitly labeled.
- User interface is responsive; desktop Windows app wrapping (Tauri), autostart and student PIN flow are **not implemented in this prototype**.

## Adventure architecture

`src/learning/adventureCatalog.js` defines **22 world slots, 4 enemy records per lesson = 88 unique technical monster blueprints**, including unique IDs/names or clearly marked unapproved reserved labels, visual keys, attack/animation keys and HP. Boss = round 4. For Bài 8 and 10, the **8 enemy records remain reserved and unplayable**. Distinct *production-quality* character sprite sheets and 88 complete animation sets are **future art work**, not delivered by this prototype.

| Round | Educational function | Monster HP | Base answer damage |
| --- | --- | --- | --- |
| 1 – Discovery | Recognition | 8 | 2 |
| 2 – Practice | Understanding/application | 10 | 2 |
| 3 – Challenge | Reasoning/scenario | 12 | 2 |
| 4 – Boss | Lesson-wide mixed challenge | 16 | 2 |

Rules of the **implemented pure battle engine**:
- 3 hearts on entry, no timer.
- Correct: record a valid answer once, reveal explanation, damage enemy, display feedback.
- Incorrect: reveal correct option and explanation; remove exactly one heart unless an available shield blocks it.
- Three consecutive correct answers grant +1 damage in configurable balance.
- Hero styles Cyber Warrior, Tech Archer, Digital Mage have identical base learning/combat power.
- Victory requires reducing enemy HP to zero through correctly answered questions. Duplicate answers, missing/invalid choices and double submissions cannot cause fake progression.
- When out of authored questions, show `questions-exhausted`; **no fake victory or rewards**.
- On defeat, reviewing missed questions and retrying the round remain possible.
- Optional equipment effects have hard caps. No random pay-to-win advantages.
- 3/2/1 learning stars are **session preview ratings**, never written to `student_records`/`ic3_star_wallets`.

**Playable today in isolated preview:** Bài 1 – Round 1. Later rounds and other worlds require sufficient and teacher-approved question banks at the appropriate difficulty.

## Eight educational mini-game plans

A. Virus Defense — stop cyber threats with accurate safety decisions.
B. Hardware Builder — assemble components, identify functions and compatibility.
C. Network Rescue — construct/troubleshoot correct network paths.
D. Cyber Maze — navigation gated on understanding.
E. Match & Repair — match concepts, components and definitions.
F. Data Sorting Rush — categorize devices, files and scenarios with mouse or keyboard alternative.
G. Tech Racing — knowledge-based progression, no mandatory response timer.
H. Knowledge Challenge — steps, scenarios, error diagnosis, T/F and mixed revision.

The game library is visible with `planned` labels. These **are not yet eight implemented playable games**. Add them progressively, sharing the approved question service and teacher analytics.

## Question bank and teaching integrity

Each reviewed question will include:
`id, lesson_id, objective, type, difficulty, prompt, choices, correct_answer, explanation, tags, source_slides, visual/media, review_status, reviewed_by, version`.

Support multiple choice, T/F, image identification, matching, sort/drag, ordering, fill in blanks and scenario troubleshooting. For multi-answer and interactive items use type-specific server validators. Every asset needs rights/provenance. Never fetch scraped copyrighted Quizizz/Wayground question banks as if they were approved.

Teacher review workflow: import proposals → exact slide references → teacher edits/correctness review → **approve and publish** → only approved and current version appears in Student. Store *answer keys on the server* for graded attempts; do not trust any score/calculated rewards sent from a student client.

Educational metrics: first-attempt accuracy, wrong concept tags, review frequency, progress by objective, time spent **only for teacher insight** and not for speed-based learning rank. Recommend spaced revision. Maintain distinct question pools per round/difficulty and avoid repeats inside a battle.

## Existing database integration (read-only audited)

Existing public entities include `schools`, `classes`, `students`, `profiles`, `computers`, `computer_assignments`, `class_sessions`, `student_records` and `ic3_star_wallets`. Continue to use the *existing* `student_id`, `school_id`, `class_id` instead of creating students or class membership again. Do not modify QLPM's teacher Google OAuth, class code logic, attendance or star ranking.

Proposed **new** entities, subject to design/security review (not migrated):
- `ic3_lesson_catalog` / `ic3_lesson_media`: versioned approved lessons and display order.
- `ic3_question_bank` / `ic3_question_versions`: drafts, corrections and publish approvals; answers in server-controlled storage.
- `ic3_student_credentials`: unique per existing student, hashed PIN (Argon2id/scrypt), reset history and lockout counters; no plaintext/unencrypted PIN.
- `ic3_student_sessions`: short-lived authenticated student sessions scoped by student/school, device ID and revocation.
- `ic3_lab_devices`: approved PC serial/installation keys, mapped to existing `computers.id` and school. Device ID must not alone grant access to personal records.
- `ic3_lesson_assignments`: teacher-scoped lesson and practice assignments.
- `ic3_battle_attempts` / `ic3_answer_events`: server-authenticated questions, idempotency keys, attempt sequencing and mastery outcomes.
- `ic3_hero_profiles` / `ic3_inventory` / `ic3_achievement_unlocks`: cosmetic and reviewed learning progression.
- `ic3_learning_stars`: *separate* learning completion ratings; never write into the existing class/star leaderboard until teacher explicitly approves a reward policy.

### Essential authorization

1. Students select class and name, then enter a **six-digit PIN**. A short class-code by itself is **not authentication**. Rate-limit PIN attempts per account/device/network and add a temporary lockout. Do not expose all students in a school to unauthenticated device searches; require class/session access gating.
2. Verify PIN **server-side** and issue a scoped, expiring, revocable identity. On shared lab PCs: auto-logout after inactivity or teacher ends session, clear local sensitive cache, never remember raw PIN.
3. Use school/class RLS: students only read their own private learning profile; teachers see assigned schools/classes; admin writes controlled by server-validated role (never user-editable metadata).
4. Client cannot directly update reward/points, attempts, inventory ownership, correct answers or achievement state. Use transactional RPC/Edge Function with verified claims, question answer validation and idempotent completion keys.
5. Disable public/anonymous write permissions. Minimize exposed roster fields, do not disclose hidden answer keys in downloadable client bundle for real assessments.
6. Quiz and RPG mastery feedback can be shown to students without revealing teacher-only question-bank management. Avoid copying children's data to external game services or unrestricted analytics.

## Teacher UI design

Menu: `QLPM Teacher → Bài giảng`, `Bài tập → Ngân hàng câu hỏi | Giao bài | Tiến độ | Kết quả | Cài đặt trò chơi`.

- Teacher reviews slide-source mapping and image explanations.
- Teacher can draft, validate, import, version and approve questions per school/lesson/difficulty.
- Teacher can choose which lessons and mini-games are enabled in their assigned classes, with due date and retry policy.
- Teacher sees student outcomes, wrong concepts and attempted rounds — no automatic QLPM attendance or paid payroll events.
- Publishing drafts is an audited operation, not direct unrestricted student editing.

## Phased delivery/acceptance

| Stage | Result |
| --- | --- |
| 1: Source audit | **Partially complete**; 19 files audited, 22 slots mapped, Bài 8/10 marked |
| 2: Independent functional prototype | **Complete at preview level**: slide iframe, Lesson 1 MCQ & battle Round 1, original drawn device illustrations, 3 hero choices, feedback, victory/defeat/retry |
| 3: 22 worlds / 88 enemies | **Blueprint complete**, bespoke production art and approved rounds **pending** |
| 4: Equipment & persistence | Pure balance caps **defined**; student authentication, real inventory and secure Supabase persistence **pending** |
| 5: Eight mini-games | **1 functional draft** (Hardware Builder), 7 designs pending; extend each with approved learning objectives |
| 6: Teacher integration | Navigation/permissions/data model **planned**, not wired |
| 7: Security, UX and Windows rollout | Multi-school access tests, anti-duplicate rewards, slow-PC benchmark, Tauri builds/autostart, full accessibility checks **pending** |

Run `npm test` and `npm run build` in the development branch. During development open `/learning-prototype.html` with Vite. The production home route remains `/index.html`, unchanged. The static prototype is *not* a secure student app: it has neither authenticated students nor server-side answer checks and must never award actual QLPM stars.

**Blocking approvals before a real school rollout:** supply Bài 10 material, confirm whether Bài 8 should simply remain reduced, approve the first question bank and lesson splitting, approve PIN/auth and student data privacy approach, authorize individual slide conversions if Google Drive PPSX preview fidelity is insufficient, and approve Production deployment explicitly.
