# Teacher Dashboard — Fix Roadmap

Prioritized remediation plan. The ordering matters: P0 unblocks everything else and makes the rest testable. Finding numbers (#N) reference [FINDINGS.md](FINDINGS.md).

A blunt summary of the situation: the teacher portal currently does not load (P0-1), and even if it did, ~40% of its endpoints would crash (P0-2). Most of what's left shows fabricated data or loses data silently. None of this is visible because errors are swallowed into empty states. So the work is less "polish the UI" and more "make the wires connect, then stop lying to the user."

---

## P0 — Unblock (nothing works until these land)

These are small, high-leverage, and gate all testing. Do them first, in this order.

### P0-1. Mount `SchoolContextProvider` (or make the hook degrade) — #97 `✓✓ confirmed`
The dashboard white-screens on mount because `TeacherDashboard.js:183` calls `useSchoolContext()` with no provider, outside the ErrorBoundary.
- **File:** `src/components/teacher/TeacherDashboard.js:477-484` — wrap the provider stack with `<SchoolContextProvider>`.
- **Or:** `src/hooks/useSchoolContext.js:70-75` — return `{}` instead of throwing when context is null.
- **Verify:** actually log in as a teacher and load the dashboard in a browser.

### P0-2. Import the ~14 missing models — #106 `✓✓ confirmed`
`teacherController.js` calls `Message`, `OfficeHour`, `BehaviourIncident`, `LessonPlan`, `PeerReview`, `SpotlightStudent`, `LearningResource`, `ChannelPreference`, `WhistleblowerReport`, `WhistleblowerCategory`, `SecurityAuditLog` (+ `Attendance`/`ModificationRequest` outside their inline requires) without importing them.
- **File:** `backend_node/src/controllers/teacherController.js:1-17` — add the missing `require('../models/...')` lines (and remove the redundant inline requires at `:531/572/651`).
- **Verify:** a smoke test that hits each teacher GET endpoint once and asserts no 500 / no ReferenceError in logs.

### P0-3. Stop swallowing errors into empty success — #112
Until this changes, you can't tell "broken" from "empty" while fixing everything else.
- **File:** `backend_node/src/controllers/teacherController.js` — the ~25 catch blocks that `return successResponse({items:[]})`. Return a real 500 (or `{success:false, error}`) on unexpected failure; keep empty-array success only for genuinely-empty results.
- **File:** `src/api/teacherApi.js` — stop normalizing non-OK responses to `{items:[]}`; surface an error the UI can render as an error state.

**Exit criteria for P0:** the dashboard loads, every endpoint returns without crashing, and failures show as errors rather than empty lists.

---

## P1 — Stop lying / stop losing data (trust + data integrity)

This product's pitch is grade integrity. Right now the trust-core actions lose data and show green success. Fix that before anything cosmetic.

### P1-1. Real grade lock + persistence — #15 / #16 / #17 / #107
- Send the full per-student scores array from `submitGradesForLocking` (`src/api/teacherApi.js:49-57`), or have the controller lock the existing draft rows.
- Add `is_locked / locked_at / locked_by` (+ a signed ledger entry) to `backend_node/src/models/Grade.js`; set them on lock; refuse edits to locked grades in `saveGradeDraft`.
- Build a real GradeReceipt (batch id, count, content hash, chain position, signature), persist on lock, return it, and **mount `GradeReceiptModal`** after success.
- Fix `GradeEntryRow`/`GradeEntry` to stop dereferencing `student.currentGrade` unguarded (#14).
- ⚠️ **Prod migration required** — new Grade columns + a GradeReceipt table. Per project memory, prod sync is OFF; add the manual SQL to the pending-migrations doc.

### P1-2. Attendance persistence — #42
- `backend_node/src/controllers/teacherController.js:577-583` — add `school_id: teacher.school_id`, map `notes`→`remarks`, use a real conflict key (`student_id+classroom_id+date`).
- `src/components/teacher/TeacherAttendance.js:94-126` — only `setSubmitted(true)` on `res.ok && data.success`; show an error banner otherwise.

### P1-3. Exam-result mapping + stop clobbering term grades — #30 / #35
- `backend_node/src/controllers/teacherController.js:2205-2238` — read `r.marks`; persist against an ExamResult model keyed by `exam_id+student_id`, NOT a blind upsert on the term Grade (which nulls existing CA/midterm).
- Return a real `exam` object + per-student `student_name`/`marks` from `getExamResults`/`getTeacherExams`.

### P1-4. Real `gradeStats` — #2 / #20
- `backend_node/src/controllers/teacherController.js:127` (`getTeacherclasses`) — compute per-class `{total, locked, draft, pending}` and `studentCount` from real Grade/Student counts. Kills the `{0,0,0,0}` across Home, My Classes, and Grade Completion at once.

### P1-5. Remove every dishonest success toast
Each of these tells the user something worked when it didn't. Either back it for real or remove the affordance:
- Counsellor referral (#43) — **safeguarding risk**, prioritize.
- Resource file upload (#44) — add multer.
- Substitute Mode (#84/#114).
- Channel Preferences "Saved" (#88).
- Settings notification toggles (#91) + data exports (#92).
- `generateTimetable` "submitted for review" (#78/#117).
- Mod-request withdraw optimistic flip (#33/#39).
- "Grades permanently locked" wording (#26) — fix once real locking lands.

---

## P2 — Security (IDOR / tenant / auth)

### P2-1. Close the cross-tenant grade-history IDOR — #108 `highest security severity`
- `backend_node/src/controllers/teacherController.js:2345-2358` — load the teacher, scope by `school_id`, verify the student's `classroom_id` is the teacher's.

### P2-2. Add class/subject ownership checks — #9 / #23 / #36 / #80 / #113
- Gradebook, lock, exam-results, students, live-classes: verify the teacher is assigned to the class/subject before any read/write. Scope `saveGradeDraft` by `student+subject+term+classroom`.

### P2-3. Whistleblower anonymity — #85 / #94
- Submit without the Authorization header via a public endpoint that takes an explicit `school_id` and stores no actor; fix the `{title,description,category_id,severity}` payload; map `follow_up_key`. Stop auto-saving the disclosure to localStorage. Remove the "we do not log identity" copy unless it's genuinely true.

### P2-4. Tighten `isTeacher` + thread/message ownership — #111 / #64
- Make cross-role access explicit (impersonation) and still resolve an effective teacher/school scope; validate `recipient_id` belongs to the teacher's students/guardians before `Message.create`.

---

## P3 — Contract drift (make features return real data)

This is the largest bucket by count but mostly mechanical once P0/P1 are done. The fix is the same shape every time: **make the component read what the controller emits, and the controller accept what the component sends.** Strongly recommend pairing this with an `api-spec.md` and integration smoke tests so it can't silently regress.

Reads that render blank (align field names / unwrap the response):
- Academic History `history` vs `grades` (#3), Report Cards shape (#4/#31), Recent Activity (#5), Grade History `entries` vs `gradebook` (#22), Mod-request list (#32), Exam Duties (#34), Assignment list (#38), Feedback list/thread (#56/#57), Student/Parent threads (#59/#60), Office Hours list (#61), Announcements list (#66), Notifications fields (#68), Peer review read (#75), Workload day-buckets (#76), Performance trend (#79), Where I've Been (#89), Channel Prefs matrix (#88), Live Classes fields (#72).

Writes that 400 (fix the payload / param):
- Submit mod-request (#29), Create assignment camelCase (#37), Send feedback (#58), Send student/parent message (#59/#60), Publish office hour (#61), Send announcement (#63), Lesson plan save (#73), Peer review submit (#74).

Routing/method bugs:
- Office-hour delete `:slotId` vs `id` (#62), Withdraw mod-request (#33/#109), Verify route unmounted (#87), Live Classes wired to student controller (#71), report-card alias `student.User` (#115), report-card `req.query` vs `req.params` (#28).

---

## P4 — UX, dead code, responsiveness

### P4-1. Remove/relabel dead surfaces
- Orphan components never mounted: `QrAttendanceScanner` (#45), `GradeReceiptModal`/`LockPreviewPane`/`StructuredGradeInput` (#17) — mount or delete.
- "Old feedback" label + 4 overlapping message UIs (#67/#101) — consolidate.
- Dead theme toggle (#99) + stale `[data-theme='light']` CSS (#103).
- Inert i18n scaffolding (#100).
- Endpoints with no UI: `recommendResource` (#54), `voiceDigest` (#83).
- Display-only 2FA CTA (#95), fake "Export PDF" (#52), dead roster QR (#90).

### P4-2. Routing/shell polish
- Add a `popstate` listener so Back/Forward sync the section (#98).
- Track viewport width in state rather than reading `window.innerWidth` in render (#105).
- Theme-agnostic ErrorBoundary fallback (#104).

### P4-3. Mobile responsiveness (standing project mandate: 600/400/360 + ≥44px)
Files with zero or insufficient media queries:
- Zero: `TeacherNotifications.css`, `CounsellorReferralModal.css`, `QrAttendanceScanner.css`, `GradeHistoryScreen.css`, `GradeAuditPanel.css`, `LockPreviewPane.css`.
- Missing 400/360 tiers: most grade CSS, `MessagesScreen.css`, `MyStudents.css`, bottom nav.
- Sub-44px touch targets: `MyClasses.css` ghost buttons (#11).
- Off-theme: `ExamDuties.css` (#40).

---

## Suggested sequencing

| Sprint | Focus | Findings |
|--------|-------|----------|
| 0 (days) | P0 unblock | #97, #106, #112 |
| 1 | P1 trust + data loss | #15/#16/#17, #42, #30, #2/#20, #43, #44 |
| 2 | P2 security | #108, #23/#36/#113, #85, #111/#64 |
| 3-4 | P3 contract drift (batch by screen) | the read/write/routing lists above |
| 5 | P4 UX + responsiveness | dead code, popstate, mobile CSS |

## One process change worth more than any single fix

Every defect in P3 (the biggest bucket) exists because the frontend and backend were built against an imagined contract, never an agreed one, and nothing tested the seam. Before re-building, write `api-spec.md` for the teacher endpoints (request + response shapes), generate or hand-write a thin typed client, and add one integration smoke test per endpoint that asserts the real shape. That seam test would have caught roughly 60 of these 120 findings on the first run.
