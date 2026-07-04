# Parent / Guardian Dashboard — Audit Executive Summary

Part 0 of the Parent Dashboard audit — generated 2026-07-03.

This is the headline for a full audit of the EK-SMS Parent/Guardian portal (UI, backend, functionality) against `public/docu/ek-sms-complete-plan.md.pdf`. The other parts (01–06) carry the component-by-component detail, the backend/API contract audit, the UI/UX findings, and the fix roadmap. The extracted plan text sits alongside these files as `_system-plan-extracted.txt`.

## State of the dashboard in one paragraph

The Parent portal **exists and is, on paper, the most complete role in the system** — 28 components, a 22-section grouped sidebar in a genuinely well-built shell (off-canvas nav, dark mode, skeleton/empty/error states), a ~50-function API client, and ~51 backend routes with a 1,854-line controller behind real Sequelize models. Almost every plan feature has a screen. The problem is that **almost none of it works end-to-end right now.** The portal white-screens on mount, and even past that crash four stacked defects mean every data screen renders empty, every write returns 400/404, payments are faked, and two endpoints leak the entire platform's audit log. This is a wiring-and-integration failure, not a missing-features failure — which is good news for the fix effort.

## The verdict: four stacked breakages, in the order a user hits them

A user opening the portal today hits these in sequence. Each one alone is a blocker; fixing an outer layer just exposes the next.

