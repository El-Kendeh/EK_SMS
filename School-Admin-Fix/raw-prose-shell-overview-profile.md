I'll audit the "shell-overview-profile" slice. Let me start by reading the core files.

Let me read the rest of the shell file and the key components.

This is critical. SAOverview is the superadmin command center being rendered for school_admin. Let me read SAProfile, SANotifications, the branding context, and permissions.

Now I have major findings. Both SAOverview, SAProfile, and SANotifications are the superadmin command-center components rendered verbatim for school_admin. Let me read the branding context, permissions, and verify backend endpoints.

Now I have the full picture of the frontend. The critical finding: when `school_admin` logs in, the `overview` page renders `SAOverview` — the superadmin's "Command Center" — which fetches `/api/schools/` (all platform schools), `/api/security-counters/`, `/api/security-logs/` (platform-wide audit log). Let me verify the data flow and the backend endpoints.

First, how `schools` is populated for school_admin: line 502-503, `fetchMySchool(parsed.school_id)` → `GET /api/schools/{schoolId}/` → sets `schools` to `[data.school]`. So SAOverview gets just their own school. But it still calls `/api/security-counters/` and `/api/security-logs/`. Let me check those endpoints and their role gating.

Now let me examine the superadmin route's auth gating and the security-logs / security-counters / schools endpoints to determine if a school_admin can reach them.

Key findings confirmed. `sa` router uses `requireRole(['superadmin'])` and `sa.get('/schools/')` and `/security-logs/`, `/security-counters/` are mounted under it. So for a school_admin:

- `GET /api/schools/` → 403 (but for school_admin, the shell calls `fetchMySchool` → `/api/schools/{id}/` instead). Let me verify `/api/schools/{id}/` exists and is reachable.
- `GET /api/security-logs/` and `/api/security-counters/` (called by SAOverview, SAProfile, SANotifications) → **403 for school_admin** because they're behind `requireRole(['superadmin'])`.

Let me check the `/api/schools/:id/` route and verify how `sa` is mounted, plus confirm the profile/change-password endpoints work for school_admin.

Confirmed. Now let me find where `/api/schools/:id/` is routed (the school_admin's `fetchMySchool` call) and verify it exists and isn't superadmin-gated. Let me also check the `getProfile`/`patchProfile`/`postChangePassword` controllers to see what they do for a school_admin.

There is NO `/api/schools/:id/` route. The school_admin shell calls `fetchMySchool(parsed.school_id)` → `GET /api/schools/{schoolId}/` (SuperadminDashboard.js line 485). And `/api/schools/` (without id) is the only schools route and it's superadmin-gated. Let me check how routes are mounted in index.js to confirm there's no other `/schools/:id/` and check the `getProfile`/`postChangePassword` controllers.

Now critical findings are crystallizing. Let me verify two things:

1. The `getProfile`/`patchProfile`/`postChangePassword`/`getAdminSettings` are **shared** (not superadmin gated), so they DO work for school_admin. But: `getProfile` returns the school_admin's own user record (good), BUT `getAdminSettings` (`loadSettings()`) reads a **global** settings row — not per-school. So phone/bio/language/timezone/avatarColor saved by a school_admin write to a global shared settings row, and `patchAdminSettings` writes them globally. Let me confirm `loadSettings` is global.

2. Confirm `/api/schools/:id/` truly doesn't exist (it would 404), breaking school_admin's `fetchMySchool`.

Confirmed: `loadSettings()` always uses `id: 1` — a single global `SuperadminSettings` row. So when a school_admin saves Preferences (phone/bio/language/timezone/avatarColor), `patchAdminSettings` writes to the SAME global row the superadmin uses. This is a cross-tenant data-integrity/leak bug: every school_admin and the superadmin share one settings row.

Now let me verify there's genuinely no `/api/schools/:id/` route by checking the school router and confirming `fetchMySchool` 404s. Let me look at school.js routes fully.

Confirmed there's no `/api/schools/:id/` route anywhere. So `fetchMySchool(school_id)` → `GET /api/schools/{id}/` hits the 404 handler. The `ApiClient.get` will throw, caught silently (line 487), and `setIsLoading(false)` runs in `finally`. So `schools` stays `[]` for a school_admin.

Consequence for the overview: SAOverview receives `schools=[]`. So Total Schools = 0, Active = 0, all stats show zero. But branding (schoolName/badge) comes from the separate `/api/school/info/` context, so the sidebar shows the school name. Let me verify the ApiClient throws on 404 and check the `getAllSchools` to confirm `/api/schools/` is fully blocked. Let me quickly confirm ApiClient behavior.

All confirmed. Non-OK responses throw, caught silently in the overview/profile/notifications fetches. So for a school_admin:

- `/api/schools/{id}/` → 404 → throws → `schools=[]`
- `/api/security-counters/`, `/api/security-logs/` → 403 (requireRole superadmin) → throws → empty
- `/api/profile/`, `/api/admin-settings/`, `/api/change-password/` → shared, work (but admin-settings is global)

Now let me verify the `getSecurityLogs` controller doesn't somehow accidentally allow — already confirmed it's under the `sa` router with `requireRole(['superadmin'])`. Let me check the `attendance-report` permission note — actually that's out of my slice. Let me also confirm the `SAProfile` hardcoded "Super Admin"/"Super Administrator" labels are shown for school_admin (they are — lines 300, 418, 419). 

I have enough to write authoritative findings. Let me do one final check: confirm the `requireRole` middleware returns 403 (not auth-error) so the school_admin isn't logged out, and confirm there's no separate non-sa `/security-logs/` that would catch.

All confirmed. `requireRole` returns 403 with message "Access denied. Requires one of: superadmin." — not an auth error, so the school_admin is NOT logged out, the call just throws and is swallowed. The school_admin lands on a broken "Command Center."

I now have a complete, verified picture of the slice. Let me compile findings.

Summary of the slice's end-to-end reality for `school_admin`:

**Overview page** renders `SAOverview` ("Command Center") — a superadmin operator dashboard — verbatim. It says "Welcome back... here's what's happening", shows "Total Schools / Pending Review / Active Schools / Changes Requested" (all platform-onboarding stats), "Schools Snapshot", "Security Alerts", "Activity Feed", "Needs Attention" pending-applications list with a `onReview`→`handleReview` that sets activePage `review` (a superadmin-only page → stub for school_admin). For a school_admin, `schools=[]` (the `/api/schools/{id}/` 404), and `/api/security-*` are 403, so every stat is 0/empty and the security panel falls back to fabricated "0 threats blocked / 0 failed logins" placeholder alerts. None of it is relevant to running a single school.

Let me write the structured output.

The StructuredOutput requires `findings` at root (which I provided) — the error likely means the nested XML-style wasn't parsed as JSON. Let me re-call with proper JSON arrays.

The tool expects pure JSON arguments, not XML-tagged parameters. The harness is wrapping my parameters in XML but the schema validator sees them as strings. The issue is that `findings`, `workingWell`, etc. must be actual JSON arrays/objects, not strings. Let me retry passing them as proper structured values — the problem may be that I had a stray `</invoke>` typo. Let me re-issue cleanly.

The validator isn't seeing `findings`. The issue is likely that my `<findings>` content is a JSON string but the schema wants an actual array — the harness may be parsing each XML param as a plain string. Let me try a minimal call first to confirm the param-passing mechanism works, then build up.

