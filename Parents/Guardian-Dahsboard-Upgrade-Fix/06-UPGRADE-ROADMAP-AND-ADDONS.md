# Parent / Guardian Dashboard — Upgrade & Fix Roadmap

Part 6 of the Parent Dashboard audit — generated 2026-07-03.

The actionable backlog, sequenced. Effort is rough: **S** ≤ half a day, **M** ~1–2 days, **L** ~3+ days. "Why" cites the plan section or the bug. Every item traces to a finding in [02](02-PLAN-GAP-ANALYSIS.md)/[03](03-BACKEND-API-CONTRACT-AUDIT.md)/[04](04-UI-UX-MODALS-RESPONSIVENESS.md).

The ordering matters: **P0 items are prerequisites** — until they land, you cannot even see whether anything else works.

## P0 — Ship-blockers (portal is non-functional / unsafe without these)

| # | Fix | Why | Files | Effort |
|---|---|---|---|---|
| P0-1 | Wrap `ParentDashboard` in `SchoolContextProvider` (as `TeacherDashboard.js:481` does), or switch `SchoolContextBanner` + `ParentGrades` to `useSchoolContextStandalone` | Portal **white-screens on mount** — throwing `useSchoolContext()` in the header, outside the ErrorBoundary. **✅ Reproduced in-browser 2026-07-03: `#root` empties and the app throws "useSchoolContext must be used within a SchoolContextProvider" at `SchoolContextBanner`.** | [ParentDashboard.js](../../src/components/parent/ParentDashboard.js), [SchoolContextBanner.js](../../src/components/common/SchoolContextBanner.js), [ParentGrades.js:185](../../src/components/parent/ParentGrades.js#L185) | S |
| P0-2 | Remove the `is_active` filter in `getParentStudentIds` (use `status` once an "accepted" state exists) | `GET /children/` 500s on an unknown column → the whole portal has no children server-side | [parentController.js:41](../../backend_node/src/controllers/parentController.js#L41), [CoGuardian.js](../../backend_node/src/models/CoGuardian.js) | S |
| P0-3 | Switch `parentApi.js` reads to `apiClient.get(...)` and writes to `post/patch/delete` | Every read returns an unparsed `Response` → all screens permanently empty | [parentApi.js](../../src/api/parentApi.js) | S–M |
| P0-4 | Add ownership checks (`getParentStudentIds` → 403) to `getChildGrades`, `getChildAttendance`, `getChildFees`; add a `role === 'parent'` gate to the router | **IDOR** — any authenticated user reads any student's grades/attendance/fees | [parentController.js](../../backend_node/src/controllers/parentController.js), [routes/parent.js](../../backend_node/src/routes/parent.js) | S |
| P0-5 | Scope `getAccessLog` + `getFamilyActivity` to `req.user.id`/`school_id` | Cross-tenant PII breach — returns the **entire** platform audit log | [parentController.js:759,1782](../../backend_node/src/controllers/parentController.js#L759) | S |
| P0-6 | `startPayment` → create `pending` Payment, only settle after a real gateway confirms; same for `donateToCampaign` | Fake payments — a parent can zero fees / fund campaigns without paying | [parentController.js:571,1544](../../backend_node/src/controllers/parentController.js#L571) | M (S to stop faking; L for real gateway) |

**P0 is small.** Five of six are S. Landing P0-1/2/3 together is what turns the portal from a white screen into something that renders real data; P0-4/5/6 are the things that would be dangerous in production.

## P1 — Plan completion (make the existing screens actually work)

| # | Fix | Why (plan) | Effort |
|---|---|---|---|
| P1-1 | Standardize the read contract: serialize camelCase + unwrap list envelopes server-side (or read `response.<key>` + snake_case in the FE); render `grade.subject.name` | §3.1 every read screen crashes/blanks on shape drift | M |
| P1-2 | Fix the 7 broken POST bodies + 3 route-param 404s (objection, whistleblower, teacher-message, co-guardian, pickup, sign-slip, acknowledge; receipt/co-guardian/pickup deletes) | §3.2/§3.4/§3.5/§1.6 every write 400/404s | M |
| P1-3 | Route child linkage through the `StudentParent` join table; drop the dead phone match | §1.6 phone-linked guardians currently see **no** children | M |
| P1-4 | Real report-card PDF with a signed verification hash + QR; give "Verify a doc" a hash input | §2.4 / MVP-3, Flow 3 | L |
| P1-5 | Notification center: unify the page hook + badge context on one source; derive child filters from real children; align `is_read`/`created_at` | §3.3 / MVP-4 | M |
| P1-6 | Attendance: build the month grid from the flat date list; wire prev/next to the `monthStart` param; map log fields; drop the fake integrity banner | §3.1 | M |
| P1-7 | Behaviour: map `incident_type`→display type, guard `entry.teacher`, use `created_at`; decide if commendations exist server-side | §3.1 teacher comments | S–M |
| P1-8 | Teacher messaging: send `teacher_id`; scope threads by child+subject; align message fields | §3.2 | M |
| P1-9 | Whistleblower: align the submit body, return bare arrays, **encrypt** report bodies, strip identity/IP | §3.4 | M |
| P1-10 | Fix `updateParentProfile`/2FA to load a real `User` instance; build the profile edit form or remove the button | §1.6 | M |
| P1-11 | Receipts: fix the `:id` param, generate a real receipt PDF, extend `/verify` to resolve payment hashes | §4.2 | M |

## P2 — Polish (turn working screens into a good product)

| # | Fix | Ref | Effort |
|---|---|---|---|
| P2-1 | Replace hardcoded `rgba(255,255,255,0.0x)` surfaces with theme tokens across 19 CSS files | [04 Finding 1](04-UI-UX-MODALS-RESPONSIVENESS.md) | M |
| P2-2 | Build one shared accessible-dialog primitive (role/aria-modal/focus-trap/Escape) and use it in every modal/drawer | [04 Finding 3](04-UI-UX-MODALS-RESPONSIVENESS.md) | M |
| P2-3 | Shell a11y: aria-labels on icon buttons, `aria-current`, `aria-expanded`, skip link, mobile Escape/focus-trap | [04 Finding 4](04-UI-UX-MODALS-RESPONSIVENESS.md) | S |
| P2-4 | Fix modal theming for light mode; bump touch targets to ≥44px | [04 Findings 2, touch](04-UI-UX-MODALS-RESPONSIVENESS.md) | S |
| P2-5 | Responsiveness: delete dead `.par-fees__*` CSS; add 600/400/360 to Fees + Compare; label mobile grade cells; decide on the bottom nav (render or delete the 70px gap) | [04 Responsiveness](04-UI-UX-MODALS-RESPONSIVENESS.md) | S–M |
| P2-6 | Remove fake/misleading UI: print-summary QR, `ParentVerification`, decorative "blockchain" buttons, hardcoded Home stats | [05 Part A](05-FEATURES-WITHOUT-UI-AND-UI-WITHOUT-BACKEND.md) | S |
| P2-7 | Delete dead code: `parentMockData`, `parentMockExtras`, orphaned components not being kept | [05 Part C](05-FEATURES-WITHOUT-UI-AND-UI-WITHOUT-BACKEND.md) | S |
| P2-8 | Mount or remove the orphans (`FamilyBento`, `WhereIveBeen`, `TamperCounter`, `ChannelPreferences`) — after their endpoints are scoped | [05 Part C](05-FEATURES-WITHOUT-UI-AND-UI-WITHOUT-BACKEND.md) | S–M |

## P3 — Add-ons & enhancements (grounded in the plan; after the base works)

| # | Enhancement | Plan basis | Effort |
|---|---|---|---|
| P3-1 | Real mobile-money integration (Orange Money/Africell), bank transfer, card; installments, late fees, discounts, webhook confirmation | §4.1 | L |
| P3-2 | Real Event/announcement model: calendar, scheduled publishing, audience targeting, attachments, acknowledgment tracking | §3.5 | L |
| P3-3 | Push/SMS/Email dispatch transport with the plan's in-app > push > email > SMS priority; per-category channel storage | §3.3 | L |
| P3-4 | Messaging Phase-2: attachments, read receipts, archiving; child/subject-scoped threads | §3.2 | M–L |
| P3-5 | Emit a parent Notification on locked-record modification attempts / fee / attendance anomalies; scope `getTamperCount` per child | §1.2, §7.2 | M |
| P3-6 | Receipt lookup portal + email/SMS receipt delivery | §4.2 | M |
| P3-7 | Predictive at-risk alerts surfaced to parents (attendance/grade trajectory) | §5.1 | L |
| P3-8 | Multi-language (i18n is already scaffolded via `I18nProvider`) and offline/PWA resilience | §6.3, §6.1, §7.4 | L |
| P3-9 | Finish or cut the extra add-ons (compare, digest, end-of-term pack, co-guardians, pickup, permission slips, donations, wellbeing) per product call | beyond plan | varies |

## Suggested sprint sequence

- **Sprint 1 — "Make it render safely."** All of P0. Small, high-impact, and it makes the security holes safe. After this, the portal loads real children/grades/notifications and the dangerous endpoints are scoped. This is the single most valuable sprint.
- **Sprint 2 — "Make the reads real."** P1-1, P1-3, P1-5, P1-6, P1-7 (the read screens) + P2-1 (surfaces) so the working data actually looks right.
- **Sprint 3 — "Make the writes real."** P1-2, P1-8, P1-9, P1-10 (writes) + P2-2/P2-3 (dialog + shell a11y).
- **Sprint 4 — "MVP-complete."** P1-4 (report-card PDF+QR) and P1-11 (receipts) — the §2.4 document-integrity story, which is the plan's core value proposition.
- **Sprint 5 — "Cleanup + honesty."** P2-5/6/7/8 — kill dead code, remove false-authenticity UI, mount or cut orphans.
- **Then P3** as product priorities dictate; P3-1 (real payments) and P3-2 (events) are the biggest.

## The one-line summary for a standup

> The Parent portal is feature-complete on the surface and broken underneath. Six small P0 fixes make it render and make it safe; the rest is aligning a contract the frontend and backend never agreed on. Real payments, a real events model, and a real notification transport are the only genuinely new builds.
