# CHANGELOG — Phase 4 (dead-code cleanup) + backend restart

**Date:** 2026-06-23 · **Status:** safe subset done; `npm run build` **compiled successfully** after the move. **Not committed.**

> Approach (per your caution): I only quarantined files **verified to be imported by nothing in the build graph**, moved them to a reversible `_deprecated/` folder (uncommitted), and **build-verified** as the safety net. I did not edit the live `NewPages.js` or remove any backend routes in this pass.

---

## Backend restart (done)
- Stopped the process on **:5000** and relaunched `backend_node`. Boot took ~48s because `db.sync({alter})` **created the new `pruh_core_exam_result` table** (Phase 2) and reconciled schema. Server confirmed listening + responding on :5000.
- ⇒ Phases 0–2 backend changes are now **live in dev**. (Prod still needs the manual `CREATE TABLE pruh_core_exam_result` — dev auto-synced it.)

---

## Quarantined → `src/components/schooladmin/_deprecated/`
Verified orphaned (import-graph grep: only stale comments reference these names) and confirmed safe by a clean build:

| Moved | Was | ~Lines |
|-------|-----|--------|
| `SchoolAdminPages.js` | gradebook/attendance/reports/messages/syllabus/settings | 3,172 |
| `SAstudents.js` + `Students/` | old students CRUD + 6-step add-student wizard | 2,575 + folder |
| `SAClasses.js` + `ClassProfileDrawer.js` | old classes CRUD + drawer | 1,846 + 413 |
| `SASubjects.js` | old subjects CRUD | 1,277 |

**≈9,300 lines** of dead code removed from the active tree. A [`_deprecated/README.md`](../src/components/schooladmin/_deprecated/README.md) explains provenance, why it's safe, how to restore, and what to harvest before final deletion (the Add-Student wizard).

### Why safe
- No live file imports any of them (grep-verified); webpack only bundles imported modules, so they're no longer in the bundle.
- `npm run build` → **Compiled successfully** with them moved (the real proof — a missed dependency would have failed with "Module not found").
- Reversible: nothing committed; `git restore`/move back.

---

## Deliberately NOT done (need a live-file edit or a destructive backend change — your call)

| Item | Why held |
|------|----------|
| Quarantine `Parents/` + `Principal/` | Unreachable at runtime but still **bundled** — `NewPages.js` (live) re-exports `ParentsPage`/`PrincipalUsersPage`. Safe next step: delete those two re-export lines from `NewPages.js` (verify unused first), then move the folders + build-check. |
| 4.3 Remove orphaned backend routes (`/api/school/finance/*`, `/api/school/context/`, `/api/school/syllabus-stats/`, `/api/school/attendance/class/`) | Removing endpoints is destructive; they're only called by now-quarantined pages. Low value, nonzero risk — left for a focused pass. |
| 4.4 Permanently delete `_deprecated/` | Do after a release cycle once you've confirmed nothing's needed and harvested the Add-Student wizard. |

---

## Verification
- `npm run build` → **Compiled successfully** (no errors/warnings) post-move.
- Backend up on :5000 (restarted), `pruh_core_exam_result` created in dev.

## Suggested commit (when you say "push")
```
chore(school-admin): quarantine ~9.3k lines of orphaned legacy UI into _deprecated/
```
(Then a later commit can delete `_deprecated/` outright.)