| # | Root cause | Effect | Fix leverage |
|---|-----------|--------|--------------|
| **1** | **Whole-shell crash.** `SchoolContextBanner` (header, [ParentDashboard.js:250](../../src/components/parent/ParentDashboard.js#L250)) calls the throwing `useSchoolContext()`, but no `SchoolContextProvider` wraps the parent tree (it's mounted only in `TeacherDashboard.js`). The banner sits **outside** the ErrorBoundary. | Entire parent portal throws on mount → white screen / error fallback. Nothing renders. | Wrap `ParentDashboard` in `SchoolContextProvider` (as Teacher does) or swap to `useSchoolContextStandalone`. ~5 lines. |
| **2** | **Backend 500 on `GET /children/`.** `getParentStudentIds` filters `CoGuardian` on `is_active` ([parentController.js:41](../../backend_node/src/controllers/parentController.js#L41)), a column the model doesn't have (only `status`). | Unknown-column SQL error → `getChildren` returns 500. The children list — the root of the whole portal — never loads server-side, and every ownership-scoped endpoint that calls this helper fails with it. | Remove the `is_active` filter / use `status`. One line. (Confirm the physical table matches the model.) |
| **3** | **Frontend raw-Response bug.** Every function in [parentApi.js](../../src/api/parentApi.js) calls `api.request(...)`, which returns the **unparsed fetch `Response`** ([client.js:154](../../src/api/client.js#L154)). Only `get/post/patch/delete` call `.json()`. | Every read resolves to a `Response` object; consumers read `.children`/`.grades`/`.notifications` off it → `undefined` → silently falls back to `[]`/`null`. No error thrown. Every data screen is permanently empty. | Switch `parentApi` reads to `apiClient.get(...)` and writes to `post/patch/delete` (exactly how `studentApi.js` already works). Single highest-leverage FE fix. |
| **4** | **Pervasive contract drift.** Components were built against the (now-orphaned) `parentMockData` shape — flat camelCase with computed fields. The real controller returns wrapped, snake_case payloads with a minimal field set. Plus 7 POST bodies and 3 route params don't match the controller. | Even after 1–3, grades crash on an object-valued `subject`, cards show `undefined%`, and every write (`objection`, `whistleblower`, `teacher message`, `co-guardian`, `pickup`, `sign slip`, `acknowledge`) returns 400; three deletes/downloads 404; profile edit + 2FA 500. | Standardize one contract: serialize camelCase + unwrap arrays server-side, and align the ~10 write bodies/params. Medium effort, per-endpoint. |

**Bottom line:** three of these four (the shell crash, the API-client bug, and the contract drift) were adversarially re-verified against the source; the fourth (backend 500) is confirmed by direct reading of the model + controller. The read-path is one coordinated fix away from working; the write-path and security holes need per-endpoint work.

> **✅ Finding 1 reproduced in the running app (2026-07-03).** The CRA dev server was started and Edge (headless, via CDP) loaded `/parent` with a `role:'parent'` session. The portal rendered **nothing** — `#root` emptied (`rootChildCount: 0`) — and threw the exact predicted error:
> ```
> Uncaught runtime error:
> useSchoolContext must be used within a SchoolContextProvider
>     at useSchoolContext (…ParentGrades_js.chunk.js)
>     at SchoolContextBanner (…ParentDashboard_js.chunk.js)
>     at renderWithHooks → beginWork
> ```
> The throw originates in `SchoolContextBanner` (the header component), confirming it is the **whole shell** that crashes on mount, not just the Grades pane. In dev this shows CRA's red error overlay; in production (no overlay) it is a blank white page. Screenshot and CDP transcript captured. This upgrades Finding 1 from "traced from source" to **confirmed at runtime**.

## Plan-feature scorecard (parent-relevant)

Status reflects **runtime reality today**, not "is there a screen for it." Detail and evidence in [02-PLAN-GAP-ANALYSIS.md](02-PLAN-GAP-ANALYSIS.md).

| Plan feature | Screen exists? | Works E2E? | Status |
|---|---|---|---|
| §3.1 / MVP-1 Children overview (Dashboard) | Yes | No | 🔴 Broken (shell crash + 500 + API bug) |
| §3.1 / MVP-2 Child grades view (Flow 3) | Yes | No | 🔴 Broken (own `useSchoolContext` crash + API bug + `subject` object) |
| §2.4 / MVP-3 Report card **PDF** download | Yes (UI) | No | 🔴 Missing at data layer — backend returns JSON, no PDF/QR/signature |
| §2.4 Report card **QR verification** | Yes (UI) | No | 🔴 No report-card hash generated; in-dashboard verify is a dead-end |
| §3.3 / MVP-4 Notification center + alerts | Yes | No | 🔴 Permanently empty; hardcoded demo filters; two non-shared layers |
| §3.1 Attendance records | Yes | No | 🔴 Empty + calendar/log shape drift + dead month nav + IDOR |
| §3.1 Teacher comments (behaviour) | Yes | No | 🔴 Empty + latent `entry.teacher.split()` crash |
| §3.1 / §4.1 Fee status + cashless payment | Yes | No | 🔴 **Fake payment** (no gateway; fees zeroed without paying) + IDOR |
| §4.2 Automated receipts | Yes | No | 🔴 Download 404s; QR not verifiable; no PDF; no email/SMS |
| §3.2 Teacher↔parent messaging | Yes | No | 🔴 Send always 400 (missing `teacher_id`); threads not child/subject-scoped |
| §3.4 Anonymous whistleblower | Yes | No | 🔴 Submit always 400; crashes on mount; not encrypted; not truly anonymous |
| §3.5 Events / announcements | Partial | No | 🟠 `/events` aliases Notifications; no Event model, scheduling, or ack tracking |
| §1.2 Change/tamper alerts to parents | Partial | No | 🟠 Tamper counter global (not per-child); no parent notification emitted |
| §1.6 Submit feedback (grade objection) | Yes | No | 🔴 Endpoint 400s (`reason` vs `message`) |
| §1.6 Multiple guardians per student | Yes | No | 🔴 Invite 400s; `StudentParent` join table unused; linkage partly dead |
| §2.4 Public document verification | Yes | **Yes** | 🟢 The one working path — public `/verify/:hash` via `VerifyPage` |

**Add-ons the team built beyond the plan** (compare children, co-guardians, pickup allow-list, permission slips, donations/sponsor, wellbeing/counsellor, weekly & voice digest, end-of-term pack, print family summary, tamper counter, where-I've-been): all present, all currently non-functional for the same four reasons, several orphaned (never mounted).

## Real vs mock

- **No screen falls back to mock.** The rich `parentMockData.js` / `parentMockExtras.js` the UI was designed against are imported by **zero** files — dead code. The portal is wired 100% to the live API (which currently returns nothing usable).
- **Hardcoded fakes still in shipping UI:** `ParentHome` unread count `= 3` and "No recent activity"; `ParentFees` audit drawer with literal fake hashes; `ParentVerification` fabricated blockchain/validator-node data; `ParentNotifications` demo filters "aminata"/"mohamed".
- **Fake-success backend:** `startPayment` and `donateToCampaign` mark things paid with no payment processor.

## Top 10 fixes, ship-blockers first (all verified)

1. **Mount `SchoolContextProvider` around `ParentDashboard`** (or de-throw the two `useSchoolContext` calls) — unblocks the entire portal from its white-screen. *(Finding 1)*
2. **Remove the `CoGuardian.is_active` filter** in `getParentStudentIds` — unblocks `GET /children/` server-side. *(Finding 2)*
3. **Switch `parentApi.js` to `apiClient.get/post/patch/delete`** — makes every read return real data. *(Finding 3)*
4. **Fix the three IDOR holes** — add ownership checks to `getChildGrades`/`getChildAttendance`/`getChildFees`, and add a `role === 'parent'` gate to the router. *(Security)*
5. **Scope `getAccessLog` + `getFamilyActivity`** — they return the entire platform `SecurityAuditLog` to any parent. Cross-tenant PII breach. *(Security)*
6. **Stop faking payments** — `startPayment` must create a `pending` payment and only settle after a real gateway confirms; same for donations. *(Data integrity)*
7. **Align the contract** — camelCase serializers + unwrap arrays, and fix the 7 POST bodies / 3 route params so writes stop 400/404-ing. *(Finding 4)*
8. **Fix child linkage** — use the unused `StudentParent` join table; the phone-match path is dead (`User` has no `phone` column). Without this, phone-linked guardians see no children.
9. **Real report-card PDF + QR** — generate a signed PDF with a verifiable hash; give the in-dashboard "Verify a doc" section a real input. *(§2.4 / MVP-3)*
10. **Fix profile edit + 2FA** — they call `.update()` on the plain JWT object → 500; 2FA has no secret/verification and no DB column.

## Recommended direction

Do not treat this as "add features." Treat it as a **stabilization sprint**: land fixes 1–3 together (they are the prerequisite for seeing anything at all — and they're small), then the security fixes 4–6 (these are the ones that would be dangerous in production), then the contract alignment 7–8 that turns the existing 22 screens from empty shells into working features. Real payments, real report-card PDFs, and the Phase-2/3 add-ons (events model, messaging attachments, push/SMS transport) come after the base portal renders. Sequenced backlog with effort estimates is in [06-UPGRADE-ROADMAP-AND-ADDONS.md](06-UPGRADE-ROADMAP-AND-ADDONS.md).

> Method note: this audit ran as a 4-phase multi-agent workflow (6 inventory readers → 3 analysts → adversarial verification → synthesis). 60 findings were produced; the blocker/major claims were re-checked against the real code. Two of the most load-bearing claims (the shell crash and the backend 500) were additionally confirmed by hand. One analyst claim about the report-card screen was **downgraded** on verification (the crash path is unreachable because the empty state renders first) — noted honestly in [02](02-PLAN-GAP-ANALYSIS.md) and [03](03-BACKEND-API-CONTRACT-AUDIT.md) rather than overstated.
