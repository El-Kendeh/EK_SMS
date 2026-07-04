# Parent / Guardian Dashboard — Upgrade & Fix Audit

Full audit of the EK-SMS Parent/Guardian portal (UI, backend, functionality) against the system plan (`public/docu/ek-sms-complete-plan.md.pdf`, extracted here as `_system-plan-extracted.txt`). Generated 2026-07-03.

## TL;DR

The Parent portal **exists and is the most complete role in the system** — 28 components, a 22-section shell, ~51 backend routes — but **almost nothing works end-to-end today.** A user hits four stacked breakages: the portal white-screens on mount (missing `SchoolContextProvider`), `GET /children/` 500s (bad `CoGuardian.is_active` filter), the API client returns unparsed `Response` objects so every screen is empty, and pervasive FE↔BE contract drift 400s/404s most writes. Plus three IDOR holes and two endpoints that leak the entire platform's audit log. It's an integration-and-correctness failure, not a missing-features one — six small P0 fixes get it rendering and safe.

## Read in this order

| Doc | What's in it |
|---|---|
| [00-EXECUTIVE-SUMMARY.md](00-EXECUTIVE-SUMMARY.md) | Verdict, the four root causes, plan-feature scorecard, top-10 fixes |
| [01-CURRENT-STATE-INVENTORY.md](01-CURRENT-STATE-INVENTORY.md) | Every component + hook + context: data source, backend wiring, nav, orphans |
| [02-PLAN-GAP-ANALYSIS.md](02-PLAN-GAP-ANALYSIS.md) | Each plan requirement → status + evidence; MVP vs Phase-2/3; add-ons built beyond the plan |
| [03-BACKEND-API-CONTRACT-AUDIT.md](03-BACKEND-API-CONTRACT-AUDIT.md) | All ~51 routes with status; missing/dead endpoints; contract drift; security; models |
| [04-UI-UX-MODALS-RESPONSIVENESS.md](04-UI-UX-MODALS-RESPONSIVENESS.md) | Theming bug, dialog a11y, responsiveness, touch targets |
| [05-FEATURES-WITHOUT-UI-AND-UI-WITHOUT-BACKEND.md](05-FEATURES-WITHOUT-UI-AND-UI-WITHOUT-BACKEND.md) | UI-with-fake-data, backend-with-no-UI, orphaned components |
| [06-UPGRADE-ROADMAP-AND-ADDONS.md](06-UPGRADE-ROADMAP-AND-ADDONS.md) | Prioritized P0–P3 backlog with effort + a 5-sprint sequence |

## The four root causes (fix in this order)

1. **Whole-shell crash** — `SchoolContextBanner` (header) calls throwing `useSchoolContext()` with no provider → portal white-screens on mount.
2. **Backend 500** — `getParentStudentIds` filters a non-existent `CoGuardian.is_active` column → `GET /children/` fails.
3. **Raw-Response API client** — `parentApi.js` uses `api.request()` (unparsed `Response`); every read silently becomes `[]`/`null`.
4. **Contract drift** — mock-designed camelCase UI vs wrapped snake_case backend; 7 POST bodies + 3 route params mismatched → writes 400/404.

## How this audit was produced

A 4-phase multi-agent workflow: 6 inventory readers → 3 analysts (plan-gap, backend/contract, UI/UX) → adversarial verification of the blocker/major findings → synthesis. 60 findings; the load-bearing ones were re-checked against the real code, and the two most consequential (the shell crash and the backend 500) were additionally hand-verified. One analyst claim (the report-card crash mechanism) was **downgraded** on verification and is reported accurately rather than overstated — see the note in [00](00-EXECUTIVE-SUMMARY.md) and [02](02-PLAN-GAP-ANALYSIS.md).

> Runtime confirmation (2026-07-03): root cause #1 (the white-screen) was **reproduced in a live browser** — the CRA dev server + headless Edge loaded `/parent` and the app threw `useSchoolContext must be used within a SchoolContextProvider` at `SchoolContextBanner`, emptying `#root`. See the callout in [00](00-EXECUTIVE-SUMMARY.md). Other runtime claims are traced from source; where one depends on physical DB schema (e.g. whether `pruh_core_co_guardian` actually has an `is_active` column), that's flagged in [03](03-BACKEND-API-CONTRACT-AUDIT.md).
