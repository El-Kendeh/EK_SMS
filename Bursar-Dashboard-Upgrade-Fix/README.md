# Bursar / Finance Dashboard — Upgrade & Fix

Audit of the existing EK_SMS Bursar/Finance dashboard (UI · backend · functionality) against the system plan **Module 4 — Finance & Administration** (`EK_SMS/public/docu/ek-sms-complete-plan.md.pdf`) and Finance-Officer RBAC (Module 1.5/1.6).

**Date:** 2026-07-03 · **Scope:** `src/components/bursar/*`, `backend_node/src/controllers/financeController.js`, routes, models, migrations.
**Result:** 117 findings (3 critical · 31 high · 50 medium · 33 low) + 117 plan-gap observations across 13 audit passes.

## Start here → [00 · Executive Summary](00-EXECUTIVE-SUMMARY.md)

| Doc | What's in it |
|---|---|
| [00 · Executive Summary](00-EXECUTIVE-SUMMARY.md) | Verdict, scorecard, top-12 must-fix, 3-wave roadmap, index |
| [01 · UI/UX & Responsiveness](01-UI-UX-AND-RESPONSIVENESS-AUDIT.md) | Per-page UI issues, states, mobile, shared design-system fix |
| [02 · Backend & Data](02-BACKEND-AND-DATA-AUDIT.md) | Endpoint security/money/atomicity + data-model & migration gaps |
| [03 · Functionality & Contract Drift](03-FUNCTIONALITY-AND-CONTRACT-DRIFT.md) | Broken/half-working flows; FE↔BE mismatches |
| [04 · Plan-Gap Matrix](04-PLAN-GAP-MATRIX.md) | Every 4.1–4.6 + RBAC feature: Present / Partial / Missing |
| [05 · Roadmap & Features to Build](05-ROADMAP-AND-FEATURES-TO-BUILD.md) | Build plan for everything not yet implemented |
| [06 · Modals Audit](06-MODALS-AUDIT.md) | Per-modal fields, validation, a11y, required updates |

## The three-sentence version

The bursar suite records money well and the expense-approval workflow is genuinely solid, but the **bursar role is broken on Record Payment and Assign Fees** (403 on the student picker), **finance-user onboarding and suspension are both fake-success**, and the **money layer isn't safe** (FLOAT currency, non-unique receipts, no amount validation, a lost-update race). Against the plan, **Module 4 is ~one-third delivered** — cashless recording and expense tracking exist; receipts (QR/PDF/SMS/lookup), installments, late fees, revenue-vs-budget, mobile-money reconciliation, inventory, payroll, document management, and 2FA are missing. Fix the three criticals first (each is a small change that unblocks the whole role), then work Waves 1→3 in [05](05-ROADMAP-AND-FEATURES-TO-BUILD.md).

---

### Method & caveats
- Produced by 13 parallel audit agents reading the real source, cross-checked against the plan PDF.
- **Not** run through the adversarial verify pass (account session limit hit mid-run) — severities are auditor-assigned, single-pass. Confirm the criticals against the cited lines before acting.
- Two audit passes did not complete: the dedicated **Payments-page** deep audit and the **design/responsiveness** sweep. Their scope is partially covered by the modals, contract-drift, and shell audits; a focused pass on each is still owed (noted in [05](05-ROADMAP-AND-FEATURES-TO-BUILD.md)).
