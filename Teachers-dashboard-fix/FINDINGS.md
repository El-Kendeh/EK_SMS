# Teacher Dashboard — Full Findings

All 120 findings, grouped by feature area. Severity is the **corrected** severity after verification where available. Badges: `✓ VERIFIED` · `✓✓ VERIFIED BY CLAUDE` · `~ PARTIAL` · `✗ REFUTED` · `⚠ UNVERIFIED` (see [README](README.md) for what each means).

Locations use `frontend = EK_SMS/src/...`, `backend = EK_SMS/backend_node/src/...`.

---

## Area 1 — Home, My Classes & My Students  ✅ verification pass completed (12 confirmed / 1 partial / 0 refuted)

**Summary:** Looks polished, mostly non-functional. `getTeacherClasses` returns `gradeStats` hardcoded to `{0,0,0,0}` and no `studentCount`, and nothing re-hydrates it — so every home stat card, progress bar, status badge, and quick-action reads zero. Opening any student profile crashes. Two of the profile drawer's three tabs are dead on shape mismatch. Only the My Students roster is genuinely real.

### [CRITICAL] 1. Opening a student profile crashes — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/StudentProfileDrawer.js:17,66-67,96-123`; `MyStudents.js:147`; `hooks/useTeacherStudents.js:22-34`
- **Problem:** `MyStudents` passes the raw row to the drawer. `useTeacherStudents` builds rows with only `id/fullName/firstName/lastName/studentNumber/email/classId/className/subjectName`. The drawer does `const grade = student.currentGrade;` then reads `grade.score` unguarded → `TypeError: Cannot read properties of undefined`. It also reads `student.initials/avatarColor/gender`, none of which exist.
- **Impact:** Clicking "Profile" on any student throws a render error (white screen / ErrorBoundary). The primary drill-down on My Students is unusable.
- **Fix:** Compute `currentGrade/initials/avatarColor/gender` in `useTeacherStudents`, or guard every field in the drawer (optional chaining + fallbacks) and fetch the grade inside the drawer.

### [HIGH] 2. All class grade stats hardcoded to zero — `✓ VERIFIED` (was critical → high: cosmetic, not a crash)
- **Where:** `backend/controllers/teacherController.js:127`; `frontend/components/teacher/TeacherHome.js:86-132`; `MyClasses.js:51-120`; `context/TeacherContext.js:92-99`
- **Problem:** `getTeacherClasses()` builds every class with `gradeStats: {total:0,locked:0,draft:0,pending:0}` and never computes them. Nothing re-hydrates it. Home's four stat cards, `pendingCounts`, the deadline banner, the "Lock drafts"/"Enter grades" quick actions, and My Classes progress bars/badges all derive from those zeros.
- **Impact:** A teacher with real grades sees 0 pending / 0 draft / 0 locked, empty progress bars, and a "No Students" badge on every class. None of the grade-deadline nudges ever appear.
- **Fix:** Compute `gradeStats` per class in `getTeacherClasses` (count Grade rows by state + students per `classroom_id`), or add a stats endpoint. Until then, hide the cards rather than show fabricated zeros.

### [HIGH] 3. Academic History tab always empty — `✓ VERIFIED`
- **Where:** `backend/controllers/teacherController.js:2345-2358`; `frontend/api/teacherApi.js:248-254`; `StudentProfileDrawer.js:27-30,141-176`
- **Problem:** `getStudentGradeHistory` returns `successResponse({ grades })` (flat rows). The API reads `data.history` and the drawer reads `data.history` — no such key, so always `[]`. The drawer also expects term-grouped objects; the controller returns flat ungrouped rows.
- **Impact:** Every student's Academic History tab shows "No grade history available" even when grades exist.
- **Fix:** Group grades by term server-side and emit under a `history` key with the shape the drawer renders, or change the API/drawer to read `grades`.

### [HIGH] 4. Report Cards tab always errors (400) + shape mismatch — `✓ VERIFIED`
- **Where:** `backend/routes/teacher.js:164`; `controllers/teacherController.js:2360-2400`; `frontend/api/teacherApi.js:257-263`; `StudentProfileDrawer.js:32-37,193-224`
- **Problem:** Route binds `:studentId` (path) but the controller reads `req.query.student_id` and 400s when absent → always 400. Even past that, the controller returns per-subject grade rows while the drawer expects report-card documents (`average_score/class_rank/is_published/pdf_url`). Bug at :2396 reads `student.User` (capital) vs the lowercased `user` alias.
- **Impact:** Report Cards tab always falls into the catch → "No published report cards". No working path to view a report card.
- **Fix:** Read `studentId` from `req.params`; return real ReportCard records (or honestly render per-subject grades); fix `student.User` → `student.user`.

### [HIGH] 5. Recent Student Activity renders against the wrong shape — `✓ VERIFIED`
- **Where:** `backend/controllers/teacherController.js:701-735`; `frontend/components/teacher/TeacherHome.js:59-61,506-527`
- **Problem:** `getTeacherStudentActivity` returns `{type,label,count,icon}` with `type` values `grades/attendance/messages`. The UI reads `item.id/studentName/detail/time` and `ACTIVITY_ICONS[item.type]` keyed `grade_viewed/parent_notified/...` — all undefined.
- **Impact:** If any count is non-zero the card shows blank names, blank details, generic icons, and "Invalid Date".
- **Fix:** Return real activity events `{id,type(matching icons),studentName,detail,time}`, or rewrite the card to render the count summaries the controller produces.

### [HIGH] 6. Today's attendance widget fabricates zeros + a 70% at-risk rate — `✓ VERIFIED`
- **Where:** `backend/controllers/teacherController.js:541-555`; `frontend/components/teacher/TeacherHome.js:340-394`
- **Problem:** `getTeacherAttendanceStatus` hardcodes `taken:false, total_students:0, present_count:0` per class and `att_rate:70` per at-risk row.
- **Impact:** Every class reads "not taken" with a "Mark" button even after attendance is recorded; the at-risk list shows a fake uniform 70% for everyone.
- **Fix:** Query the Attendance table for today per class; compute real per-student attendance percentages.

### [MEDIUM] 7. My Classes shows "undefined students" — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/MyClasses.js:85`; `backend/controllers/teacherController.js:113-129`
- **Problem:** UI renders `{cls.studentCount} students`; the formatted backend object has no `studentCount` field.
- **Impact:** Every class card shows the literal text "undefined students".
- **Fix:** Return `studentCount` (COUNT of active students per `classroom_id`) or fall back to 0 in the UI.

### [MEDIUM] 8. My Classes crashes when a class has no subject — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/MyClasses.js:18-21,74-79`; `backend/controllers/teacherController.js:125`
- **Problem:** Backend sets `subject: subjects[0] || null`. `MyClasses` reads `c.subject.name`, `cls.subject.category/code/name` with no null guard.
- **Impact:** A class with no linked subject makes the whole My Classes page throw and render nothing.
- **Fix:** Guard subject access (optional chaining + fallback label), mirroring `TeacherHome`.

### [MEDIUM] 9. `getTeacherStudents` trusts client `class_id` with no ownership check (IDOR) — `✓ VERIFIED`
- **Where:** `backend/controllers/teacherController.js:138-167`
- **Problem:** Filters by `classroom_id: class_id` + `school_id` only; never checks the class belongs to the teacher (`class_teacher_id === teacher.id`).
- **Impact:** A teacher can enumerate rosters (names, admission numbers, emails) of classes they don't teach within their school.
- **Fix:** Verify `class_id` is owned by the teacher before returning students; 403 otherwise.

### [MEDIUM] 10. My Students table has no mobile layout — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/MyStudents.css:1-10`; `MyStudents.js:93-158`
- **Problem:** Only `.mys-controls` has a single `max-width:600` rule; the 5-column data table has no card-stack and no 400/360 rules — relies on horizontal scroll.
- **Impact:** On phones the roster needs awkward sideways scrolling; columns cramped.
- **Fix:** Add a ≤600px card-stack (or hide low-priority columns) + 400/360 refinements.

### [LOW] 11. Class-card icon buttons are 40px (below 44px touch min) — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/MyClasses.css:72-78`; `MyClasses.js:133-153`
- **Problem:** `.tch-btn--ghost { width:40px; height:40px }` with no touch-breakpoint override.
- **Impact:** Secondary actions slightly harder to tap on touch devices.
- **Fix:** Bump to ≥44px on touch breakpoints.

### [LOW] 12. Academic Calendar strip is term-boundary only + mislabels event types — `✓ VERIFIED`
- **Where:** `backend/controllers/teacherController.js:674-699`; `frontend/components/teacher/TeacherHome.js:72-80,240-271`
- **Problem:** `getAcademicCalendar` emits only `term_start/term_end`. `CAL_EVENT_ICONS` define exam/holiday/deadline types the backend never produces. Note: `TeacherHome` calls `/api/school/academic-calendar/` which has **no route** (only the teacher route exists) → strip is likely always empty.
- **Impact:** "Upcoming Dates" shows only term boundaries (or nothing); the richer styling is dead code.
- **Fix:** Point at the real calendar endpoint and return exams/holidays/deadlines, or relabel to "Term Dates".

### [LOW] 13. Hardcoded `twoFactorEnabled:false` + inconsistent at-risk copy — `~ PARTIAL`
- **Where:** `backend/controllers/teacherController.js:75`; `frontend/components/teacher/TeacherHome.js:156-166,446-453`
- **Problem:** Controller hardcodes `twoFactorEnabled:false` and emits no `has_2fa`. The banner keys on `profile.has_2fa===false`, so it **never shows** (verifier correction: the opposite of a "permanent nag"). The at-risk card says "below 60%" while the backend buckets `<40/<60` — copy/threshold mismatch is real.
- **Impact:** 2FA state shown isn't real; at-risk wording may not match actual cutoffs.
- **Fix:** Return real 2FA state; align at-risk threshold copy with backend buckets.

---

## Area 2 — Grade Entry, Locking, History, Completion & Receipts  ✅ verification pass completed (14 confirmed / 0 refuted)

