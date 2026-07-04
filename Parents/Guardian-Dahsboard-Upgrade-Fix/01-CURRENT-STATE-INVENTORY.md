# Parent / Guardian Dashboard — Current-State Inventory

Part 1 of the Parent Dashboard audit — generated 2026-07-03.

Every component in `src/components/parent/`, plus the hooks, contexts, API client, and mock modules that back them. "Data source" and "backend wired" describe **runtime reality** (traced through the [parentApi raw-Response bug](03-BACKEND-API-CONTRACT-AUDIT.md) and the [contract drift](02-PLAN-GAP-ANALYSIS.md)), not merely whether a `fetch` call is written.

Legend — Data source: `real-api` = calls the live API · `mock` = renders bundled mock · `hardcoded` = literal values in JSX · `mixed`. Backend wired: `yes` = endpoint exists and shape matches · `partial` = endpoint exists but broken by API-client/contract · `no` = no reachable endpoint. Nav: which sidebar section renders it, or `ORPHAN` if unreachable.

## The shell

`ParentDashboard` mounts `I18nProvider > ChildProvider > ParentNotificationProvider` and renders `ParentInner`: a grouped off-canvas sidebar (3 groups, 22 items), sticky header (`ChildSwitcher`, theme toggle, notification bell, `SchoolContextBanner`), a `renderSection()` router, a trust footer, keyboard shortcuts, and a global live toast. It is **correctly mounted** — `App.js` role `parent` → `SuperadminDashboard.js` lazy-loads it. The shell itself is well-engineered; its one fatal flaw is rendering `SchoolContextBanner` (which needs a provider the parent tree never mounts) in the header, outside the ErrorBoundary — see [00, Finding 1](00-EXECUTIVE-SUMMARY.md).

## Full component table

