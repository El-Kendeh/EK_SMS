# Super Admin Console — Audit & Fix Tracker

This folder documents the full audit of the EK-SMS **Super Admin** console (UI + backend) and tracks the remediation work.

| File | What it is |
|------|------------|
| [`SUPER-ADMIN-AUDIT.md`](./SUPER-ADMIN-AUDIT.md) | The complete, verified findings — every component's status, all risks, partial workflow features, full findings-by-category, and the adversarial-verification corrections. **Part A** = main audit; **Part B** = onboarding/security addendum. |
| `README.md` (this file) | Verdict, what's already fixed, the open items, and the prioritized remediation plan. |

**Audited:** 2026-06-23 · **Method:** two adversarially-verified multi-agent workflows (43 + 42 agents); every high/medium finding re-checked against source before inclusion.

> ## ⚠️ Independent verification (2026-06-23, post-fix)
> A third workflow re-checked **all 84 findings against the deployed code**: **25 fixed · 15 partial · 43 open** (1 moot).
> The **security-critical work IS done** (staff/student PII routes, class/subject IDOR, audited impersonation). **But the "trust-signal honesty pass" was NOT comprehensive** — it covered the components I happened to edit, and **missed several fabricated-signal components that still mislead in production**: **SAReview** (fake "Trust Score"/"Email Verified" on the approval screen — HIGH), **SABenchmarks Pass Rate** (false "0.0%" — HIGH), **SAChangeAlerts** (blank/"Invalid Date" cards — HIGH), **SAAnalytics** (compliance/coverage/KPI/grade-distribution), **SASchools** ("98%" health), **SASecurityLogs** ("Flagged IPs"), **SAAlertBroadcast** ("System: Optimal"), and the **SAUsers** per-card trend chips. Plus deferred design/feature items (A8 person pages, real enforcement, etc.) and 22 low cosmetic items.
> ### ✅ Follow-up sweep DONE — commit `01c1f44` (CI build verified)
> Closed the missed fabricated-signal components:
> - **SAReview** — "Trust Score" → "Profile Completeness"; false "Domain & IP checks passed" + "Email Verified" removed *(HIGH → fixed)*
> - **SABenchmarks** — false "0.0%" Pass Rate now shows "—" (only computes when backend returns `passed`) *(HIGH → fixed)*
> - **SASchools** — "System Health: 98%" card removed *(MED → fixed)* · **SASecurityLogs** — "Flagged IPs" removed *(MED → fixed)* · **SAAlertBroadcast** — "System: Optimal" pill removed *(MED → fixed)* · **SAUsers** — hardcoded trend chips removed *(HIGH-partial → fixed)*
> - **SAAnalytics** — hardcoded Grade Distribution → "not tracked"; compliance flags + coverage bars caveated as placeholders; "Apr 2025" + fake "+5% MoM/+12% YTD" deltas removed *(MED → fixed; LOW leftovers: hardcoded sparklines, dead phone button, overview-tab compliance summary)*
>
> **Updated tally after the sweep: ~33 fixed · ~14 partial · ~36 open.** Still open by design/feature: **A8** (person pages — impersonation-only), real **enforcement** behind the honest labels (lockdown/backup/grade-hash/RBAC/2FA), **A9** Batch Import (held for credential fix), **SAChangeAlerts** field-contract (correctness), and the **22 low cosmetic** items (fallbacks, loading/empty states, a few dead buttons).

---

## Verdict

The console is **~half genuinely built and wired, ~a quarter partial/orphaned, and ~a quarter fabricated operator trust-signals.**

- **The real core is strong** — the school-approval pipeline, all reference-data/taxonomy CRUD, the Academic Year/Term lifecycle with real per-school cascade rollout (the best-engineered feature), impersonation hardening, grade-stats, and the security/forensics/broadcast *backend* feeds all compute from real tables with proper loading/empty/error states.
- **The danger is the top layer** — on an *operator/security* console, several trust signals are fabricated (health, backups, lockdown, grade-integrity, forensics chain-of-custody, RBAC, per-user security), so the operator can be **misled into believing health is green, backups exist, lockdowns work, and grades are cryptographically verified — none of which is true.**
- **Two genuine tenant-exposure bugs** remain (staff PII leak, class/subject IDOR).

---

## ✅ Already fixed (this session — uncommitted unless noted)

- **Cross-tenant PII** on bare `/api/students|parents|teachers` — superadmin now requires explicit `?school_id=`.
- **Staff PII gate (A1)** — `2026-06-23` — applied the same `?school_id=`-required guard to `getSuperBursars`/`getSuperPrincipals` (`/api/bursars/`, `/api/principals/`), closing the national-ID/bank/salary leak. *(SAStaffManager list now renders empty until a school is selected — it needs a list-level school selector, same gap as the person pages.)*
- **Impersonation hardening** — 30-min token TTL, `POST /api/impersonate/end/`, per-mutation audit trail.
- **`settings`** restricted to SUPERADMIN-only.
- **Sidebar Onboarding badge** count bug + **reconsider** transition (committed: `a32fe7b`).
- **Sidebar IA** — deduped duplicate Grades/Security-logs/Terms rows (committed: `2d47af2`).

---

## 🔴 Open HIGH-severity items

