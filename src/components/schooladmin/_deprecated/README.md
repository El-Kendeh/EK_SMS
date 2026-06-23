# `schooladmin/_deprecated/` — quarantined dead code

**Quarantined:** 2026-06-23 (Phase 4 — see `EK_SMS/schoolAdminUIFix/`).

These files were an **earlier School-Admin implementation that nothing imports anymore**.
The live School-Admin UI is `superadmin/SA*.js` (students/teachers/classes/subjects/parents)
plus the live `schooladmin/` add-on pages (`NewPages.js`, `SAExtraPages.js`,
`FinanceUsers/`, `AIDocumentCapture.js`). See `schoolAdminUIFix/01-ARCHITECTURE-live-vs-dead.md`.

## What's here (verified imported by NOTHING in the build graph)
| File / folder | Was | Lines |
|---|---|---|
| `SchoolAdminPages.js` | gradebook / attendance / reports / messages / syllabus / settings | ~3,172 |
| `SAstudents.js` + `Students/` | old students CRUD + the 6-step Add-Student wizard | ~2,575 + folder |
| `SAClasses.js` + `ClassProfileDrawer.js` | old classes CRUD + class drawer | ~1,846 + 413 |
| `SASubjects.js` | old subjects CRUD | ~1,277 |

## Why this is safe
- Verified via import-graph grep: no live file imports any of these (only stale **comments** mention the names).
- `npm run build` **compiled successfully** after the move — webpack only bundles imported modules, so these are no longer in the bundle.
- Their own relative imports (e.g. `../../api/client`) are now wrong at this depth — **that's expected and harmless**: these files are never compiled. Do not "fix" them; they're slated for deletion.

## To restore (if ever needed)
`git` tracks the move (nothing committed yet) — `git restore`/`git mv` back, or move the file up one level and fix its relative imports.

## To delete permanently (recommended after one release cycle)
Delete this entire `_deprecated/` folder. Before doing so, harvest anything worth keeping —
notably `Students/AddStudentWizard` (a more complete enrolment wizard than the live form);
to reuse it, repoint its API calls to the live `/api/students/` contract.

## NOT quarantined (still live or bundled — do not delete without an edit first)
- `Parents/`, `Principal/` — unreachable at runtime, but still **bundled** because `NewPages.js`
  re-exports `ParentsPage`/`PrincipalUsersPage`. Remove those two re-export lines from `NewPages.js`
  first, then they can be quarantined too.
- `Teachers/`, `ResendCredentialsButton.js` — imported by the live `NewPages.js`; keep.
- `FinanceUsers/`, `AIDocumentCapture.js`, `NewPages.js`, `SAExtraPages.js` — live.
