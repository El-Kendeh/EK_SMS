# Parent / Guardian Dashboard — Plan-Gap Analysis

Part 2 of the Parent Dashboard audit — generated 2026-07-03.

Maps every parent-relevant requirement in `ek-sms-complete-plan.md.pdf` to its implementation status. The plan names the parent as an actor across seven modules, not just §3.1 — so attendance, messaging, fees, whistleblower, events, and receipts are all in-scope parent-portal features at their respective phases. Status is **runtime reality**, and MVP-required items are separated from Phase-2/3 items.

Status key: 🟢 works · 🟠 built but broken/partial · 🔴 broken (blocker) · ⚪ not implemented.

## A. MVP-required parent features (Plan Part 3)

The plan's MVP Parent Portal is: view child's grades (real-time), view academic history, download report cards (PDF), notifications. MVP Parent Screens: (1) Dashboard/children overview, (2) Child grades view, (3) Report card download, (4) Notification center. Flow 3: login → linked students → term grades → subject breakdown → download PDF → scan QR to verify.

| MVP requirement | Status | Evidence | Gap |
|---|---|---|---|
| **Screen 1 — Children overview** | 🔴 | `useParentChildren` reads `data.children` off a raw Response → always `[]` ([useParentChildren.js:15](../../src/hooks/useParentChildren.js#L15)); backend `getChildren` also 500s on `CoGuardian.is_active` ([parentController.js:41](../../backend_node/src/controllers/parentController.js#L41)); shell crashes on mount anyway | Three stacked blockers on the single most important call |
| **Screen 2 — Child grades view** | 🔴 | `ParentGrades` calls `useSchoolContext()` with no provider → throws ([ParentGrades.js:185](../../src/components/parent/ParentGrades.js#L185)); grades read off a Response → `[]`; backend returns `subject` as an object rendered directly ([ParentGrades.js:104](../../src/components/parent/ParentGrades.js#L104)) | Core MVP + Flow-3 screen; own crash on top of the shell crash |
| **Screen 3 — Report card PDF download** | 🔴 | `downloadChildReportCard` returns plain JSON, **no PDF** ([parentController.js:282](../../backend_node/src/controllers/parentController.js#L282)); FE `window.document.write`s the value as HTML ([ParentReportCards.js:123](../../src/components/parent/ParentReportCards.js#L123)) | MVP "Download report cards (PDF)" unmet at the data layer |
| **Screen 4 — Notification center** | 🔴 | Both `useParentNotifications` and `ParentNotificationContext` read notifications off a Response → always `[]`; filters hardcoded `aminata`/`mohamed` ([ParentNotifications.js:9](../../src/components/parent/ParentNotifications.js#L9)) | Permanently "No notifications"; two non-shared notification layers |
| **Real-time grade viewing (§3.1)** | 🔴 | As Screen 2 | — |
| **Academic history (all terms)** | 🟠 | `getChildReportCards` groups published grades by term ([parentController.js:201](../../backend_node/src/controllers/parentController.js#L201)) — data exists but never lands (API bug) | Would work after the client + contract fix |
| **Report card QR verification (§2.4, Flow 3)** | 🔴 | No report-card `verificationHash` is ever generated; the in-dashboard "Verify a doc" renders `VerifyPage hash={null}` → error screen | §2.4 QR/signature path missing for report cards (grade-batch receipts do have one) |

> **Verification honesty note.** An analyst originally reported the report-card screen as crashing on `{card.term}` (object) and calling `verifyHash(undefined)`. Adversarial verification **downgraded** this: because the children list is always empty (API bug), `activeChild` is null, the report-cards fetch never fires, and the empty-state renders first — so those crash paths are *unreachable today*. They are latent and would surface only once the API-client bug is fixed. The feature is still a blocker (no PDF, no QR), but the specific crash mechanism does not fire at runtime. This is reflected above and in [03](03-BACKEND-API-CONTRACT-AUDIT.md).

## B. Other parent features named in the plan (Modules 1–4, 7)

| Plan ref | Feature | Status | Evidence / gap |
|---|---|---|---|
| §1.2 | System-wide change alerts to parents | 🟠 | `getTamperCount` ignores `:childId` and counts **all** `ForensicEvent` rows globally ([parentController.js:746](../../backend_node/src/controllers/parentController.js#L746)); no parent Notification is emitted on a modification attempt; `hasAlert` fields the cards read are never sent |
| §1.6 | View linked student(s) data only | 🔴 | **IDOR** — `getChildGrades`/`getChildAttendance`/`getChildFees` have no ownership check; any authenticated user reads any student's records by `childId` |
| §1.6 | Receive notifications | 🔴 | Notification center broken (§A) |
| §1.6 | Pay fees | 🔴 | Payment is faked with no gateway (§4.1 below) |
| §1.6 | Submit feedback (grade objection) | 🔴 | `submitModificationObjection` 400s — FE sends `{message}`, controller requires `reason` ([parentController.js:791](../../backend_node/src/controllers/parentController.js#L791)) |
| §1.6 | Multiple guardians per student | 🔴 | Invite 400s (`student_id`/`guardian_email` required); canonical `StudentParent` join table unused; phone linkage dead (`User` has no `phone` column) |
| §2.4 | Report cards & transcripts (PDF, signature, QR) | 🔴 | Returns JSON, not PDF; no signature; no per-report-card QR (§A Screen 3) |
| §3.1 | Attendance records | 🟠→🔴 | Empty (API bug) + calendar/log shape drift (`d.day`/`weekend` vs flat `{date,status}`) + dead prev/next-month buttons ([ParentAttendance.js:106](../../src/components/parent/ParentAttendance.js#L106)) + IDOR |
| §3.1 | Teacher comments | 🟠→🔴 | Behaviour ledger empty (API bug); latent `entry.teacher.split()` TypeError once data flows ([ParentBehavior.js:123](../../src/components/parent/ParentBehavior.js#L123)); no commendation vs violation distinction in the source model |
| §3.1 | Fee status & payment history | 🔴 | Empty (API bug) + IDOR on `getChildFees` |
| §3.1 | Upcoming events | 🟠 | `/events` aliases Notification rows ([parentController.js:1478](../../backend_node/src/controllers/parentController.js#L1478)); a separate `virtual-meetings` controller feeds Home's "upcoming meetings" |
| §3.2 | Teacher↔parent messaging | 🔴 | Send always 400 (needs `teacher_id`); threads not child/subject-scoped; no read-receipts/attachments/archive (Phase-2) |
| §3.3 | Push/SMS/Email alerts | ⚪/🔴 | **No dispatch transport exists** — alerting is in-app only, and in-app is broken. Channel-preference matrix is fabricated (model stores one boolean per channel) and the screen is orphaned |
| §3.4 | Anonymous whistleblower | 🔴 | Submit 400s (needs `title`+`description`); crashes on mount (`categories.map` on a Response); stored **plaintext + school-tagged**, not encrypted; `anonymous` flag never sent → §3.4 privacy guarantees unmet |
| §3.5 | Event & announcement broadcasting | ⚪ | No Event model; no scheduled publishing, targeting, attachments, or acknowledgment tracking |
| §4.1 | Cashless fee payment | 🔴 | **`startPayment` fabricates a `completed` payment** with no Orange Money/bank/card processor and reduces the fee balance ([parentController.js:571](../../backend_node/src/controllers/parentController.js#L571)) — a parent can zero fees without paying. Channels hardcoded; installments accepted but unused |
| §4.2 | Automated receipt generation | 🔴 | Download 404s (`:id` vs `receiptId` param); no PDF; payment-receipt QRs don't verify at public `/verify`; no email/SMS delivery |
| §7.2 | Automated stakeholder alerting (parent = oversight) | 🟠 | Depends on the broken notification + tamper systems |

## C. Cross-tenant / security gaps against the plan's anti-corruption mission

The plan's entire premise (§1, §7) is transparency and tenant isolation. Several parent endpoints violate it — detail in [03](03-BACKEND-API-CONTRACT-AUDIT.md):

- `getAccessLog` and `getFamilyActivity` return the **entire platform `SecurityAuditLog`** (all users, all schools) to any parent.
- `getParentNotifications` / `getParentEvents` leak global (`user_id IS NULL`) rows across tenants.
- No `role === 'parent'` gate on the parent router — any authenticated token hits every endpoint.
- Whistleblower reports are not encrypted despite §3.4.

## D. Built beyond the plan (add-ons already present)

The team shipped a lot the plan never asked for. All are present, all currently non-functional for the same four root causes, and several are orphaned:

| Add-on | Nav | Notes |
|---|---|---|
| Compare children | Yes | Needs ≥2 children (never resolves); metric field drift |
| Weekly + voice digest | Yes | "AI-summarised" is a plain aggregate query; TTS wiring fine |
| End-of-term pack | Yes | Produces a JSON item list, **not** a real ZIP/PDF |
| Print family summary | Yes | Fabricates a client-side "integrity hash" + QR that no server signed — **do not ship as an authenticity guarantee** |
| Co-guardians | Yes | Invite/remove both broken (contract + route param) |
| Pickup allow-list + gate QR | Yes | Write broken; gate QR never verifies |
| Permission slips (OTP sign) | Yes | Sign 400s; OTP never validated server-side (cosmetic gate) |
| Donations / sponsor-a-student | Yes | Crashes on load; fake-success "donation" with no processor |
| Wellbeing / counsellor | Yes | Crashes; "send anonymously" flag silently dropped → never anonymous |
| Tamper counter, Where-I've-been, Family bento, Parent verification | ORPHAN | Never mounted; see [01](01-CURRENT-STATE-INVENTORY.md) |

**Recommendation on add-ons:** they exceed the spec and are all blocked by the base defects. Once the portal renders, decide per-item whether to finish or cut. Two must not ship as-is regardless: the **fabricated print-summary QR** (false authenticity) and **`ParentVerification`'s fake validator-node UI** (misrepresents the system's security model).

## Summary

Not one parent-relevant plan feature works end-to-end today except the shared public `/verify/:hash` page. But the coverage is remarkably complete — the plan's MVP screens and most Phase-2/3 features all have real UI and real (if broken) endpoints. The gap is integration and correctness, not absence. The genuine "not implemented at all" items are narrow: real payment-gateway integration (§4.1), a real Event/calendar model (§3.5), push/SMS transport (§3.3), and real report-card PDF+signature generation (§2.4).