**Tenant isolation (real exposure)**
1. ✅ **DONE (2026-06-23)** — `GET /api/bursars/` + `/api/principals/` staff PII leak closed with the `?school_id=`-required guard. *(A1)*
2. ✅ **DONE (2026-06-23)** — Class/Subject by-ID IDOR closed: a `denyCrossTenant` ownership guard now gates all 21 by-id class/subject handlers (12 mutations + 9 reads); `school_id` stripped from both `update` paths. *(A2)*

**Fabricated operator trust-signals** — ✅ **labeling pass DONE (2026-06-23)** (stop asserting false green; build real enforcement later):
3. Lockdown → "recorded / not enforced" everywhere *(A3)* · 4. Backup → "records entry only, no dump" *(A4)* · 5. Grade-integrity hash/blockchain theater removed: per-card badge, audit-detail "illustrative" banner, 100% stat *(A5)* · 6. System-health probed/honest *(A6, B3)* · 7. Benchmarks 100% integrity → real student count *(A7)* · 8. Forensics chain-of-custody/signature labelled illustrative *(B4)* · 9. ✅ SAUsers fully done — Reset Password **wired**, 2FA/Suspend honest, fabricated risk-sparkline removed + risk "not tracked", red "100% lack 2FA" alarm → neutral notice *(B6)* · 10. SAGovernance "Preview — not enforced" banner *(B7)* · plus SAOverview pills/integrity card, SANotifications backup notice, SASettings 2FA mock + Export "redacted" claim.

**Reachability / correctness**
11. **Decided (2026-06-23)** — Students/Teachers/Parents kept **impersonation-only** by design: a direct SA school-picker would do cross-tenant CRUD on the superadmin token, bypassing the impersonation audit trail. Not changed. *(A8)*
12. ✅ **PARTLY DONE (2026-06-23)** — removed the false "redacted per compliance" claim and noted only Schools is exported. *(Backend still ignores the datasets param — honest label in place; real per-dataset export pending.)* *(A10)*
13. ✅ **PARTLY DONE (2026-06-23)** — Virtual Meetings unstranded via the impersonation route (granted `school_admin` in permissions.js → shows in school-admin nav; SA reaches via "Enter a School", audited). **Batch Import still held** pending its plaintext-credential CSV fix. Classes/Subjects/account pages are intentionally impersonation-only (not orphaned bugs). *(A9)*
14. ✅ **DONE (2026-06-23)** — `SAVersionCompare` now an honest single-submission review (no fake v1 diff above Approve) *(B1)*; `SAAppHistory` is a reconstructed, clearly-labelled timeline from real status fields (no fake quote/dates/revisions), "Compare Versions" removed *(B2)*. EK-SMS stores no prior revisions, so there's genuinely nothing to diff.
15. ✅ **DONE (2026-06-23)** — Security-log → Forensics drill-through now resolves the case after `cases` load (was a stale `useState` initializer that opened nothing). *(B5)*

*(IDs map to the risk numbering in `SUPER-ADMIN-AUDIT.md`.)*

---

## Remediation plan (suggested order)

| # | Action | Why first | Rough effort |
|---|--------|-----------|--------------|
| 1 | ✅ **DONE** — Staff PII gate on `getSuperBursars`/`getSuperPrincipals` | Same guard as students/teachers/parents; HIGH, live exposure | _done 2026-06-23_ |
| 2 | ✅ **DONE** — Tenant checks on class/subject/assignment routes (`denyCrossTenant` guard on all 21 by-id handlers) + `school_id` stripped from `update` | HIGH IDOR; exploitable during impersonation | _done 2026-06-23_ |
| 3 | ✅ **DONE (labeling pass)** — Lockdown, Backup, Export, System-health, Grade-integrity (×3), Benchmarks, Governance RBAC, Forensics, SAUsers (reset **wired**), Overview, Notifications, 2FA all made honest (label/disable/remove false green). **Optional remaining:** real *enforcement* for any of these + SAUsers risk-sparkline/2FA-banner | A security console must not assert false green | _done 2026-06-23_ |
| 4 | ✅ **DONE** — onboarding pipeline: removed the fabricated v1 diff (SAVersionCompare → honest single-submission review) and synthetic history (SAAppHistory → reconstructed + labelled). *Optional future:* a real `SchoolRegistrationVersion` snapshot store if true revision history is wanted | Operator approves on false data | _done 2026-06-23_ |
| 5 | ✅ **MOSTLY DONE** — Forensics drill-through fixed (B5); Virtual Meetings unstranded via impersonation/`school_admin` (A9); person pages kept impersonation-only by design (A8). **Remaining:** Batch Import (held for credential fix); optional collapse of the 3 vm-* rows into one audience-tabbed page | Cheap; unlocks already-built work | _done 2026-06-23 (partial)_ |
| 6 | **Correctness cleanup** — Bulk Export datasets, SAChangeAlerts field contract, batch grade total/letter, notification persistence | Medium | ongoing |

---

## How to read the detail

Each finding in [`SUPER-ADMIN-AUDIT.md`](./SUPER-ADMIN-AUDIT.md) carries a **`file:line` evidence pointer** and a **verification status**. The **Verification Corrections** sections list claims the adversarial pass *refuted or nuanced* — kept for honesty so nothing is overstated.
