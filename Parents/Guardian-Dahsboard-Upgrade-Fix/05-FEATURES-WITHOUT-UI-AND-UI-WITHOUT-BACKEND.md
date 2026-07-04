# Parent / Guardian Dashboard — Features Without UI & UI Without Backend

Part 5 of the Parent Dashboard audit — generated 2026-07-03.

The two-directional gap map: UI that has no working data behind it, backend that has no UI in front of it, and components built but never mounted. Each item ends with a concrete next action.

## Part A — UI without a real backend (renders fake or empty)

These screens *look* built but have no working data path — either the backend handler is a stub/fake or the values are hardcoded.

| UI element | What it shows | Reality | Action |
|---|---|---|---|
| Fee pay flow ([ParentFees.js](../../src/components/parent/ParentFees.js)) | "Pay now" → receipt | `startPayment` fakes a `completed` payment, no gateway | Build real payment integration; until then, label as simulation |
| Fees audit drawer ([ParentFees.js:140](../../src/components/parent/ParentFees.js#L140)) | Hash-chained payment audit trail | **Hardcoded** fake events (`a31df9c7…`) | Wire to a real payment-audit endpoint or remove |
| Donations ([Donations.js](../../src/components/parent/Donations.js)) | Campaign progress + "sponsor" | `donateToCampaign` fakes a paid donation | Gate behind the same real gateway as fees |
| Home unread badge ([ParentHome.js:11](../../src/components/parent/ParentHome.js#L11)) | "3 NEW" | Hardcoded `unreadNotifs = 3` | Wire to `ParentNotificationContext` |
| Home recent activity ([ParentHome.js:75](../../src/components/parent/ParentHome.js#L75)) | "No recent activity" | Hardcoded despite a live `family-activity` API (which is a security leak — scope first) | Scope `getFamilyActivity`, then wire |
| Notification filters ([ParentNotifications.js:9](../../src/components/parent/ParentNotifications.js#L9)) | Child filter tabs "aminata"/"mohamed" | Hardcoded demo names | Derive from the real children list |
| `ParentVerification` ([ParentVerification.js:11](../../src/components/parent/ParentVerification.js#L11)) | Blockchain block #, validator nodes | 100% hardcoded fake; misrepresents the system's real hash-chain model | Delete or rebuild against the real `GradeReceipt` chain |
| Print-summary QR ([PrintFamilySummary.js:26](../../src/components/parent/PrintFamilySummary.js#L26)) | "Integrity hash" + verification QR | Fabricated client-side (`family-<ids>-<yyyy-mm>`); no server ever signed it | **Do not ship as authenticity.** Remove or back with a real signed hash |
| Attendance integrity banner ([ParentAttendance.js:147](../../src/components/parent/ParentAttendance.js#L147)) | "View Blockchain Hash" button | Decorative, no handler, no endpoint | Remove or wire to real forensic data |
| Permission-slip OTP ([PermissionSlips.js](../../src/components/parent/PermissionSlips.js)) | "Confirmation code sent via SMS" | Backend never generates or validates an OTP | Implement real OTP or drop the field |
| Weekly digest "AI-summarised" ([WeeklyDigest.js:38](../../src/components/parent/WeeklyDigest.js#L38)) | AI summary label | Backend is a plain aggregate query, no LLM | Relabel, or add a real summarization step |

Plus **every** data screen renders empty today because of the [parentApi raw-Response bug](03-BACKEND-API-CONTRACT-AUDIT.md) — that's not "UI without backend" (the backend exists), it's a broken client. It's covered in [03](03-BACKEND-API-CONTRACT-AUDIT.md), not repeated here.

## Part B — Backend without UI (routes with no consumer)

Endpoints that exist and (mostly) work but have no reachable UI. Decision: build UI, or remove.

| Route | Status | Consumer? | Recommendation |
|---|---|---|---|
| `GET /voice-digest/` | real | Called by `WeeklyDigest` (TTS) but only after the broken digest loads | Keep — surfaces once digest is fixed |
| `GET /family-activity/` | **security leak** | Intended for Home recent-activity (currently hardcoded) | **Scope the query first**, then wire to Home |
| `GET /access-log/` | **security leak** | `WhereIveBeen.js` is orphaned | Scope the query, then mount `WhereIveBeen` — not before |
| `GET /acknowledgments/` + `POST /acknowledgments/` | GET real, POST broken (contract) | `ParentReportCards` calls acknowledge optimistically | Fix the POST body (`record_type`/`record_id`); expose an acknowledgments view |
| `GET /counsellor/` + `POST` | real / partial | `ParentWellbeing` (crashes) | Fix `thread` shape + honor `anonymous`; then it's reachable |
| `GET /children/:id/tamper-count/` | broken (global) | `TamperCounter` + `FamilyBento`, both orphaned | Scope per-child, then mount `FamilyBento` |
| `GET /parent/verify/:hash/` | broken + dead | none (FE uses `/api/verify/`) | Remove, or fix and repoint the FE if a parent-scoped verify is wanted |
| `disable2FA` handler | unrouted | FE "disable" hits `enable2FA` | Route it (or branch on `action`) once 2FA is real |
| `GET /virtual-meetings/` | works | Home "upcoming meetings" | Keep — the one healthy extra |

## Part C — Orphaned components (built, never mounted)

Confirmed by grep: imported by no parent component, no `SECTION_PATHS`/`renderSection` entry. Full detail in [01](01-CURRENT-STATE-INVENTORY.md).

| Component | Verdict | Action |
|---|---|---|
| [FamilyBento.js](../../src/components/parent/FamilyBento.js) | Most finished orphan; real tamper/fees wiring | Mount it (strong Home replacement) after scoping `tamper-count`/`fees` |
| [WhereIveBeen.js](../../src/components/parent/WhereIveBeen.js) | Access-log viewer | Mount only after `getAccessLog` is scoped (security) |
| [TamperCounter.js](../../src/components/parent/TamperCounter.js) | Per-child tamper chip | Embed in child cards after scoping `getTamperCount` |
| [ParentVerification.js](../../src/components/parent/ParentVerification.js) | Fake blockchain UI | **Delete** or rebuild against real hash-chain |
| [ChannelPreferences.js](../../src/components/parent/ChannelPreferences.js) | 7×4 pref matrix | Mount + reduce to the per-channel model the DB supports, or add per-category storage |
| [parentMockData.js](../../src/mock/parentMockData.js) / [parentMockExtras.js](../../src/mock/parentMockExtras.js) | Dead mock, 0 importers | **Delete**, or repurpose their shapes as the target contract for backend serializers |

## Net picture

- **UI-without-real-data:** ~11 surfaces render fake/hardcoded values; 2 (print-summary QR, `ParentVerification`) make false authenticity claims and must not ship as-is.
- **Backend-without-UI:** ~9 routes lack a live consumer; 2 of them (`access-log`, `family-activity`) are security leaks that must be scoped before any UI touches them.
- **Orphans:** 5 components + 2 mock modules built and never used. `FamilyBento` is worth mounting; `ParentVerification` and the mocks should be deleted.

The recurring theme: the team built ahead of the wiring. The value is mostly recoverable — most orphans and dead endpoints just need the base fixes plus a mount, not new features.