**Summary:** The trust-critical area, and the most broken. Grade Entry crashes on any class with students. Submit & Lock persists nothing yet shows success. There is no `is_locked`/`verification_hash`/`chain_position` anywhere — the "permanent lock + cryptographic receipt" promise is unbacked. None of the features complete a real persisted round-trip.

### [CRITICAL] 14. Grade Entry table crashes — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/GradeEntryRow.js:22-23,57-67`; `hooks/useGradeEntry.js:21-39`; `backend/controllers/teacherController.js:152-163`
- **Problem:** `getTeacherStudents` returns `{id,admission_number,first_name,last_name,full_name,email,gender,status}`. The hook passes these straight to `GradeEntryRow`, which runs `const grade = student.currentGrade; const isLocked = grade.status` with no optional chaining → TypeError. Also reads `student.avatarColor/initials/fullName/studentNumber`. `GradeEntry.js:87` reads `s.currentGrade.status` too.
- **Impact:** Selecting any class with students white-screens the Grade Entry screen — the primary feature of the area.
- **Fix:** Return a real gradebook shape with `currentGrade{score,status,gradeLetter,...}` per student, or map in the hook and guard the row.

### [CRITICAL] 15. Submit & Lock persists nothing — frontend omits the grades payload — `✓ VERIFIED`
- **Where:** `frontend/api/teacherApi.js:49-57`; `hooks/useGradeEntry.js:75-84`; `backend/controllers/teacherController.js:296-389`
- **Problem:** `submitGradesForLocking` POSTs only `{student_ids, subject_id, term_id}` — scores are dropped. The controller does `const score = parseFloat(gradeData.score || gradeData.total); if (isNaN(score)) continue;`. With `grades` undefined, score is NaN for every student → `count` stays 0. The banner then claims "N grades permanently locked" from `result.locked` (also undefined).
- **Impact:** Teacher checks the box, clicks Lock, sees green "grades permanently locked" — but nothing was written or locked. Silent total data loss on the trust-core action.
- **Fix:** Send the full per-student grades array; reject NaN with an error instead of skipping; return `{locked, receipt}`.

### [CRITICAL] 16. Grade "locking" is not modeled — no `is_locked`/`verification_hash`/`chain_position` — `✓ VERIFIED`
- **Where:** `backend/models/Grade.js:5-25`; `controllers/teacherController.js:334-352`
- **Problem:** The Grade model has no lock/hash/chain fields (grep over models confirms). `submitGradesForLocking` only sets `approval_status:'pending'`. The UI treats `grade.status==='locked'` as immutable and tells the teacher it's "PERMANENT and IRREVERSIBLE".
- **Impact:** The product's central guarantee (permanent, tamper-evident locks) does not exist in the data layer. A "locked" grade is indistinguishable from a draft and can be overwritten by the next `saveGradeDraft`.
- **Fix:** Add `is_locked/locked_at/locked_by` (+ a real signed ledger entry); set `is_locked=true` on lock; refuse edits to locked grades.

### [CRITICAL] 17. Cryptographic receipt is fake/absent + never mounted — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/GradeReceiptModal.js:11,39-42`; `api/teacherApi.js:607-619`; `backend/controllers/teacherController.js:1861-1895`
- **Problem:** The modal renders `verificationHash/chainPosition/count/submittedAt` and a `/verify/<hash>` QR. `getGradeReceipt` returns `{id,subject,term,ca,midterm,final,total,grade_letter,approval_status,approved_at}` — none of those fields. `submitGradesAndReceipt` always sets `receipt:null`. `GradeReceiptModal/LockPreviewPane/StructuredGradeInput` are imported nowhere except themselves — never rendered.
- **Impact:** The "defensible cryptographic proof" doesn't exist; even if mounted it would print a blank hash, blank chain position, and a QR to an unverifiable hash.
- **Fix:** Build a real GradeReceipt model (batch id, count, content hash, chain position, signature), generate/persist on lock, return it, and actually mount the modal after a successful lock.

### [HIGH] 18. Grade audit trail always empty/broken — wrong unwrap + wrong event shape — `✓ VERIFIED`
- **Where:** `frontend/hooks/useGradeHistory.js:13-14`; `components/teacher/GradeAuditPanel.js:81-108`; `backend/controllers/teacherController.js:397-435`; `routes/teacher.js:123`
- **Problem:** `useGradeHistory` does `setHistory(data || [])` where `data` is the whole `{success,history:[…]}` object, so `history.map` throws/never iterates. The panel reads `event.eventType/recordedBy/...` but the controller returns grade-summary fields. The route is `/grades/:id/history/` but the controller ignores `req.params.id` and filters by `req.query.student_id` (never sent) → would return the teacher's last 50 grades, not that grade's timeline.
- **Impact:** Clicking the history/Trail button shows "No history" or errors — the auditability selling point never works.
- **Fix:** Read `req.params.id`, query the GradeEvent ledger, return the event shape the panel expects; `setHistory(data.history || data.events || [])`.

### [HIGH] 19. Grading scheme never loads — api unwraps non-existent `data.scheme` — `✓ VERIFIED`
- **Where:** `frontend/api/teacherApi.js:73-78`; `components/teacher/GradeEntry.js:49-56`; `hooks/useGradeEntry.js:69-73`; `backend/controllers/schoolController.js:1556-1577`
- **Problem:** `getGradingScheme` returns `data.success ? data.scheme : null`, but the endpoint responds `{success,pass_mark,boundaries}` with no `scheme` key → always null. Even keyed, the UI expects `boundaries[]` of `{letter,min,max,color}` + `passMark`; the backend stores `boundaries` as a JSON string and field `pass_mark`.
- **Impact:** The grading-scheme card never renders and `getComputedGradeLetter` always returns null — no grade letter shows next to a score.
- **Fix:** Return `{scheme:{boundaries:[{letter,min,max,color}],passMark}}` (or normalize in the api method).

### [HIGH] 20. Grade Completion screen shows hardcoded zeros — `✓ VERIFIED`
- **Where:** `backend/controllers/teacherController.js:127`; `frontend/components/teacher/GradeCompletionScreen.js:30-44`
- **Problem:** Same `gradeStats {0,0,0,0}` stub. The screen derives every card, the per-class table, and overall completion % from it.
- **Impact:** Every teacher sees 0 students, 0% completion, empty draft/pending — the page is decorative.
- **Fix:** Compute real `gradeStats` per class+subject+active term.

### [HIGH] 21. Bulk "Lock N" submits placeholder rows with null studentIds — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/GradeCompletionScreen.js:46-61`
- **Problem:** `handleBulkLock` builds `Array.from({length: cls.draft}, () => ({studentId:null}))`. The api maps `studentId→student_ids` and filters Boolean → empty array; backend 400s or locks nothing.
- **Impact:** "Lock 5" does nothing real; the row may flip to a fake "Locked" badge while nothing was locked.
- **Fix:** Fetch the actual draft student ids+scores and submit those, or remove the affordance until backed.

### [HIGH] 22. GradeHistoryScreen reads `data.entries`; endpoint returns `{gradebook:[…]}` — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/GradeHistoryScreen.js:29-53`; `backend/controllers/teacherController.js:201-217`
- **Problem:** The screen reads `data.entries` + `data.students`; `getTeacherGradebook` returns `{success,message,gradebook:[…]}` — no `entries`/`students` keys.
- **Impact:** Grade History permanently shows "No grades have been entered yet"; filter counts all 0.
- **Fix:** Read `data.gradebook` and map its fields, or change the endpoint to the shape this screen expects.

### [HIGH] 23. No ownership scoping — a teacher can read/lock/overwrite any student's grades school-wide — `✓ VERIFIED`
- **Where:** `backend/controllers/teacherController.js:180-196, 232-234, 354-356, 407-415, 1867`
- **Problem:** Gradebook/saveGradeDraft/lock/history/receipt scope only by `teacher.school_id` with no class/subject assignment check. `saveGradeDraft` finds a Grade by `student_id + school_id` alone (no subject/term/classroom).
- **Impact:** Any teacher can enter/lock/overwrite grades for students they don't teach and read others' grade records, same-school.
- **Fix:** Verify assignment to (class_id, subject_id) before any read/write; scope `saveGradeDraft` by student+subject+term+classroom.

### [MEDIUM] 24. Auto-save sends a `score` field the model can't store + swallows failures — `✓ VERIFIED`
- **Where:** `frontend/hooks/useGradeEntry.js:49-67`; `backend/controllers/teacherController.js:224-294`
- **Problem:** Auto-saves `{field:'score', value}`; `saveGradeDraft` only handles `ca/midterm/final` for total and writes `score` as a literal column absent from the Grade model. The catch only sets `autoSaveStatus='error'` — no retry, no surfaced detail; the local edit stays, giving false confidence.
- **Impact:** Single-input scores may never become a usable total; on a 500 the teacher sees a small pill but the value remains and they navigate away, losing it.
- **Fix:** Map `score`→`total`/component; keep the row dirty on error with inline retry; block lock/submit until drafts confirm persisted.

### [MEDIUM] 25. Three grade CSS files have zero media queries; none meet 400/360 — `✓ VERIFIED`
- **Where:** `GradeHistoryScreen.css`, `GradeAuditPanel.css`, `LockPreviewPane.css` (0 each); + `GradeEntry/GradeEntryRow/StructuredGradeInput/GradeCompletionScreen/GradeReceiptModal/SubmitConfirmModal/TamperCounter` (no 400/360)
- **Problem:** Wide multi-column grade tables with no mobile layout; others have at most a single 600px block.
- **Impact:** On phones the grade tables, audit drawer, and lock-preview pane overflow with sub-44px targets.
- **Fix:** Add 600/400/360 rules per the mandate: stack/scroll tables, full-width drawers, ≥44px targets.