| Component | Nav section | Purpose | Data source | Backend wired | Responsive | Severity |
|---|---|---|---|---|---|---|
| [ParentDashboard.js](../../src/components/parent/ParentDashboard.js) | (shell) | Portal shell, sidebar, header, router | real-api (indirect) | partial | good | 🔴 major (crashes on mount) |
| [ParentHome.js](../../src/components/parent/ParentHome.js) | home | Landing: stats, per-child cards, activity | mixed | partial | good | 🟠 major |
| [ParentChildren.js](../../src/components/parent/ParentChildren.js) | children | My-children detail cards | real-api | partial | good | 🟠 major |
| [ParentGrades.js](../../src/components/parent/ParentGrades.js) | grades | Grades table + history drawer (MVP-2) | real-api | partial | good | 🔴 blocker |
| [ParentReportCards.js](../../src/components/parent/ParentReportCards.js) | report-cards | Report cards + QR verify + PDF (MVP-3) | real-api | partial | good | 🔴 blocker |
| [ParentAttendance.js](../../src/components/parent/ParentAttendance.js) | attendance | Attendance calendar + logs | real-api | partial | good | 🟠 major |
| [ParentBehavior.js](../../src/components/parent/ParentBehavior.js) | behavior | Behaviour / teacher-comment ledger | real-api | partial | good | 🟠 major |
| [CompareChildren.js](../../src/components/parent/CompareChildren.js) | compare | Sibling side-by-side | real-api | partial | partial | 🟠 major |
| [WeeklyDigest.js](../../src/components/parent/WeeklyDigest.js) | digest | AI-labeled weekly digest + TTS | real-api | partial | good | 🟠 major |
| [ParentMessages.js](../../src/components/parent/ParentMessages.js) | messages | Teacher chat threads | real-api | partial | good | 🔴 blocker |
| [ParentTeacherConferences.js](../../src/components/parent/ParentTeacherConferences.js) | conferences | Book/cancel conference slots | real-api | partial | good | 🔴 blocker |
| [ParentWellbeing.js](../../src/components/parent/ParentWellbeing.js) | wellbeing | Counsellor thread (+ anon toggle) | real-api | partial | good | 🔴 blocker |
| [Donations.js](../../src/components/parent/Donations.js) | donations | Sponsor-a-student campaigns | real-api | partial | good | 🔴 blocker |
| [ParentNotifications.js](../../src/components/parent/ParentNotifications.js) | notifications | Notification center (MVP-4) | mixed | partial | good | 🔴 blocker |
| [ParentFees.js](../../src/components/parent/ParentFees.js) | fees | Fee ledger, pay flow, receipt, audit | mixed | partial | partial | 🔴 blocker |
| [CoGuardians.js](../../src/components/parent/CoGuardians.js) | co-guardians | List/invite/remove co-guardians | real-api | partial | good | 🔴 blocker |
| [PickupList.js](../../src/components/parent/PickupList.js) | pickup | Authorized-pickup allow-list + QR | real-api | partial | good | 🔴 blocker |
| [PermissionSlips.js](../../src/components/parent/PermissionSlips.js) | permission-slips | Sign school slips (OTP) | real-api | partial | good | 🔴 blocker |
| [EndOfTermPack.js](../../src/components/parent/EndOfTermPack.js) | end-of-term-pack | Downloadable term pack | real-api | partial | good | 🟠 major |
| [PrintFamilySummary.js](../../src/components/parent/PrintFamilySummary.js) | print-summary | A4 printable family snapshot | real-api | partial | good | 🟠 major |
| [ParentProfile.js](../../src/components/parent/ParentProfile.js) | profile | Identity, contact, notif prefs | real-api | partial | good | 🟠 major |
| [ParentWhistleblower.js](../../src/components/parent/ParentWhistleblower.js) | safe-report | Anonymous report + follow-up | real-api | partial | good | 🔴 blocker |
| [VerifyPage.js](../../src/components/student/VerifyPage.js) | verification | Public doc verify (shared w/ student) | real-api | **yes** | unknown | 🟠 major (mounted with `hash={null}`) |
| [ChildSwitcher.js](../../src/components/parent/ChildSwitcher.js) | (header) | Active-child pill switcher | none (ctx) | n/a | good | 🔵 minor |
| [LiveParentToast.js](../../src/components/parent/LiveParentToast.js) | (global) | Live notification toast | real-api | partial | good | 🔴 blocker (never fires) |
| [FamilyBento.js](../../src/components/parent/FamilyBento.js) | **ORPHAN** | Family-at-a-glance grid | real-api | yes | unknown | 🟠 major (never mounted) |
| [ChannelPreferences.js](../../src/components/parent/ChannelPreferences.js) | **ORPHAN** | 7×4 notif preference matrix | real-api | no | good | 🟠 major (never mounted) |
| [WhereIveBeen.js](../../src/components/parent/WhereIveBeen.js) | **ORPHAN** | Self-access log | real-api | partial | good | 🟠 major (never mounted) |
| [TamperCounter.js](../../src/components/parent/TamperCounter.js) | **ORPHAN** | Per-child tamper chip | real-api | partial | good | 🟠 major (never mounted) |
| [ParentVerification.js](../../src/components/parent/ParentVerification.js) | **ORPHAN** | Trust/validator marketing screen | **hardcoded** | no | good | 🟠 major (dead mock) |

Supporting infra:

