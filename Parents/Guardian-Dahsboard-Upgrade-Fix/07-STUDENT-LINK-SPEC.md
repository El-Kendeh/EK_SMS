# Parent ↔ Student Dashboard Connection — Design & Status

Part 7 of the Parent Dashboard effort — 2026-07-04. Requirement: *"the parent dashboard should have a link or connection with the students dashboard."*

## Design principle

The parent portal is a **read-only window into what the child sees**, guaranteed not by copying code but by **shared backend builders**: the same query/serializer produces both the student view and the parent child-view, so the two surfaces cannot drift. No student-JWT impersonation anywhere — every parent request is authorized through `getParentStudentIds` / `assertOwnChild` ownership checks.

## P1 — BUILT (2026-07-04)

| Surface | Parent side | Student side | Shared backend |
|---|---|---|---|
| **Timetable** | New `Timetable` nav item (Academic group) → `ParentTimetable.js`, child-scoped via ChildSwitcher, day tabs (defaults to today), honest empty state until the school generates a timetable | `student/…/Timetable` (unchanged behavior) | **`backend_node/src/services/timetableView.js` → `buildClassTimetable(classroomId)`** — extracted from `studentController.getTimetable`, now used by BOTH `GET /api/student/timetable/` and the new `GET /api/parent/children/:childId/timetable/` (ownership-gated, returns `{timetable, className, hasData}`) |
| Grades | ParentGrades (per child, approved only) | student grades | same `pruh_core_grade` published/approved filters |
| Attendance | ParentAttendance (calendar + logs) | student attendance | same `pruh_core_attendance` rows |
| Report cards | ParentReportCards + **real PDF download with SHA-256 + QR public verification** | student report cards | same published grade sets; receipts in `pruh_core_report_card_receipt` |
| Grade history | ParentGrades drawer | student grade panel | shared `mapGradeEvents` (`utils/gradeHistory`) |

Existing per-child pages already made the parent portal child-scoped (ChildSwitcher); the missing student-dashboard surface was the **timetable**, which is what P1 adds, plus the shared-builder pattern as the parity mechanism.

## P2 — designed, not yet built

1. **Student-side "My guardians" card** — read-only list of active guardians (`CoGuardian status='active'` + `StudentParent`) on the student profile page. Endpoint: `GET /api/student/guardians/` → `[{name, relationship, email}]`. Low effort; needs a student-portal UI slot.
2. **Child account status chip** on parent child cards — `has account` / `last seen` from `Student.user_id → users.last_login`. The children serializer already loads the child's user; add `lastLogin` + render a chip in `ParentChildren`.
3. **Shared announcements surface** — the child's school-wide notifications already reach the parent via `parentNotificationScope` (same `pruh_core_notification` rows the student sees); a "seen by your child" indicator would require per-user read tracking (schema change — out of scope).
4. **More shared builders** — as student pages grow (assignments, exams), extract their query builders into `backend_node/src/services/` the same way instead of duplicating queries in `parentController`.

## Security invariants (do not regress)

- Every `/api/parent/children/:childId/*` route must call `assertOwnChild` (403 on non-owned).
- `getParentStudentIds`: CoGuardian links must filter `status:'active'`; the phone fallback must only run with a **non-empty phone** and is scoped to the parent's own school (a `null` phone once compiled to `IS NULL` and leaked every phone-less student cross-tenant — fixed 2026-07-04).
- Parent router is `requireRole(['parent'])` + `requireActiveAccount`.