### [MEDIUM] 26. "Permanently lock" label vs real "submit for review" action — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/SubmitConfirmModal.js:43-48,80-83`; `backend/controllers/teacherController.js:346,389`
- **Problem:** The modal says "PERMANENT and IRREVERSIBLE"; the backend sets `approval_status:'pending'` and messages "submitted successfully" — nothing is locked.
- **Impact:** Teachers told an action is irreversible when it's a reversible "submit for approval" — false mental model, undue anxiety.
- **Fix:** Make the copy match reality (implement real locking, or relabel as "Submit for approval" + describe principal review).

### [LOW] 27. Tamper counter rests on unverified ForensicEvent heuristics — `✓ VERIFIED`
- **Where:** `backend/controllers/teacherController.js:854-871`; `frontend/components/teacher/TamperCounter.js:9-17`
- **Problem:** Counts ForensicEvent rows by `actor` for total and `(resolved,high)` for "blocked", then `successful = total - blocked`. No link to actual grade-modification attempts.
- **Impact:** The widget can show alarming "successful tamper" counts (or always 0) unrelated to real blocked attempts — an untrustworthy trust signal.
- **Fix:** Drive it from real grade-modification-attempt audit events tied to this teacher's grades.

---

## Area 3 — Assignments, Exam Results, Exam Duties, Modification Requests, Report Cards  ✅ verification pass completed (13 confirmed / 1 refuted)

**Summary:** A facade. Five polished screens, almost every read/write broken at the contract boundary. Report Cards always 400s. Exam Results reads and writes the wrong shape and can destroy existing grades. Modification Requests is broken end to end (submit, list, withdraw). Exam Duties crashes. Assignments mostly works except the create payload drops type and class.