| File | Role | Status |
|---|---|---|
| [parentApi.js](../../src/api/parentApi.js) | ~50-fn API client | 🔴 blocker — uses `api.request()` (raw Response) for every call; ~10 write bodies/params mismatched |
| [useParentChildren.js](../../src/hooks/useParentChildren.js) | Loads children + parent | 🔴 blocker — reads `data.children` off a Response → always `[]` |
| [useParentProfile.js](../../src/hooks/useParentProfile.js) | Loads profile | 🔴 blocker — `data.profile` → always `null` |
| [useParentNotifications.js](../../src/hooks/useParentNotifications.js) | Notif list + mark-read | 🔴 blocker — `data.notifications` → always `[]`; swallows errors |
| useChildGrades / useChildReportCards | Grades / report cards | 🔴 blocker — same Response bug |
| [ChildContext.js](../../src/context/ChildContext.js) | Active-child state | 🟢 logic sound; starved by empty children list |
| [ParentNotificationContext.js](../../src/context/ParentNotificationContext.js) | Poll + unread badge | 🔴 blocker — list always `[]` → badge/toast never fire; silent catch |
| [parentUtils.js](../../src/utils/parentUtils.js) | Presentation helpers | 🟢 used by 9 screens; `calcOverallAverage` uses `.score` (latent drift — API emits `total`) |
| [parentMockData.js](../../src/mock/parentMockData.js) | Rich core mock | ⚪ DEAD — zero importers |
| [parentMockExtras.js](../../src/mock/parentMockExtras.js) | Phase-2/3 mock | ⚪ DEAD — zero importers |

## Navigation groups (as wired in `ParentDashboard.js`)

`SECTION_PATHS` + `renderSection` cover all 22 nav keys — there are **no dead nav items** in the shell. The groups:

- **Academic** — Dashboard (`home`), My Children, Grades, Report Cards, Attendance, Behaviour, Compare, Weekly digest.
- **Community** — Messages, Conferences, Wellbeing, Sponsor (donations), Notifications.
- **Family** — Fees, Co-guardians, Pickup list, Permission slips, End-of-term pack, Print summary, Profile, Verify a doc, Safe Report.

Header (always on): `ChildSwitcher`, `SchoolContextBanner` (crash source), theme toggle, notification bell. Global: `LiveParentToast`.

Two nav slots are misleading even before the data layer:
- **"Verify a doc"** renders `<VerifyPage hash={null} />` ([ParentDashboard.js:166](../../src/components/parent/ParentDashboard.js#L166)) → `VerifyPage` immediately errors "Missing verification code." A first-class nav item is a permanent error screen (there's no field to type/scan a hash in-dashboard).
- **Profile → "Edit Profile"** only toggles a local boolean; no edit form is ever rendered ([ParentProfile.js:57](../../src/components/parent/ParentProfile.js#L57)).

## Orphaned components (built, unreachable in the parent portal)

Confirmed by grep — imported by no parent component and absent from `SECTION_PATHS`/`renderSection`:

1. **[FamilyBento.js](../../src/components/parent/FamilyBento.js)** — a family-at-a-glance grid with *real* tamper-count + fees wiring. The most finished orphan; would make a strong Home replacement. Never mounted.
2. **[WhereIveBeen.js](../../src/components/parent/WhereIveBeen.js)** — parent self-access log. Backs onto `getAccessLog`, which is a [cross-tenant leak](03-BACKEND-API-CONTRACT-AUDIT.md) — must **not** be surfaced until that query is scoped.
3. **[TamperCounter.js](../../src/components/parent/TamperCounter.js)** — per-child tamper chip (takes `childId` props). Backend `getTamperCount` is global/un-scoped, so it would show the same number for every child anyway.
4. **[ParentVerification.js](../../src/components/parent/ParentVerification.js)** — 100% hardcoded fake blockchain data (block `#8,492,102`, 12 validator nodes, RSA-4096). Misrepresents a distributed-ledger model the system does not use. Delete or rebuild.
5. **[ChannelPreferences.js](../../src/components/parent/ChannelPreferences.js)** (parent copy) — 7×4 notification matrix. No nav entry; the underlying model can't store per-category prefs anyway. Student/teacher have their own reachable copies.

Plus the two mock modules above (`parentMockData`, `parentMockExtras`) are dead code with zero importers.

## The one thing that works

**Public document verification** via `VerifyPage` at the public `/verify/:hash` route. It's the only correctly-wired data path in the portal: it goes through `studentApi.verifyHash` → `apiClient.get` (parsed JSON), and `routes/verify.js` returns a flat shape whose fields match the component. It works precisely because it does **not** use `parentApi`. That's the template every other screen should follow.
