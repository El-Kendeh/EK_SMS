# 00 — Executive Summary

**Audience:** product owner / lead. **Date:** 2026-06-23.

---

## The one thing to understand first

The codebase contains **two parallel implementations** of the School-Admin UI. The app has a single dashboard shell ([SuperadminDashboard.js](../src/components/superadmin/SuperadminDashboard.js)) that renders every role by an `activePage` key. For the core entities it mounts the **`superadmin/SA*.js`** components — **not** the richer-looking `schooladmin/` folder.

**Consequence:** roughly **70% of the `schooladmin/` directory (~16,000 lines) is dead code** — never imported, never reachable. It was an earlier, often more complete implementation (full add-student/add-teacher wizards, a gradebook, attendance, CSV reports, messaging) that has been superseded and orphaned. The live experience is the leaner `superadmin/SA*` pages plus ~10 `schooladmin/` "add-on" pages.

This single fact reframes everything: effort is being lost, two API contracts coexist, and anyone "continuing" the dead pages hits missing endpoints.

---

## Overall health by area

| Area | Verdict |
|------|---------|
| Core entity CRUD (students/teachers/classes/subjects/parents/principal/bursar) | ✅ **Live and functional** — create→credentials→list all work, correctly tenant-scoped |
| Tenant isolation on the live people surface | 🟢 **Verified safe** — `scopedSchoolId` enforced; prior PII-leak finding is closed |
| `/api/school/*` authorization | 🔴 **Broken** — no role checks at all; any logged-in tenant user can perform admin writes |
| Auth backdoor | 🔴 **Critical** — `TODO_JWT_TOKEN` → superuser, not environment-gated |
| Grade integrity (school-admin path) | 🟠 **Bypassed** — `saveGrades` writes with no audit/hash/approval |
| Add-on workflow pages | 🟠 **Several render but silently 404** on their main action |
| Finance-Users page | 🟠 **Crashes** on "View"; panels are fabricated |
| Report cards / Examination / Fees-structure (school admin) | 🔵 **Stubs** — "under development" |
| Polished wizards / gradebook / bulk-import / doc-upload | ⚫ **Dead** — exist but unreachable |

---

## Top risks (ranked)

| # | Risk | Severity | Where | Doc |
|---|------|----------|-------|-----|
| 1 | `TODO_JWT_TOKEN` unconditional superuser backdoor | 🔴 CRITICAL | [auth.js:26](../backend_node/src/middleware/auth.js#L26) | 02 |
| 2 | No `requireRole` on entire `/api/school/*` → vertical privilege escalation | 🔴 CRITICAL | [school.js:134](../backend_node/src/routes/school.js#L134) | 02 |
| 3 | `saveGrades` bypasses grade-integrity chain + trusts client `student_id` | 🟠 HIGH | [schoolController.js:1460](../backend_node/src/controllers/schoolController.js#L1460) | 02 |
| 4 | "Approve modification request" applies nothing (cosmetic no-op) | 🟠 HIGH | [schoolController.js:2204](../backend_node/src/controllers/schoolController.js#L2204) | 02 |
| 5 | `syllabusGenerator` has no tenant scoping + committed live Gemini key | 🟠 MED-HIGH | [syllabusGenerator.js:7](../backend_node/src/controllers/syllabusGenerator.js#L7) | 02 |
| 6 | Approval enforced only at login; tokens never re-validated/revoked | 🟡 MEDIUM | [auth.js](../backend_node/src/middleware/auth.js) / [DashboardGate.js](../src/components/DashboardGate.js) | 02 |
| 7 | Live pages whose main action 404s (Promotions, AI-Capture, etc.) | 🟠 HIGH (UX) | see doc 03 | 03 |
| 8 | Finance-Users "View" crashes; SAParents shows wrong password | 🟠 HIGH (UX) | doc 03 | 03 |

---

## What's genuinely good (don't "fix" these)

- **Live people-management routes are secured correctly** — role-gated (`requireRole(['superadmin','school_admin'])`) and tenant-scoped (`scopedSchoolId`), with per-id cross-tenant guards. [verified]
- **Core CRUD workflows are complete** on the live `SA*` pages: create + one-time credentials modal + edit + toggle/block/delete + class/subject assignment flows all hit real, existing endpoints.
- **The single-shell role adaptation is clean** — school selectors and cross-school columns are correctly hidden from a single-school admin.

---

## Recommended first moves

1. Delete the `TODO_JWT_TOKEN` backdoor (1 line).
2. Add `requireRole(['school_admin','superadmin'])` to the `/api/school/*` router (1 place).
3. Route/disable `saveGrades` and `reviewModificationRequest` so grade governance isn't silently defeated.
4. For each live 404 page: implement the endpoint or hide the action.
5. Fix the Finance-Users crash and the SAParents password display.
6. Quarantine/delete the dead `schooladmin/` tree after harvesting the wizards.

Full sequenced plan with effort estimates: [06-fix-plan.md](06-fix-plan.md).
