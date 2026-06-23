# School Admin — Audit & Fix Workspace

**Created:** 2026-06-23
**Scope:** The entire **School Admin** (`role='school_admin'`) experience — frontend UI and backend — in EK_SMS.
**Method:** 6 parallel read-only audit agents across ~35k lines (16k frontend + 17k backend controllers + routes/middleware), with all security-decisive facts re-verified by direct source reads.

> **School Admin** = a tenant administrator who manages **one** school (their own).
> Distinct from **Super Admin** (`is_superuser`), the platform operator. This audit is about the *tenant* admin.

---

## How to read these docs

Start at the top and go down. Each doc is self-contained but they build on each other.

| # | Doc | What's in it |
|---|-----|--------------|
| — | [00-EXECUTIVE-SUMMARY.md](00-EXECUTIVE-SUMMARY.md) | One-page picture for decision-makers: the big reframing + top risks + what's broken |
| 1 | [01-ARCHITECTURE-live-vs-dead.md](01-ARCHITECTURE-live-vs-dead.md) | **Read this first.** The two parallel frontends, the import graph, exactly what a school_admin reaches |
| 2 | [02-security-and-risks.md](02-security-and-risks.md) | Ranked backend security findings, each with file:line, evidence, and fix |
| 3 | [03-workflow-ui-status.md](03-workflow-ui-status.md) | Partially-built / broken workflow UI: 404 pages, mock data, crashes, stubs, UX gaps |
| 4 | [04-dead-code-inventory.md](04-dead-code-inventory.md) | The orphaned `schooladmin/` graveyard + what's worth salvaging |
| 5 | [05-contract-and-integration.md](05-contract-and-integration.md) | FE↔BE mismatches, the two divergent API contracts, enforcement gaps |
| 6 | [06-fix-plan.md](06-fix-plan.md) | **Prioritized, actionable remediation checklist** with effort estimates |
| A | [APPENDIX-endpoint-inventory.md](APPENDIX-endpoint-inventory.md) | Full mounted-endpoint list + every FE call + the mismatch table (reference data) |

---

## Status legend (used throughout)

| Badge | Meaning |
|-------|---------|
| ✅ LIVE & WORKING | Mounted, reachable by school_admin, wired to a real endpoint that exists |
| 🟡 LIVE & PARTIAL | Reachable and works, but incomplete / UX gaps / mock sub-sections |
| 🟠 LIVE & BROKEN | Reachable, renders, but a key action 404s, crashes, or is fake |
| 🔵 STUB | Reachable but resolves to an "under development" placeholder |
| ⚫ DEAD | Exists in the repo but nothing imports/mounts it — unreachable |

| Severity | Meaning |
|----------|---------|
| 🔴 CRITICAL | Exploitable now / data-integrity breach / auth bypass |
| 🟠 HIGH | Serious correctness or privilege issue |
| 🟡 MEDIUM | Real defect, bounded impact |
| 🟢 LOW / GOOD | Minor, or a verified-correct area |

---

## Headline (TL;DR)

1. **Two parallel School-Admin frontends exist; most of the polished `schooladmin/` folder is dead code.** The live UI is `superadmin/SA*.js` + a handful of `schooladmin/` add-on pages. See doc 01.
2. **Security is asymmetric.** The refactored `/api/*` people-management routes are properly role-gated **and** tenant-scoped (verified). The older `/api/school/*` surface has **no role enforcement** and an **unconditional auth backdoor**. See doc 02.
3. **Several live pages render but their main action silently 404s** (Promotions, AI Capture, Exam results, Room edit/delete, Teacher-assignment delete). See doc 03.
4. **Verified-fixed:** the prior "principals/bursars PII leak" is closed (`scopedSchoolId`). See doc 02 §Verified-Safe.

---

## Verification status of claims

- **Re-verified by direct source read:** the auth backdoor, the missing `requireRole`, `saveGrades` bypass, `reviewModificationRequest` no-op, `scopedSchoolId` tenant scoping (live routes safe), the hardcoded Gemini key, the full frontend import graph (live vs dead), `permissions.js`, the shell render switch, and the `/api/school/*` route inventory.
- **Agent-reported, cross-checked against the route file:** the per-page UI catalogs, the FinanceUsers "View" crash, the SAParents password bug, the fabricated capacity bars, and the specific 404 list.

Each finding in docs 02–05 is tagged `[verified]` or `[agent, cross-checked]`.
