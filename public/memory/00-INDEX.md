# EK-SMS File-Based Memory — Index

> Generated 2026-06-10. This folder is a **file-based memory set for Claude/Fable** to use
> when building the remaining dashboards (Principal, Finance/Bursar) and beyond.
> Read this index first, then jump to the file relevant to your current task.

## Files in this memory set

| File | Purpose |
|---|---|
| [01-ARCHITECTURE.md](01-ARCHITECTURE.md) | Real current stack (Node/Express/Sequelize backend, NOT Django), project layout, dashboard shell/routing pattern, how to add a new page |
| [02-API-REFERENCE.md](02-API-REFERENCE.md) | Full backend endpoint inventory (12 route files, ~487 endpoints), grouped by route file, with auth/role and response shapes for Principal/Finance |
| [03-FRONTEND-STATUS.md](03-FRONTEND-STATUS.md) | Per-role build status: what's done, what's a stub, what's missing entirely |
| [04-PRINCIPAL-DASHBOARD-PLAN.md](04-PRINCIPAL-DASHBOARD-PLAN.md) | Build-ready plan for the Principal dashboard (next priority) |
| [05-FINANCE-DASHBOARD-PLAN.md](05-FINANCE-DASHBOARD-PLAN.md) | Build-ready plan for the Finance/Bursar dashboard (priority after Principal) |
| [06-KNOWN-ISSUES.md](06-KNOWN-ISSUES.md) | Bugs/mismatches found during this audit that must be fixed as part of (or before) the new UI work |

## TL;DR — Current State (2026-06-10)

- **Backend is Node.js + Express + Sequelize** at `EK_SMS/backend_node/` (MySQL via Sequelize models). The old Django backend (`EK_SMS/eksms/`) referenced in the root project memory is **legacy/inactive** — `eksms_core` no longer contains models/views, only `manage.py` and management scripts remain.
- **Frontend is React 19 (CRA)** at `EK_SMS/src/`. ALL roles currently render inside **one giant component**: `src/components/superadmin/SuperadminDashboard.js` (1,127 lines), which conditionally renders role-specific "home" pages and sub-pages based on `user.role` and an `activePage` string.
- **Fully built & working roles**: Superadmin, Teacher, Student, Parent (each has a rich home dashboard + 30-50 sub-pages).
- **Stub-only roles**: Principal (2 placeholder files), Bursar/Finance (4 placeholder files). Backend support for both is largely ready (Finance ~100%, Principal ~90%) but the route file for `/api/principal` is missing several registrations.
- **Build priority** (per user's `/goal`): **Principal dashboard first, then Finance/Bursar dashboard.**
- A **critical routing bug** already causes silent 404s in the existing `PrincipalPage.jsx` (school-admin's principal-management page) — see [06-KNOWN-ISSUES.md](06-KNOWN-ISSUES.md) §1. Fix this as step 1 of the Principal dashboard work since the new dashboard will hit the same endpoints.

## Quick facts for any new dashboard page

- New top-level page = new file in `src/components/<role>/`, imported and registered inside `SuperadminDashboard.js` (sidebar nav entry + `activePage` switch). See [01-ARCHITECTURE.md](01-ARCHITECTURE.md) for the exact pattern with line references.
- Follow the **TeacherHome.js / StudentHome.js / ParentHome.js** pattern for new role "home" shells: hooks for data fetching, framer-motion animations, card-based grid layout.
- All API calls go through `src/api/client.js` (`ApiClient.get/post/put/...`). Principal needs `principalApi` extended in `src/api/adminApi.js`; Finance needs a brand-new `src/api/financeApi.js` (doesn't exist yet).
- **Mobile responsiveness is mandatory** for every new component (per root project memory) — add `@media (max-width: 600px)` rules to every new CSS file.