### [CRITICAL] 28. Report Cards never load — id in path, controller reads query (always 400) — `✓ VERIFIED`
- **Where:** `frontend/api/teacherApi.js:257-263`; `backend/routes/teacher.js:164`; `controllers/teacherController.js:2365-2366`
- **Problem:** Route binds `:studentId`; controller reads `req.query.student_id` and 400s. teacherApi swallows non-OK → empty state for every student. (Same defect as #4, from the assessments lens.)
- **Impact:** Report Cards always shows "No published report cards" regardless of data — 100% non-functional.
- **Fix:** Read `req.params.studentId`; align param names across route + controller.

### [CRITICAL] 29. Submit Modification Request always fails — missing `request_type`, wrong field names — `✓ VERIFIED`
- **Where:** `frontend/api/teacherApi.js:85-105`; `components/teacher/ModificationsPage.js:114-119`; `backend/controllers/teacherController.js:1979-1995`
- **Problem:** Frontend sends `{grade_id, proposed_score, reason}` (or FormData). Controller requires `request_type` + `reason` (400 otherwise), stores from `requested_value` (always ''), never reads `student_id/subject_id`, and never stores the uploaded `evidence_file` (no multer).
- **Impact:** Every modification submit returns "request_type and reason are required". The flagship grade-correction workflow is unusable.
- **Fix:** Align the contract (send `request_type/student_id/subject_id/current_value/requested_value`; accept `proposed_score/grade_id`; add multer for evidence).

### [CRITICAL] 30. Save Exam Results writes garbage + can destroy existing term grades — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/ExamResultsScreen.js:74-97`; `backend/controllers/teacherController.js:2205-2238`
- **Problem:** Frontend sends `[{student_id, marks, remarks}]`. Controller writes `final: r.score || r.total` (both undefined → null) and blind-upserts a term Grade on conflict key `['school_id','student_id','subject_id','term_id']`, clobbering existing CA/midterm to null. Exam marks aren't stored as exam marks.
- **Impact:** Teacher types marks, sees "Results saved successfully", but nothing saves — and worse, the upsert can null out the student's existing locked-term components. Real grade data silently destroyed while the UI claims success.
- **Fix:** Map `marks` to the right column; persist against an ExamResult model keyed by `exam_id+student_id` (not the term Grade); never blind-upsert over other components.

### [HIGH] 31. Report Cards screen expects documents; API returns raw grade rows + no PDF — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/ReportCardsScreen.js:154-216`; `backend/controllers/teacherController.js:2384-2399`
- **Problem:** UI renders `rc.id/term/academic_year/average_score/class_rank/class_size/published_at/is_published/pdf_url/qr_code`; controller maps `{subject,term,ca,midterm,final,total,grade_letter,remarks}` — none match, no `id` (breaks React key), no PDF. No report-card generation exists.
- **Impact:** Even with the 400 fixed, cards show blank term/rank/average, no PDF, perpetual "Draft" badge.
- **Fix:** Build a real ReportCard model/endpoint, or honestly render the per-subject breakdown and drop the PDF/QR affordances.

### [HIGH] 32. Modification request list renders blank fields — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/ModificationsPage.js:409-435`; `ModificationRequest.js:111-127`; `backend/controllers/teacherController.js:1952-1965`
- **Problem:** Controller returns `{student_name,subject_name,current_value,requested_value,...}`; UI reads `current_score/proposed_score/subject/review_reason/evidence_url` — all undefined.
- **Impact:** Existing requests show "undefined% → undefined%", no subject, no rejection reason, no evidence link.
- **Fix:** Pick one naming convention and map both sides.

### [HIGH] 33. Withdraw Modification Request is mis-routed AND reads a nonexistent param — `✓ VERIFIED`
- **Where:** `frontend/api/teacherApi.js:107-114`; `backend/routes/teacher.js:141-142`; `controllers/teacherController.js:2002-2017`
- **Problem:** Three defects: (1) teacherApi POSTs to `/modification-requests/` which routes to **submit**, not withdraw; (2) submit then 400s on missing `request_type`; (3) the real withdraw route `/modification-requests/withdraw/` has no `:id`, but the controller reads `req.params.id` → 404. The UI optimistically flips the row to "withdrawn", so the teacher believes it worked.
- **Impact:** Withdraw never succeeds server-side; on refresh the request is still pending — silent desync.
- **Fix:** Point at `POST /modification-requests/:id/withdraw/` (or pass `request_id` in body and read it); remove/gate the optimistic flip.

### [HIGH] 34. Exam Duties crashes/empties — maps a response object, reads missing fields — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/ExamDuties.js:11-39`; `api/teacherApi.js:318-324`; `backend/controllers/teacherController.js:501-512`
- **Problem:** `getExamDuties` returns the whole `{success,duties:[…]}` object; the component does `.then(setDuties)` then `.map` over the object. The controller returns `{exam_name,start_time,end_time,venue,status}`; the UI reads `d.exam/start/end/room/confirmed` — none exist; no `confirmed` field or confirm endpoint at all.
- **Impact:** Exam duties error out or render blank rows with a permanently "Pending" pill that can never be confirmed.
- **Fix:** Return `data.duties`; align field names; add a real confirm endpoint + `confirmed` column or drop the confirm copy.

### [HIGH] 35. Exam Results list + entry header show blank names/marks/totals — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/ExamResultsScreen.js:155-178,196-286`; `backend/controllers/teacherController.js:2147-2152,2185-2198`
- **Problem:** Exam list reads `exam.exam_type/classroom/subject/date/result_count/total_marks`; controller returns raw Exam rows with no joins/counts. Entry reads `data.exam.*` + `data.results[].student_name/marks`; controller returns `{results:[{student_id,subject,ca,...}],exam_name}` with no `exam` object/`student_name`/`marks`.
- **Impact:** Header shows missing title/total; roster shows no names and no existing marks. Combined with #30, exam entry is unusable.
- **Fix:** Join classroom/subject + compute counts; return a real `exam` object and per-student rows with `student_name`/`marks`.

### [HIGH] 36. Exam result entry has no class/subject ownership check — `✓ VERIFIED`
- **Where:** `backend/controllers/teacherController.js:2159-2176,2205-2236`
- **Problem:** `getExamResults/saveExamResults` scope only by `school_id`; no check the exam's classroom/subject is the teacher's.
- **Impact:** Any teacher can read and overwrite grades for any class/subject in their school — cross-class grade tampering.
- **Fix:** Constrain by the teacher's assigned classrooms/subjects before reading/upserting.

### [HIGH] 37. Create Assignment drops type and class (camelCase vs snake_case) — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/AssignmentsScreen.js:78-84`; `api/teacherApi.js:179-186`; `backend/controllers/teacherController.js:2099-2112`
- **Problem:** Frontend posts `{title,type,dueDate,classId,subjectId}`; controller destructures `{class_id,subject_id,title,description,due_date,max_score}`. `due_date` undefined → `if(!title||!due_date)` 400s every time; `type` never persisted.
- **Impact:** A valid title + due date still returns "title and due_date are required" — creation is broken.
- **Fix:** Send snake_case (`due_date/class_id/subject_id`); decide whether `type` needs a column.

### [MEDIUM] 38. Assignment list shows blank class/subject + wrong due-date field — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/AssignmentsScreen.js:255-298`; `backend/controllers/teacherController.js:2075-2085`
- **Problem:** UI reads `a.dueDate/className/subjectName/type/status/classId`; controller returns `due_date` + nested `class`/`subject` objects, no `type/status/classId`.
- **Impact:** "NaN d left" badges, empty class/subject chips, broken filters.
- **Fix:** Map controller output to the UI fields (or update the component to snake_case + nested objects).

### [MEDIUM] 39. Mod submit/withdraw optimistic UI silently diverges from server — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/ModificationsPage.js:138-147`; `ModificationRequest.js:73-82`
- **Problem:** `handleWithdraw` flips state only inside `if(result.success)` but the empty `catch {}` swallows errors; combined with the routing bug (#33) the user gets zero feedback.
- **Impact:** Withdraw fails (always), the spinner stops, nothing else — a confusing dead button.
- **Fix:** Surface catch errors; only update local state after confirmed server success.

### [LOW] 40. ExamDuties uses an off-theme dark palette + minimal responsive rules — `✓ VERIFIED`
- **Where:** `frontend/components/teacher/ExamDuties.css:1-23`
- **Problem:** Hardcodes a dark theme (`#e8eef9` text, `rgba(255,255,255,...)` surfaces, `#5b8cff`) unlike the light `--tch-*` system; only a 600px query, no 400/360, no touch sizing.
- **Impact:** If it renders, it looks like a different app (dark card on a light shell) and reflows awkwardly on small phones.
- **Fix:** Re-skin with shared `--tch-*` tokens; add 400/360 + ≥44px targets.

### [LOW] 41. ReportCards class filter compares `s.classId` — `✗ REFUTED`
- **Where:** `frontend/components/teacher/ReportCardsScreen.js:27-38,108`
- **Verifier note:** `useTeacherStudents.js:31-32` explicitly sets `classId:String(cls.id)` and `className:cls.name` on every student, so the filter and meta line resolve correctly. **Not a defect — do not action.**

---

## Area 4 — Attendance, Behaviour, Counsellor Referral, Resources, Class Analytics  ⚠️ UNVERIFIED (finder-only)

**Summary:** Polished, broken end-to-end in several places. Attendance always shows success even when the insert throws (missing `school_id`, wrong `notes`/`remarks` column) — silent data loss. The QR scanner is a fully-built orphan. Counsellor referral and resource file upload are stubs that flash success. Class Analytics' trend chart is permanently dead.

### [CRITICAL] 42. Attendance submit always shows success even when persistence fails — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherAttendance.js:94-126`; `backend/controllers/teacherController.js:577-583`
- **Problem:** `handleSubmit` sets `setSubmitted(true)` regardless of failure. The upsert writes `{student_id,classroom_id,date,status,notes}` but the Attendance model requires `school_id` (allowNull:false, never supplied) and has column `remarks` not `notes` → the insert throws/500, yet the UI shows "Attendance Submitted … logged to student records".
- **Impact:** A full register is taken, "logged" confirmation shown — nothing saves. Attendance silently vanishes every session.
- **Fix:** Add `school_id`, map `notes`→`remarks`, use a real conflict key; only `setSubmitted(true)` on `res.ok && data.success`; show an error banner otherwise.
- **Note:** Closely related to backend-integrity #84 (Attendance also used unimported in other handlers) and to the engagement summary. **Verify the model columns and submit path before fixing.**

### [CRITICAL] 43. Counsellor referral is a stub — no DB write, fake id, ignores notify_parent — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:1493-1500`; `frontend/components/teacher/CounsellorReferralModal.js:38-72`
- **Problem:** `referToCounsellor` returns `{referralId: 'REF-'+...}` and does nothing else — no model create, no counsellor queue, no parent notification; `student_id/reason/notify_parent` never read. The modal promises "the counsellor sees this in their queue" + optional parent notification.
- **Impact:** A teacher refers an at-risk student for pastoral support, gets a reference number — but no counsellor sees it and no parent is notified. A child-welfare action goes nowhere. **Safeguarding risk.**
- **Fix:** Persist a referral row, route to the counsellor role, trigger the parent notification, return the real id.

### [CRITICAL] 44. Resource file upload silently discards the file (no multer) — `⚠ UNVERIFIED`
- **Where:** `backend/routes/teacher.js:168` (no upload middleware); `controllers/teacherController.js:2445-2467`; `frontend/components/teacher/TeacherResources.js:86-93,119-120,181-183`
- **Problem:** Frontend sends multipart FormData with the file; the route has no multer; `uploadResource` only reads body text fields and never touches `req.file`. `file_path` defaults to '' and the binary is dropped. UI flashes "uploaded successfully — students can now access it".
- **Impact:** Uploaded PDFs/videos are never stored; students get a resource with no content. (Link-type resources do persist their url and are fine.)
- **Fix:** Add multer to `/resources/`; save the file; set `file_path/url` from `req.file`; return the resource.

### [HIGH] 45. QR Attendance Scanner is an orphan component — never rendered — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/QrAttendanceScanner.js:10`; no importer in `src`
- **Problem:** A full BarcodeDetector scanner exists but nothing imports it; `onMarkPresent` is wired to nothing; `TeacherAttendance` doesn't reference it.
- **Impact:** The QR-attendance feature is invisible and unreachable — dead code shipped as a feature.
- **Fix:** Mount it from `TeacherAttendance` (a "Scan IDs" button) and wire `onMarkPresent`, or remove it.

### [HIGH] 46. Behaviour incident filing broken by field-name mismatch (400) + missing title column — `⚠ UNVERIFIED`
- **Where:** `frontend/api/teacherApi.js:482-493`; `backend/controllers/teacherController.js:1299-1317`; `models/BehaviourIncident.js:4-20`
- **Problem:** API sends `type/severity/title/notes`; controller requires `incident_type` + `description` (400 otherwise). The model has no `title` column. `evidenceFiles` dropped (no multer).
- **Impact:** Filing an incident/commendation fails ("Could not file incident"). Behaviour logging (claimed to auto-notify parents + hit the audit trail) doesn't work.
- **Fix:** Align names (map `title`→a stored field or add a column); add multer; test create end-to-end.

### [HIGH] 47. Behaviour incident list renders fields the backend never returns — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/BehaviourIncidents.js:33,129-149`; `backend/controllers/teacherController.js:1274-1287`
- **Problem:** Controller returns `{id,student_id,incident_type,severity,description,created_at}`; UI reads `inc.type/title/notes/studentId/reportedAt`.
- **Impact:** Even a saved incident shows blank title, generic type, and "Invalid Date".
- **Fix:** Map fields in the controller or update the component.

### [HIGH] 48. Class Analytics "Performance Trend" chart is permanently dead — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/ClassAnalytics.js:61-71,206-249`; `backend/controllers/teacherController.js:2042-2049`
- **Problem:** The chart renders only when `trend.length > 1`, where `trend = analyticsResp.trend`. `getClassAnalytics` returns `{average,highest,lowest,pass_rate,total_students,term_id}` — no `trend` key. KPI cards are computed client-side from `getClassGrades`, so the analytics payload is otherwise unused.
- **Impact:** The term-over-term trend never renders.
- **Fix:** Return a `trend` array (per-term averages) or remove the dead chart; consider dropping the redundant analytics call.

### [MEDIUM] 49. `getAttendanceStatus` serves hardcoded placeholders (att_rate 70, taken:false) — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:541-554` (same code as #6/#84)
- **Fix:** Compute `taken/present_count/total_students` from today's Attendance rows; derive real att rates.

### [MEDIUM] 50. Attendance pre-fill reads the timetable endpoint, not attendance records — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherAttendance.js:48-66,101`
- **Problem:** Pre-fill calls `getTeacherTimetable()` and filters `attData.records` by date; the timetable returns `{periods:[…]}` with no `records`. Line 101 calls `getTeacherTimetable()` again as a no-op "POST attendance".
- **Impact:** Re-opening a marked class shows an empty register; teachers can't see/correct what was recorded and may double-submit.
- **Fix:** Call a real attendance-by-date endpoint to pre-fill; remove the stray timetable call.

### [MEDIUM] 51. CounsellorReferralModal + QrAttendanceScanner CSS have no responsive rules — `⚠ UNVERIFIED`
- **Where:** `CounsellorReferralModal.css` (0 media queries); `QrAttendanceScanner.css` (0)
- **Fix:** Add 600/400px rules; ≥44px targets; reflow the QR viewport/manual form.

### [MEDIUM] 52. "Export PDF Report" button is a fake — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/ClassAnalytics.js:145-148,161-166`
- **Problem:** `handleExport` just toggles "Exported!" for 3s via setTimeout — no PDF/print/download.
- **Fix:** Implement real export (client print-to-PDF or backend report), or relabel/remove.

### [LOW] 53. Attendance history tab is a permanent empty placeholder — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherAttendance.js:179-187`
- **Fix:** Wire the history tab to a real past-sessions endpoint (the `.ta-history-card` styles already exist).

### [LOW] 54. `recommendResource` endpoint exists but has no UI — `⚠ UNVERIFIED`
- **Where:** `frontend/api/teacherApi.js:541-546`; `backend/controllers/teacherController.js:1465-1490`; `TeacherResources.js` (no call)
- **Fix:** Add a "Recommend" action on resource cards, or drop the unused endpoint.

---

## Area 5 — Feedback, Student Threads, Parent Messages, Office Hours, Announcements, Notifications  ⚠️ UNVERIFIED (finder-only)

**Summary:** A polished facade over a broken contract. The Notifications bell is hardwired to a fake empty stub (never calls the real, working endpoint). Feedback/Student-threads/Parent-messages render blank and 400 on send. Office Hours publish 400s and the list crashes. Announcements partially works but drops subject/audience and shows school-wide rows mislabeled as the teacher's own. **Note: most of these handlers also hit the undefined-model ReferenceError (#83) — at runtime they likely return empty via the catch rather than the shapes described here. Both point to non-functional; fix #83 first, then these contract issues become testable.**

### [CRITICAL] 55. Notifications screen permanently empty — `getNotifications()` is a hardcoded stub — `⚠ UNVERIFIED`
- **Where:** `frontend/api/teacherApi.js:132-148`; `hooks/useTeacherNotifications.js:12`; `context/TeacherNotificationContext.js:15`; `backend/controllers/teacherController.js:737-766`; `routes/teacher.js:137`
- **Problem:** `getNotifications()` returns `{success:true,notifications:[]}` and never fetches; `markAllNotificationsRead()` is a no-op. Meanwhile a fully-implemented `getTeacherNotifications` (wired at `routes/teacher.js:137`) is never called.
- **Impact:** The bell, badge, security-alert strip, live toast, and Notifications page show "All caught up" forever. Teachers never see grade-lock, modification-attempt, or security alerts. The most trust-critical surface is dead.
- **Fix:** Point `getNotifications()` at `GET /api/teacher/notifications/`; implement real mark-read routes; map fields (see #68).

### [HIGH] 56. FeedbackScreen student list renders blank rows — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/FeedbackScreen.js:160-164,28`; `backend/controllers/teacherController.js:785-791`
- **Problem:** Controller returns `{id,full_name,admission_number,classroom_id,email}`; UI reads `s.name/className/unreadCount` and filters on `s.class_id`.
- **Impact:** Every row shows an empty name, no class, never an unread badge — unusable for picking a student.
- **Fix:** Align names; add a real server-side unread count.

### [HIGH] 57. FeedbackScreen thread shows ALL of a teacher's feedback (not the selected student) + no text — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/FeedbackScreen.js:38,40,220,230`; `backend/controllers/teacherController.js:800-826`
- **Problem:** `getFeedbackMessages` ignores `:studentId` and queries every message where `sender_id=teacher.id` (cap 50), returning `{subject,body,...}`. UI reads `m.message` + `m.sender`.
- **Impact:** Every student's thread shows the same global list of blank bubbles; direction is always "received".
- **Fix:** Scope by `recipient_id=req.params.studentId`; return both directions ordered ascending; emit `{message:body, sender:sender_type}`.

### [HIGH] 58. Sending feedback always 400s — UI posts `{message}`, controller requires `recipient_id`+`body` — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/FeedbackScreen.js:67`; `api/teacherApi.js:373-380`; `backend/controllers/teacherController.js:833-834`
- **Impact:** Every feedback message fails; the optimistic bubble is added then yanked back with "Message failed to send".
- **Fix:** Send `body` + `recipient_id` (from the URL `studentId`), or have the controller derive it from `req.params`.

### [HIGH] 59. TeacherStudentThreads non-functional — `{threads:[…]}` wrapper vs expected bare array — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherStudentThreads.js:19-21,35,42-44`; `backend/controllers/teacherController.js:1205-1229,1236-1242`
- **Problem:** `getStudentThreads` returns `{success,threads}` where each thread is `{id,subject,last_message,...}`. The component does `setThreads(list)` then `list[0].studentId` and renders `active.messages.map` / `t.studentName/classroom/unread`. `threads.map` throws. `sendStudentMessage` posts `{text}`; controller requires `recipient_id`+`body` → 400.
- **Impact:** The page blanks/errors; no names, no messages, replies can't send.
- **Fix:** Return an array of `{studentId,studentName,classroom,unread,messages:[…]}`; map `req.params.studentId`→`recipient_id`, `text`→`body`.

### [HIGH] 60. TeacherParentMessages non-functional — same shape/param mismatch — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherParentMessages.js:18-20,30,36-39,70-73`; `backend/controllers/teacherController.js:1131-1155,1167-1168`
- **Impact:** Parent threads never render; replies can't send; "logged in the audit trail" promise is hollow.
- **Fix:** Return `{childId,parentName,relationship,childName,unread,messages:[…]}`; resolve `recipient_id` from the child/parent link server-side.

### [HIGH] 61. Office Hours: publish always 400s + the slot list crashes the page — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherOfficeHours.js:28,35,47`; `api/teacherApi.js:434-444`; `backend/controllers/teacherController.js:1051-1061,1073-1074`
- **Problem:** Publish sends `{start,duration_min,room,subject,audience}`; controller requires `date/start_time/end_time` (400). `getMyOfficeHourSlots` returns `{slots}` (object); the component does `.reduce` on the wrapper → throws.
- **Impact:** The page errors on load and Publish silently 400s — no slots can be published or viewed.
- **Fix:** Return a bare array (or read `data.slots`) with the UI's fields; derive `start_time/end_time/date` server-side from `start`/`duration_min`.

### [HIGH] 62. Deleting an office-hour slot always 404s — route `:slotId` vs controller `req.params.id` — `⚠ UNVERIFIED`
- **Where:** `backend/routes/teacher.js:190`; `controllers/teacherController.js:1099-1104`
- **Fix:** Read `const { slotId } = req.params;` (or rename the route param to `:id`).

### [HIGH] 63. Announcements send drops subject + audience — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/MessagesScreen.js:49-53`; `api/teacherApi.js:229-236`; `backend/controllers/teacherController.js:2268-2275`
- **Problem:** UI sends `{subject,body,recipient_role}`; controller destructures `{title,message,type}` → `title=null, message=null, type='info'`; audience discarded.
- **Impact:** Announcements save with no subject/body/audience; on reload the list shows "(No subject)" cards (optimistic UI hides this live).
- **Fix:** Map `subject→title`, `body→message`, persist `recipient_role`; return the stored row.

### [HIGH] 64. Tenant/ownership gap — feedback/thread reads pull every school message by `teacher_id` without verifying ownership — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:805-809,1120-1129,1194-1203,2289-2296,836-845`
- **Problem:** Reads scope only by `school_id` + `sender_id/recipient_id=teacher.id`; sends create a Message to any client-supplied `recipient_id` with no ownership validation. Announcements/notifications return all school-wide rows.
- **Impact:** A teacher could message any student/parent in the school; announcement/notification surfaces leak school-wide rows.
- **Fix:** Validate `recipient_id` maps to the teacher's students/guardians before create; scope reads through the teacher's class/student set.

### [MEDIUM] 65. Feedback templates are hardcoded mock data + "add template" is a no-op — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:1440-1463`; `frontend/components/teacher/TeacherStudentThreads.js:28,87-90`
- **Problem:** Returns a fixed 4-item array; `addFeedbackTemplate` returns `{id:Date.now()}` and persists nothing. Also returns `{templates}` while the component does `setTemplates(...)` then `.slice` → toolbar never renders even the mock data.
- **Fix:** Back templates with a per-teacher table; return `data.templates` as an array.

### [MEDIUM] 66. Announcements list shows school-wide Notifications mislabeled as the teacher's own — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:2250-2256`; `frontend/components/teacher/MessagesScreen.js:36-38,214-239`
- **Problem:** `getAnnouncements` returns the last 20 school Notification rows with no sender filter; the Notification model has no `recipient_role/subject/body`, so UI reads undefined.
- **Fix:** Give announcements their own table/columns scoped to the teacher, or filter + map fields.

### [MEDIUM] 67. Four overlapping message UIs (one literally labeled "Old feedback") — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherDashboard.js:147-152`
- **Problem:** Community group has six near-duplicate entries; "Old feedback" (FeedbackScreen) sits next to "Student threads" (its 2-way upgrade) and "Announcements".
- **Impact:** Two competing feedback tools, one openly labeled "Old"; muddy mental model.
- **Fix:** Pick one feedback surface; remove/redirect "Old feedback"; rename to a clear taxonomy.

### [MEDIUM] 68. Even if wired, notification field names won't map — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:752-759`; `frontend/components/teacher/TeacherNotifications.js:21-27,113,123-127`; `hooks/useTeacherNotifications.js:33-34`
- **Problem:** Backend emits `{is_read,created_at,type}`; UI reads `isRead/createdAt/isSecurityAlert/title`.
- **Fix:** Normalize in the API layer/controller; derive `isSecurityAlert` from `type`.

### [MEDIUM] 69. TeacherNotifications.css has zero media queries (+ gaps in others) — `⚠ UNVERIFIED`
- **Where:** `TeacherNotifications.css` (0); `MessagesScreen.css` (only 600); `FeedbackScreen.css` (768/400 not 600); threads use 600/800/1080
- **Fix:** Add 600/400/360 blocks; ≥44px controls.

### [LOW] 70. FeedbackScreen optimistic send + class filter subtly broken — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/FeedbackScreen.js:63-79,89-93`
- **Problem:** Class filter compares `s.class_id` (backend sends `classroom_id`); failed sends flash a bubble in/out.
- **Fix:** Read `classroom_id`; gate the optimistic bubble on a real success id.

---

## Area 6 — Workload, Personal Performance, Peer Review, Lesson Plans, Live Classes, Timetable  ⚠️ UNVERIFIED (finder-only)

**Summary:** Timetable read is the only genuinely functional piece. Live Classes is wired to the **student** controller (404 for teachers). Lesson Plans and Peer Review submissions 400. Workload shows "No items" on every day. Personal Performance presents hardcoded constants (4.2/5, 3 days, 95%) as real metrics.

### [CRITICAL] 71. Live Classes wired to the STUDENT controller — listing 404s for every teacher — `⚠ UNVERIFIED`
- **Where:** `backend/routes/live-classes.js:4-16`; `controllers/studentController.js:2134-2166`; `frontend/api/teacherApi.js:634-657`; `components/teacher/LiveClasses.js:29-34`
- **Problem:** `live-classes.js` imports the handlers from `studentController`. `listLiveClasses` does `getStudentFromUser(req); if(!student) return 404`. A teacher has no Student row → always 404.
- **Impact:** Teachers see an error or empty list and can never view/manage sessions they create. Feature non-functional for its intended user.
- **Fix:** Create a teacher-scoped controller (or branch on role) resolving the Teacher row and filtering by `teacher_id`.

### [CRITICAL] 72. Live Classes response field names don't match the teacher UI — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/studentController.js:2151-2161`; `frontend/components/teacher/LiveClasses.js:30,162-200`
- **Problem:** Controller returns `{liveClasses:[{...,scheduledAt,durationMinutes}]}`; UI reads `d.live_classes` + `lc.scheduled_start/status/duration_minutes/classroom`. None match; no `status`/`classroom` at all.
- **Impact:** Even past the 404, cards show blank status, no class name, "Invalid Date"; Join/Cancel logic (keyed on `status`) never works.
- **Fix:** Align the serializer to `live_classes[]/scheduled_start/duration_minutes/status/classroom/subject`; add a real status derivation.

### [CRITICAL] 73. Lesson Plan save always 400s — UI sends `weekOf/objectives`, controller requires `date`+`topic` — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/LessonPlans.js:26-42`; `api/teacherApi.js:521-526`; `backend/controllers/teacherController.js:1394-1395,1368-1382`
- **Problem:** Controller requires `date`+`topic` (400). UI sends `{classId,subjectId,title,weekOf,objectives,homework,resources}`. Also list read mismatches: `getLessonPlans` returns `{lesson_plans:[…]}` with `{topic,date}`; UI treats the response as a bare array and renders `p.title/p.weekOf`.
- **Impact:** Lesson plans never save and never list.
- **Fix:** Map `title→topic`, `weekOf→date`; unwrap `res.lesson_plans`; add field validation in the modal.

### [HIGH] 74. Peer review submission always 400s — UI sends a teacher NAME, backend requires `reviewee_id`+`category` — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/PeerReview.js:12,17-28,85`; `api/teacherApi.js:574-580`; `backend/controllers/teacherController.js:1660-1661`
- **Problem:** Form collects `toTeacher` free-text; API posts `{to_teacher,subject,score,comment,anonymous}`; controller requires `reviewee_id`+`category` (400). No teacher picker exists, so a valid `reviewee_id` is impossible. The model has no `anonymous` column either.
- **Impact:** Peer feedback errors and nothing is stored; no colleague receives it.
- **Fix:** Replace the free-text name with a teacher-select yielding `reviewee_id`; map `score→rating`, `subject→category`; persist `anonymous`.

### [HIGH] 75. Peer review read shape mismatch — "Reviews I've given" renders blank — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/PeerReview.js:71-77`; `backend/controllers/teacherController.js:1634-1641`
- **Problem:** `givenByMe` returns `{id,reviewee_id,category,rating,comment}`; UI reads `g.toTeacher/subject/score/anonymous`. The star breakdown is keyed by `category` server-side but the UI indexes star buckets 5..1.
- **Fix:** Resolve reviewee names + return `toTeacher/subject/score/anonymous`; build the breakdown by rating value.

### [HIGH] 76. Workload calendar shows "No items" on every weekday — flat list vs day-grouped contract — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/WorkloadCalendar.js:50-71`; `backend/controllers/teacherController.js:1528-1541`
- **Problem:** `getTeacherWorkload` returns `thisWeek` as a flat array of assignments; the UI expects day buckets (`x.day===d.id` → `day.items`). Classes/office-hours/conferences/grades-due are never produced.
- **Impact:** The flagship weekly view is permanently empty across all five days.
- **Fix:** Group server output into `[{day,items:[…]}]` deriving periods from TimetableSlot + deadlines from assignments/grades, or rewrite the UI to consume a flat list.

### [HIGH] 77. Personal Performance shows hardcoded parent rating / timeliness / attendance as real metrics — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:1585-1588`; `frontend/components/teacher/PersonalPerformance.js:64-84`
- **Problem:** Returns `gradingTimelinessDays:3`, `parentFeedbackAvg:4.2` (whenever any message exists), `parentFeedbackCount: messages.length` (the teacher's OWN sent messages), `attendanceTimelinessPct:95` — all constants. UI presents them as "4.2/5 across N responses", "3d average", "95% of registers closed on time".
- **Impact:** An official-looking performance dashboard where the headline numbers are invented. Actively misleading; any appraisal built on these is bogus.
- **Fix:** Compute from real data (feedback/ratings, submitted_at vs due_at, register close timestamps) or remove the cards.

### [HIGH] 78. `generateTimetable` is a no-op stub + an inappropriate capability for a teacher — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:2495-2502`; `routes/teacher.js:241`; `frontend/components/teacher/TimetableScreen.js:61-72,343-356`
- **Problem:** Returns `successResponse({},'Timetable generated')` — nothing stored. The "AI Timetable Suggestion" panel collects constraints and shows "Suggestion submitted for admin review" — nothing is submitted. Also, school-wide timetable generation belongs to school_admin, not a teacher.
- **Impact:** Constraints vanish; the success message is a lie.
- **Fix:** Persist a TimetableSuggestion visible to school_admin, or remove the panel. Confirm teachers should have any generation entry point.

### [MEDIUM] 79. Personal Performance trend chart shape mismatch — `classAverages` never plots — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/PersonalPerformance.js:6-13,59`; `backend/controllers/teacherController.js:1571-1575`
- **Problem:** Controller returns `[{subject,average,total_students}]`; the chart reads `p.value`/`p.term` → NaN coordinates.
- **Fix:** Return a `[{term,value}]` series, or relabel to a per-subject bar chart and map accordingly.

### [MEDIUM] 80. Live class creation doesn't verify the teacher owns the class — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/studentController.js:2168-2188`; `routes/live-classes.js:11-14`
- **Problem:** `createLiveClass` takes `class_id` from the body and writes `teacher_id:req.user.id` with no ownership check. Update/delete scope by `school_id` only — any same-school user could PATCH/DELETE another teacher's session by id. Route only guarded by `authenticateToken`.
- **Fix:** Verify `class_id` is the teacher's; scope update/delete by `teacher_id`; add a role gate.

### [MEDIUM] 81. Pending-grades count on workload is school-wide, not teacher-scoped — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:1516-1518`
- **Problem:** `Grade.count({where:{school_id, approval_status:'draft'}})` counts every draft in the school.
- **Fix:** Add `teacher_id` (or classroom IN teacher's classes) to the query.

### [LOW] 82. Lesson plan composer's per-class draft autosave shadows saved objectives — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/LessonPlans.js:17,31-35,88-93`
- **Fix:** Scope the draft to the open plan id; clear when opening a different plan; fix once the save contract is repaired.

### [LOW] 83. Voice digest endpoint exists but has no UI — `⚠ UNVERIFIED`
- **Where:** `frontend/api/teacherApi.js:601-604`; `backend/controllers/teacherController.js:1798-1828`
- **Fix:** Surface the digest somewhere (workload/home card), or confirm it's used elsewhere.

---

## Area 7 — Profile, Settings, Credentials, Channel Prefs, Where I've Been, Substitute Mode, Print Roster, Whistleblower, Verify  ⚠️ UNVERIFIED (finder-only)

**Summary:** Mostly a facade. Working: Academic Credentials + Print Class Roster (list). Broken: Substitute Mode is pure security theater (fake tokens, no-op revoke, empty list). Whistleblower 401s/400s, **leaks the teacher's identity despite the "anonymous" promise**, and auto-saves the disclosure to localStorage. Verify 404s. Channel Prefs renders a 24-cell matrix over 5 global booleans. Settings toggles and exports persist nothing.

### [CRITICAL] 84. Substitute Mode is a non-functional stub (security theater) — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:1324-1350`; `frontend/components/teacher/SubstituteMode.js:23-41`
- **Problem:** `issueSubstituteToken` returns `{token:'SUB-'+Date.now()}` with no DB write/scoping; `revokeSubstituteToken` no-ops; `listSubstituteTokens` always `{tokens:[]}`. The UI sells "time-bound access … auto-revokes … every action logged under your name" with Revoke buttons.
- **Impact:** A teacher hands a colleague a SUB-xxxx string believing they granted scoped, revocable, audited access. Nothing is granted, redeemable, or revocable. Worse than absent — it implies an access-control guarantee that doesn't exist.
- **Fix:** Remove from the UI until built, or implement a real SubstituteToken model (persist scope/expiry/redeemed_by, enforce on every delegated request, real revoke, tag delegated audit actions).

### [CRITICAL] 85. Whistleblower submit sends the wrong shape AND leaks the teacher's identity — `⚠ UNVERIFIED`
- **Where:** `frontend/api/teacherApi.js:422-427`; `components/teacher/TeacherWhistleblower.js:26,45,58-60`; `backend/controllers/whistleblowerController.js:35-54`
- **Problem:** `submitWhistleblowerReport` posts `{category,message}` **with** `authHeaders()` (the teacher's Bearer token). The backend requires `{title,description}` (400 otherwise) and derives `school = req.user.school_id` from that token, tying the report to the authenticated teacher — while the UI states "Anonymous … We do not log identity, IP, or device". Success reads `submitted.note`/`followUpKey` but the backend returns `follow_up_key` (snake) and no `note`.
- **Impact:** A teacher reporting corruption believes they're anonymous; the request carries their JWT and the server resolves their identity. The submit usually 400s; when it goes through, the confirmation key is blank. **A whistleblower could be deanonymized — trust-core failure.**
- **Fix:** For true anonymity, submit without the Authorization header via a public endpoint taking explicit `school_id` and storing no actor. Fix the payload to `{title,description,category_id,severity}`; map `follow_up_key`. Remove the "we do not log identity" copy unless the backend genuinely strips it.

### [HIGH] 86. Whistleblower category & status lookups send no auth header but the router requires auth (always 401) — `⚠ UNVERIFIED`
- **Where:** `frontend/api/teacherApi.js:418-431`; `backend/routes/whistleblower.js:10-14`; `whistleblowerController.js:15-16,63`
- **Problem:** `getWhistleblowerCategories()`/`checkWhistleblowerStatus()` fetch with no headers; the router applies `authenticateToken`; getCategories 401s without `school_id`. The component swallows the error → empty Category dropdown. Also `checkStatus` reads `req.params.follow_up_key` but the route param is `:key`.
- **Impact:** The form loads with an empty Category dropdown; "Check a ticket" always errors.
- **Fix:** Add `authHeaders()` (or make these genuinely public); fix `checkStatus` to read `req.params.key`.

### [HIGH] 87. Verify API method targets an unmounted route — `/api/verify/:hash/` returns 404 — `⚠ UNVERIFIED`
- **Where:** `frontend/api/teacherApi.js:387-390`; `backend/index.js:137-148`
- **Problem:** `verifyHash()` fetches `/api/verify/:hash/`; no router mounts it (verify handlers exist only at `/api/student/verify/...` and `/api/parent/verify/:hash/`).
- **Impact:** Any teacher-side verification round-trip 404s.
- **Fix:** Mount a teacher/public `/api/verify/:hash/`, or point the method at the existing student/parent endpoint.

### [HIGH] 88. Channel Preferences UI is a 24-cell matrix; backend stores 5 global booleans — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherChannelPreferences.js:6-20,76-77`; `backend/controllers/teacherController.js:917-959`
- **Problem:** The component toggles `prefs[channel][category]` (6×4). `getTeacherChannelPreferences` returns per-channel `{enabled}` booleans; `updateTeacherChannelPreferences` destructures flat booleans while the PATCH sends nested objects.
- **Impact:** Every box loads unchecked; per-category granularity is dropped on save; "Saved" is dishonest; reload wipes it.
- **Fix:** Represent per-category×per-channel prefs (JSON column or join table) and align the GET payload — or simplify the UI to the 5 global toggles the backend supports.

### [HIGH] 89. Where I've Been renders blank rows (response-shape mismatch) — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/WhereIveBeen.js:20,57-60`; `backend/controllers/teacherController.js:884-893`
- **Problem:** Component sets entries directly from `getWhereIveBeen()` and maps `e.section/device/accessedAt`; backend returns `{access_log:[{type,action,severity,ip,timestamp}]}` (wrapper object).
- **Impact:** The "defensible record for grading disputes" is blank — the exact audit trail the feature promises.
- **Fix:** Return `data.access_log`; map `section←action`, `device←ip`, `accessedAt←timestamp`; add an explicit error state.

### [MEDIUM] 90. Print roster QR links to a non-existent `/verify/roster-...` page — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/PrintClassRoster.js:45`
- **Problem:** Renders `<QRCode value={origin + '/verify/roster-' + classId}/>`; no `/verify` route exists (frontend or backend).
- **Impact:** The roster's trust feature (scannable QR carried on field trips "in an emergency") leads to a 404.
- **Fix:** Wire to a real verification page/endpoint, or drop the QR until verification exists.

### [MEDIUM] 91. Settings notification toggles persist nothing — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherSettings.js:48,54-56,262-296`
- **Problem:** `prefs` is local `useState`; `togglePref` only calls `setPrefs`; no API call for the five "Institutional Notifications" toggles.
- **Impact:** Disabling a digest/alert evaporates on reload; teachers keep getting notifications they thought they turned off.
- **Fix:** Wire to `updateChannelPreferences` (or a notification-prefs endpoint) and load saved state on mount; or remove the duplicate surface.

### [MEDIUM] 92. Settings "Export Academic Records" buttons are fake timers — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherSettings.js:93-97,314-320`
- **Problem:** `handleExport` sets "Generating…" then "ready" via setTimeout — no fetch/download/blob. PDF/CSV/XLSX all share this.
- **Fix:** Implement a real export endpoint, or remove the Data & Archives section.

### [MEDIUM] 93. Change-password posts to a superadmin-router route — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherSettings.js:69-79`; `backend/index.js:148`; `routes/superadmin.js:106`
- **Problem:** Posts to `/api/change-password/`, which resolves through the superadmin router mounted at `/api`. Fragile, undocumented, bypasses the teacher API layer.
- **Fix:** Add an explicit role-agnostic `/api/account/change-password/` and route the teacher UI to it.

### [MEDIUM] 94. Whistleblower draft auto-saves report text to localStorage on a "we don't log device" screen — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherWhistleblower.js:11,28`; `hooks/useAutoSave.js`
- **Problem:** The textarea uses `useAutoSave('teacher_whistle_draft','')`, persisting the in-progress disclosure to localStorage; only cleared on successful submit. The screen promises "We do not log identity, IP, or device".
- **Impact:** A sensitive disclosure sits in plain localStorage on a shared/managed device, contradicting the privacy promise.
- **Fix:** Don't auto-persist; use in-memory/sessionStorage and clear on blur/navigation; reconcile the copy.

### [LOW] 95. Profile "Active Sessions" / "Two-Factor" / "Enable 2FA" are display-only with no action — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherProfile.js:143-169`; `TeacherSettings.js:229-258`
- **Problem:** The "Enable Two-Factor Authentication" prompt has no button/handler; the 2FA status card repeats it with no action.
- **Fix:** Implement 2FA enrollment behind the prompt, or remove the CTA; show real session data with a "sign out other sessions" control or drop it.

### [LOW] 96. Profile credentials editor exposes a `qualification` field the endpoint ignores — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherProfile.js:41-48,222-231`; `backend/controllers/teacherController.js:1918-1929`
- **Problem:** `handleSave` sends `qualification`; `updateTeacherCredentials` only updates `years_experience/bio/linkedin_url/degrees/certifications`.
- **Fix:** Persist `qualification` (and return it), or make the field read-only.

---

## Area 8 — Dashboard shell, navigation, routing, responsiveness, theme, a11y, i18n  ⚠️ UNVERIFIED (finder-only; #97 verified by Claude)

**Summary:** The nav maps are internally consistent (no orphan/404 nav items). But the shell has a **confirmed critical crash on mount** (missing `SchoolContextProvider`). Beyond that: dead theme toggle, broken back/forward, inert i18n, overwhelming 35-item IA.

### [CRITICAL] 97. Teacher dashboard hard-crashes on mount — `useSchoolContext()` has no provider — `✓✓ VERIFIED BY CLAUDE`
- **Where:** `frontend/components/teacher/TeacherDashboard.js:183`; `hooks/useSchoolContext.js:7,70-75`; `SuperadminDashboard.js:650`; `App.js`
- **Problem (confirmed by hand this session):** `useSchoolContext()` calls `useContext(SchoolContext)` where `SchoolContext = createContext(null)` (line 7), and throws `new Error('useSchoolContext must be used within a SchoolContextProvider')` when the value is null (line 73). `SchoolContextProvider` is **defined but never rendered anywhere in `src`** (grep returns only its own definition). `TeacherDashboardInner` calls it at line 183 — during render, and **outside** the ErrorBoundary (which only wraps `renderSection()` at line 429). So nothing catches the throw.
- **Impact:** A teacher logging in gets a blank/white screen or a React error overlay. The entire portal is unreachable on **every** mount. **This is ship-blocker #0 — none of the other findings are reachable until it's fixed.**
- **Fix:** Mount `<SchoolContextProvider>` around the teacher tree (e.g. inside TeacherDashboard's provider stack at lines 477-484), OR make `useSchoolContext()` degrade gracefully (return `{}` instead of throwing) when no provider is present. Then verify by actually loading the dashboard in a browser.

### [HIGH] 98. Browser Back/Forward silently desyncs the active section (no popstate listener) — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherDashboard.js:197-203`; no popstate handler in the teacher dir
- **Problem:** `navigateTo()` uses `window.history.pushState()` but there's no `popstate` listener; `activeSection` is read once from `getInitialSection()` at mount.
- **Impact:** After navigating between sections, pressing Back changes the URL but not the rendered screen — content no longer matches the address bar. Forward too.
- **Fix:** Add a `popstate` effect that re-derives the section from `window.location.pathname` and calls `setActiveSection`.

### [MEDIUM] 99. Header theme-toggle button is dead — theme hard-locked to dark — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherDashboard.js:371-375`; `context/ThemeContext.js:42-44`
- **Problem:** The header renders a theme button, but `ThemeContext` provides `theme:'dark'` constant and `toggleTheme:()=>{}` and force-sets `data-theme='dark'` ("light mode has been removed").
- **Impact:** Clicking the sun/moon does nothing, ever; the icon always implies a switch that won't happen.
- **Fix:** Remove the toggle (and stale `[data-theme='light']` CSS), or re-enable real switching.

### [MEDIUM] 100. i18n is dead scaffolding — provider wraps everything, zero `t()` calls in the shell — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherDashboard.js:478`; `context/I18nContext.js:16`
- **Problem:** `<I18nProvider>` wraps the tree but the shell never calls `useT()/t()` — all strings are hardcoded English. `SUPPORTED=['en']`, no locale switcher; only `KeyboardShortcuts` uses `t()`.
- **Impact:** i18n adds a provider + bundle with no localisation benefit, misleading future devs.
- **Fix:** Wire shell strings through `t()` + add a switcher and a second locale, or drop the scaffolding.

### [MEDIUM] 101. Navigation IA is overwhelming — 35 items across 5 groups, "Old feedback" label — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherDashboard.js:111-171` (NAV_GROUPS), line 147
- **Problem:** 35 nav items; the "Me" group alone has 12 mixing identity/tools/reporting; the feedback label is literally "Old feedback" next to "Student threads" and "Announcements".
- **Impact:** A 35-item sidebar with no search and overlapping messaging concepts; "Old feedback" reads like a dev note and makes the product feel unfinished.
- **Fix:** Rename "Old feedback"; consolidate the messaging entries; add nav search or a "More" overflow; split the bloated "Me" group.

### [LOW] 102. Mobile bottom nav uses horizontal scroll for 5 fixed items; lacks ≤400/≤360 — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherDashboard.css:400-442`
- **Problem:** `.tch-bottom-nav` sets `overflow-x:auto` with `min-width:60px` items; on a 320px device labels+icons can overflow into a scroll inside a fixed bar.
- **Fix:** Even flex distribution (drop min-width), shrink labels at ≤360, add the mandated breakpoints.

### [LOW] 103. Stale `[data-theme='light']` CSS is unreachable dead code — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherDashboard.css:1118,1127`; `TeacherPolish.css`; `ThemeContext.js:22-24`
- **Fix:** Remove the light-theme rules (or restore real light mode); keep the stylesheet honest.

### [LOW] 104. ErrorBoundary fallback uses `--student-text`, off-brand in the teacher shell — `⚠ UNVERIFIED`
- **Where:** `frontend/components/common/ErrorBoundary.js:36`; used at `TeacherDashboard.js:429`
- **Problem:** Fallback hardcodes `color: var(--student-text, #fff)`; undefined here → white text on a light-tinted error surface.
- **Fix:** Make ErrorBoundary theme-agnostic (`inherit` or a passed token) or render a teacher-styled fallback.

### [LOW] 105. Resize-only sidebar sync reads `window.innerWidth` in render — `⚠ UNVERIFIED`
- **Where:** `frontend/components/teacher/TeacherDashboard.js:177,202,219`
- **Problem:** `showOverlay`/initial sidebar state read `window.innerWidth` during render rather than tracking a reactive value; the overlay can lag a resize across the 768px boundary.
- **Fix:** Track viewport width in state (the resize listener already fires) and derive overlay/sidebar from it.

---

## Area 9 — Backend controller integrity, route/method mismatches, tenant isolation, auth  ⚠️ UNVERIFIED (finder-only; #106 verified by Claude)

**Summary:** Worse than the polished frontend suggests. The systemic defect: ~14 models used as bare unimported identifiers → every handler touching them throws `ReferenceError`, which the catch blocks swallow into empty "you have nothing" responses. Plus concrete logic bugs (grade-lock loses scores, withdraw triple-mismatch, mod requests keyed `teacher.id` but read `user.id`, a cross-tenant grade-history IDOR).

### [CRITICAL] 106. ~14 models used as undefined bare identifiers — every handler touching them throws `ReferenceError` — `✓✓ VERIFIED BY CLAUDE`
- **Where:** `backend/controllers/teacherController.js:1-17` (imports) vs usages at `:720,805,836,1046,1076,1100,1120,1170,1194,1244,1268,1304,1362,1399,1418,1524,1577,1601,1607,1663,2289,2326,…`; `models/index.js`
- **Problem (confirmed by hand this session):** Only 14 models are imported (Teacher, User, School, Class, Student, ClassSubject, Subject, Grade, Term, AcademicYear, GradingScheme, Notification, Exam, ForensicEvent). The file then calls `Message.count` (720), `Message.findAll` (805), `OfficeHour.findAll/create` (1046/1076), `BehaviourIncident.findAll/create` (1268/1304), `LessonPlan.findAll/create` (1362/1418), `PeerReview.findAll/create` (1601/1663), plus `SpotlightStudent/LearningResource/ChannelPreference/WhistleblowerReport/WhistleblowerCategory/SecurityAuditLog`. None are imported at the top or required inline (only `Attendance`@531/572 and `ModificationRequest`@651 are, and those are used unimported elsewhere too). `models/index.js` has **no `module.exports` and no `global.*` assignment** (grep confirmed). So `Message`, etc. are not in scope → `ReferenceError` at runtime.
- **Impact:** Messaging, parent/student threads, office hours, behaviour incidents, lesson plans, peer reviews, spotlight, resources, assignments, channel prefs, whistleblower, access log, workload, and modification requests all crash with 500 or (via the catch blocks) show a permanently empty screen. **This single defect is the real root cause behind most of the Area 4/5/6/7 findings.**
- **Fix:** Import every referenced model at the top of `teacherController.js` (or destructure from a models index that actually exports them). Add a smoke test hitting each teacher endpoint once — the ReferenceErrors surface immediately. **Highest-leverage fix in the whole audit.**

### [CRITICAL] 107. Grade locking never persists any score — submit reports success with count 0 — `⚠ UNVERIFIED` (same defect as verified #15)
- **Where:** `frontend/api/teacherApi.js:49-57` vs `backend/controllers/teacherController.js:302-318`
- **Problem:** Client sends only `{student_ids,subject_id,term_id}`; controller loops and `parseFloat(gradeData.score||gradeData.total)` is NaN for every student → skipped; still commits, notifies, returns `{count:0}` as success.
- **Impact:** The trust-core feature silently loses all data while showing a success toast.
- **Fix:** Send per-student scores, or have the controller lock the existing draft rows for the given ids/subject/term. Assert `count>0` in a test.

### [CRITICAL] 108. `getStudentGradeHistory` has no tenant/ownership scoping — cross-school IDOR — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:2345-2358` (route `teacher.js:163`)
- **Problem:** Unlike every other handler, it doesn't load the teacher, doesn't filter by `school_id`, and doesn't check the student belongs to the teacher's class: `Grade.findAll({where:{student_id: studentId}})`. Any authenticated teacher/staff can pass any `studentId`.
- **Impact:** A teacher at school A can enumerate studentIds and pull complete academic records of students at school B — a cross-tenant PII/grade leak.
- **Fix:** Load the teacher, scope by `school_id`, and verify the student's `classroom_id` is one of the teacher's classes before returning grades.

### [HIGH] 109. Withdraw modification request: route, verb, and param all mismatch — `⚠ UNVERIFIED` (same as #33)
- **Where:** `frontend/api/teacherApi.js:107-114`; `backend/routes/teacher.js:142`; `controllers/teacherController.js:2002-2022`
- **Fix:** Use `POST /modification-requests/:id/withdraw/` (or pass `request_id` in body and read it); align path/verb/param.

### [HIGH] 110. Modification requests written under `teacher.id` but queried under `user.id` — never appear — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:1944` (read `req.user.id`) vs `:1987` (write `teacher.id`) vs `:2009`
- **Problem:** Create writes `requested_by: teacher.id`; list filters `requested_by: req.user.id`; `teacher.id` ≠ `user.id`.
- **Impact:** After submitting, the teacher sees an empty "My requests" list — can't track or withdraw.
- **Fix:** Use one identity consistently (`teacher.id`) in create, list, and withdraw.

### [HIGH] 111. `isTeacher` middleware grants superadmin/school_admin/staff full teacher access without a Teacher row — `⚠ UNVERIFIED`
- **Where:** `backend/routes/teacher.js:87-110`
- **Problem:** `allowedRoles=['teacher','staff','superadmin','school_admin']` all pass through; for these roles no Teacher record is required. Handlers scoped only by `school_id` (e.g. `getStudentGradeHistory`, which has no teacher lookup at all) run fully.
- **Impact:** A "staff" account with no teaching assignment can call teacher endpoints — undocumented, widens the IDOR blast radius.
- **Fix:** If cross-role access is intended (impersonation), make it explicit and still resolve an effective teacher/school context; otherwise restrict.

### [HIGH] 112. Several handlers swallow real errors and return empty success — masks the crashes — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js` — ~25 catch blocks (e.g. `:481-482,515-516,558-559,733-734,796-797,1037-1038,1232-1233,1290-1291,1385-1386,1651-1652,…`)
- **Problem:** Many catches `return res.json(successResponse({items:[]}))`; the API layer further normalizes non-OK to empty arrays. Combined with #106, a `ReferenceError` becomes a `200 OK` with empty data.
- **Impact:** No loading/error distinction — a hard crash is indistinguishable from "no data". This is why so much of the dashboard looks "empty" rather than "broken".
- **Fix:** Return real 500s (or a typed error flag) on unexpected failures; reserve empty-array success for genuinely-empty results. Fix #106 first.

### [HIGH] 113. `saveGradeDraft` updates a grade by `student_id`+`school` only — ignores subject/term, can edit the wrong grade — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:232-234` (+ `:267`)
- **Problem:** `Grade.findOne({where:{student_id, school_id}})` — no subject/term/classroom filter; grabs an arbitrary row and overwrites CA/midterm/final. On create it stuffs `subject_id: classId` (a class id in the subject column).
- **Impact:** Editing one subject's CA can mutate a different subject's grade for the same student; new drafts get a class id miswritten as their subject. Grade corruption.
- **Fix:** Scope by `student_id+subject_id+term_id(+classroom_id)`; store the correct `subject_id`.

### [HIGH] 114. Substitute-mode token endpoints are pure stubs — `⚠ UNVERIFIED` (same as #84)
- **Where:** `backend/controllers/teacherController.js:1324-1350`
- **Fix:** Build a real SubstituteToken model with issue/revoke/validate + enforcement, or remove the UI.

### [MEDIUM] 115. `getStudentReportCards` always returns student_name "Unknown" (wrong alias) — `⚠ UNVERIFIED`
- **Where:** `backend/controllers/teacherController.js:2381` (include `as:'user'`) vs `:2396` (reads `student.User`)
- **Fix:** Use `student?.user` to match the include alias.

### [MEDIUM] 116. Feedback templates and counsellor referral are stubs returning hardcoded/fake data — `⚠ UNVERIFIED` (same as #43/#65)
- **Where:** `backend/controllers/teacherController.js:1440-1463` (templates), `:1493-1500` (referral)
- **Fix:** Back both with real models; a referral that does nothing is a safeguarding risk.

### [MEDIUM] 117. `generateTimetable` handler is a no-op that always reports success — `⚠ UNVERIFIED` (same as #78)
- **Where:** `backend/controllers/teacherController.js:2495-2502`
- **Fix:** Remove the teacher-facing generate action (timetabling is school-admin) or implement real generation.

### [MEDIUM] 118. Attendance status returns hardcoded zeros + fabricated at-risk rate — `⚠ UNVERIFIED` (same as #6/#49)
- **Where:** `backend/controllers/teacherController.js:541-555`
- **Fix:** Compute from real Attendance rows; derive real rates.

### [MEDIUM] 119. Performance dashboard mixes real class averages with hardcoded KPIs — `⚠ UNVERIFIED` (same as #77)
- **Where:** `backend/controllers/teacherController.js:1583-1589` (note: `:1577 Message.findAll` also throws per #106)
- **Fix:** Compute timeliness/parent-feedback from real sources or drop the fabricated KPIs.

### [LOW] 120. `getNotifications/markAllNotificationsRead` are client-side fakes; `markNotificationRead` hits a school-only route — `⚠ UNVERIFIED` (same as #55)
- **Where:** `frontend/api/teacherApi.js:132-148`
- **Fix:** Point `getNotifications` at `GET /api/teacher/notifications/`; add a teacher-scoped mark-read route.

---

## Cross-area duplicate map

Several findings are the same underlying defect seen from two area lenses — fix once:

- **Report Cards 400** → #4 (home) = #28 (assessments)
- **Grade lock loses scores** → #15 (grades) = #107 (backend)
- **`gradeStats {0,0,0,0}`** → #2 (home) = #20 (grades)
- **Attendance status hardcoded** → #6 (home) = #49 (engagement) = #118 (backend)
- **Withdraw mod-request mismatch** → #33 (assessments) = #109 (backend)
- **Substitute Mode stub** → #84 (account) = #114 (backend)
- **Counsellor referral / feedback templates stubs** → #43/#65 (areas) = #116 (backend)
- **generateTimetable no-op** → #78 (professional) = #117 (backend)
- **Notifications stub** → #55 (community) = #120 (backend)
- **No ownership scoping on grades** → #23 (grades) ≈ #36 (exam results) ≈ #108/#113 (backend)
