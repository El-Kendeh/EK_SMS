# Parent / Guardian Dashboard — Backend & API Contract Audit

Part 3 of the Parent Dashboard audit — generated 2026-07-03.

Covers all ~51 routes in [routes/parent.js](../../backend_node/src/routes/parent.js), the 1,854-line [parentController.js](../../backend_node/src/controllers/parentController.js), the models, and the [parentApi.js](../../src/api/parentApi.js) client. Headline: **every route the FE calls exists** — there are no missing routes, only missing/broken *implementations* behind them, three IDOR holes, two total-table leaks, and systematic FE↔BE contract drift that 400s/404s most writes.

Status key: `real` = correct · `partial` = works but with a real defect · `stub` = returns placeholder/hardcoded · `mock-returning` = fabricated data · `broken` = 400/404/500 on every call.

## The FE API-client defect (affects every endpoint)

Before any per-endpoint issue: [parentApi.js](../../src/api/parentApi.js) wraps every call in `api.request(...)`, and `ApiClient.request()` returns the **raw fetch `Response`** ([client.js:154](../../src/api/client.js#L154)) — it never calls `.json()`. Only `apiClient.get/post/patch/delete` parse the body. `studentApi.js` uses `.get()` and works; `parentApi` is the outlier. So every consumer reads response fields off a `Response` object → `undefined` → silent `[]`/`null`. **This is the single highest-leverage fix** and the reason "the backend is fine but nothing shows." (Verified: adversarial re-check confirmed it, and noted the scope includes mutation responses too.)

## Endpoint-by-endpoint

| Route | Handler | Status | Notes |
|---|---|---|---|
| `GET /children/` | getChildren | **broken** | 500s: `getParentStudentIds` filters `CoGuardian.is_active` — a column the model lacks ([parentController.js:41](../../backend_node/src/controllers/parentController.js#L41)). Also returns snake_case minimal fields, missing every computed field the cards read |
| `GET /children/:childId/grades/` | getChildGrades | **partial** | Real, but **IDOR** — no ownership check ([:104](../../backend_node/src/controllers/parentController.js#L104)); returns `subject` as an object; fields are `total`/`grade_letter` not `score`/`gradeLetter` |
| `GET /children/:childId/grades/:gradeId/history/` | getChildGradeHistory | **real** | Ownership-checked; hash-chained `GradeEvent` trail. Correct |
| `POST …/grades/:gradeId/objection/` | submitModificationObjection | **broken** | FE sends `{message}`; controller requires `reason` → 400 every call |
| `GET /children/:childId/report-cards/` | getChildReportCards | **partial** | Ownership-checked; groups grades by term (not a real report-card doc); risky `order` on `Subject.name` |
| `GET …/report-cards/:reportCardId/download/` | downloadChildReportCard | **partial** | Returns **JSON, not a PDF**; ignores `:reportCardId`, keys off a `term_id` query the FE never sends → returns all terms |
| `POST …/end-of-term-pack/` | getEndOfTermPack | **partial** | Ownership-checked; aggregates to a JSON `items` array; no real ZIP/PDF |
| `GET /notifications/` | getParentNotifications | **partial** | Returns `user_id=me OR user_id IS NULL` with **no school scope** → cross-tenant global-notice leak |
| `POST /notifications/` | markParentNotificationRead | **real** | Works for own + `mark_all`; global (null) rows can never be marked read |
| `GET /profile/` | getParentProfile | **partial** | Reads from JWT; minimal fields; `two_factor_enabled` always false |
| `PATCH /profile/` | updateParentProfile | **broken** | Calls `req.user.update()` on the **plain JWT object** → TypeError → 500. Edits never persist |
| `GET /2fa/setup/` | get2FASetup | **stub** | Returns empty `qr_code`/`setup_uri`; no TOTP secret |
| `POST /2fa/setup/` | enable2FA | **broken** | Ignores `otp_code`; `req.user.update()` → 500; `disable2FA` exists but is **unrouted**, so disabling actually enables |
| `GET /children/:childId/attendance/` | getChildAttendance | **partial** | Real, but **IDOR** — no ownership check ([:412](../../backend_node/src/controllers/parentController.js#L412)) |
| `GET /children/:childId/behavior/` | getChildBehavior | **real** | Ownership-checked; returns `BehaviourIncident` rows (omits the model's `title` column) |
| `GET /children/:childId/fees/` | getChildFees | **partial** | Real, but **IDOR** — no ownership check ([:496](../../backend_node/src/controllers/parentController.js#L496)); exposes full payment history (financial PII); `sibling_discount` hardcoded 0 |
| `GET /payment-channels/` | getPaymentChannels | **mock-returning** | Hardcoded 4-channel array; no DB, no per-school config |
| `POST /payments/start/` | startPayment | **stub** | **Fake success** — creates a `completed` Payment and reduces the fee balance with no gateway ([:571](../../backend_node/src/controllers/parentController.js#L571)); `redirectUrl` null; `instalments` ignored |
| `GET /receipts/` | getReceipts | **partial** | Own-student scoped, but the `?child` filter is overwritten by the `IN(students)` clause (dead); uses inline phone/user_id match (excludes co-guardian students) |
| `GET /receipts/:id/download/` | downloadReceipt | **broken** | Reads `req.params.receiptId` but route param is `:id` → `findByPk(undefined)` → 404 every call; also returns JSON not PDF |
| `GET /verify/:hash/` | verifyHash | **broken** | Reads `req.query.hash` but route supplies a **path** param → 400; and it's **dead** (FE targets the standalone `/api/verify/`, not this) |
| `GET /children/:childId/tamper-count/` | getTamperCount | **broken** | Ignores `:childId`; counts **all** `ForensicEvent` rows across every school → cross-tenant aggregate |
| `GET /access-log/` | getAccessLog | **broken** | **Security hole** — returns the entire `SecurityAuditLog` (all users/schools) with no filter ([:759](../../backend_node/src/controllers/parentController.js#L759)) |
| `GET /channel-preferences/` | getChannelPreferences | **partial** | Fabricates a per-category×channel matrix from flat per-channel booleans — granularity is an illusion |
| `PATCH /channel-preferences/` | updateChannelPreferences | **partial** | Upserts flat booleans only; discards category detail; returns success anyway (fake-success) |
| `GET /whistleblower/categories/` | getWhistleblowerCategories | **real** | Returns active categories (wrapped `{categories}` the FE treats as an array → `.map` crash) |
| `POST /whistleblower/submit/` | submitWhistleblowerReport | **broken** | FE sends `{category,message}`; controller requires `title`+`description`, reads `category_id` → 400; **not encrypted**; not truly anonymous |
| `GET /whistleblower/:key/` | checkWhistleblowerStatus | **real** | Lookup by follow-up key works; `updates` always `[]` |
| `GET /conferences/` | getConferenceSlots | **partial** | Returns `status:'available'` only → a parent's own booked slot never returns (Cancel unreachable); `?child` ignored |
| `POST /conferences/:slotId/claim/` | claimConferenceSlot | **partial** | Books slot; FE-sent `{topic}` **silently dropped** (no column) — data loss |
| `DELETE /conferences/:slotId/claim/` | cancelConferenceSlot | **real** | Correct |
| `GET /counsellor/` | getCounsellor | **real** | School-scoped counsellor messages |
| `POST /counsellor/` | sendCounsellorMessage | **partial** | Creates message; FE `{anonymous}` **silently dropped** → "anonymous to counsellor" always attributed |
| `GET /children/:childId/teacher-threads/` | getTeacherThreads | **partial** | Returns all of the parent's messages grouped by sender pair — **not** filtered by child/subject |
| `POST …/teacher-threads/:subjectId/` | sendTeacherMessage | **broken** | FE sends `{text}`; controller requires `body.teacher_id` → 400 every call |
| `GET /co-guardians/` | getCoGuardians | **partial** | Lists rows; maps `User.phone` (no such column) → `phone` always undefined |
| `POST /co-guardians/` | inviteCoGuardian | **broken** | FE sends `{name,email,relationship,children}`; controller requires `student_id`+`guardian_email` → 400 |
| `DELETE /co-guardians/:id/` | removeCoGuardian | **broken** | Reads `req.params.guardianId`; route param is `:id` → 404 every call |
| `GET /pickup/` | getPickupAllowList | **real** | Lists authorized pickups |
| `POST /pickup/` | addPickup | **broken** | FE sends `{name,…,children,photo_color}`; controller requires `student_id` → 400 |
| `DELETE /pickup/:id/` | removePickup | **broken** | Reads `req.params.pickupId`; route param is `:id` → 404 every call |
| `GET /permission-slips/` | getPermissionSlips | **real** | School-scoped with per-parent `is_signed` |
| `POST /permission-slips/:id/sign/` | signPermissionSlip | **broken** | FE sends `{otp}` + `:id` URL; controller requires body `slip_id`+`student_id`, **ignores `:id` and never validates the OTP** → 400 |
| `POST /acknowledgments/` | acknowledgeRecord | **broken** | FE sends `{kind,id}`; controller requires `record_type`+`record_id` → 400 |
| `GET /acknowledgments/` | getAcknowledgments | **real** | Lists this user's acknowledgments |
| `GET /events/` | getParentEvents | **stub** | No Event model — returns Notification rows relabeled; global branch not school-scoped (leak) |
| `GET /donations/` | getDonations | **real** | Lists campaigns + donor total |
| `POST /donations/` | donateToCampaign | **stub** | **Fake success** — records a paid donation and bumps the campaign total with no processor |
| `GET /weekly-digest/` | getWeeklyDigest | **real** | Aggregates last-7d grades/attendance/notifications |
| `GET /voice-digest/` | getVoiceDigest | **real** | Builds a plain-text digest string; no actual TTS/audio |
| `GET /family-activity/` | getFamilyActivity | **broken** | **Security hole** — pulls `SecurityAuditLog` with no user/school filter ([:1782](../../backend_node/src/controllers/parentController.js#L1782)) |
| `GET /virtual-meetings/` | virtualMeetingController.getMyMeetings | **unknown** | Different controller; consumed by Home, not via `parentApi`; not audited here |

## Missing implementations (route exists, feature doesn't)

There are **no missing routes** — every `parentApi` function maps to a real route. What's missing is real behavior behind them:

1. **Report-card PDF generation** — `downloadChildReportCard` returns JSON. No template, digital signature, or per-report-card QR/verification hash (§2.4 / MVP-3).
2. **Payment gateway + callback/webhook** — `startPayment` fabricates a completed payment. No Orange Money/Africell/bank/card processor, no async confirmation, no installments/late-fees/discounts logic (§4.1).
3. **Event/announcement calendar** — `/events` aliases Notifications. No Event model, scheduled publishing, targeting, attachments, or acknowledgment tracking (§3.5).
4. **Push/SMS/Email dispatch** — channel prefs are stored but there is no send transport; alerting is in-app only (§3.3).
5. **Working 2FA** — no real TOTP provisioning or OTP verification; no DB column to persist state.
6. **Messaging Phase-2** — no attachments, read-receipts, archive; threads not child/subject-scoped (§3.2).

## Dead endpoints / handlers

- `GET /parent/verify/:hash/` — no `parentApi` consumer (FE uses the standalone `/api/verify/`); also broken (reads `req.query` not the path param).
- `disable2FA` ([:402](../../backend_node/src/controllers/parentController.js#L402)) — exported but never routed; FE "disable" hits `enable2FA` and sets 2FA **on**.
- `getReceipts` `?child` filter — value overwritten before use; never takes effect.

## Contract drift (guarantees a 400/404 on every affected call)

| Endpoint | FE sends | BE requires | Result |
|---|---|---|---|
| objection | `{message}` + URL ids | `reason` in body | 400 |
| whistleblower submit | `{category,message}` | `title`+`description`, `category_id` | 400 |
| teacher message | `{text}` + `:subjectId` | `teacher_id` in body | 400 |
| invite co-guardian | `{name,email,relationship,children}` | `student_id`+`guardian_email` | 400 |
| add pickup | `{name,…,children,photo_color}` | `student_id`+`name` | 400 |
| sign permission slip | `{otp}` + `:id` | `slip_id`+`student_id` in body | 400 (OTP never checked) |
| acknowledge | `{kind,id}` | `record_type`+`record_id` | 400 |
| receipt download / remove co-guardian / remove pickup | route `:id` | controller reads `receiptId`/`guardianId`/`pickupId` | 404 |

Plus response-shape drift on **every read**: `successResponse` spreads payload flat as `{success, message, ...data}` ([:35](../../backend_node/src/controllers/parentController.js#L35)); lists are wrapped (`{children}`, `{slots}`, `{threads}`, `{categories}`, `{reportCards}`) while the UI treats the whole response as the array; fields are snake_case (`is_read`, `created_at`, `full_name`, `total`, `grade_letter`) while the UI reads camelCase; and `grade.subject` is an object rendered directly.

## Security findings (treat as blockers regardless of current reachability)

1. **IDOR — no `:childId` ownership check** on `getChildGrades`, `getChildAttendance`, `getChildFees`. Any authenticated user reads any student's grades/attendance/full fee+payment history by iterating `childId`. (Report-cards/behaviour/history *do* check — the inconsistency is the tell.) **Fix:** `const ids = await getParentStudentIds(req); if (!ids.includes(Number(childId))) return 403;`
2. **Cross-tenant PII leak** — `getAccessLog` and `getFamilyActivity` return the entire `SecurityAuditLog` (actor, IP, action, metadata for every user on every school) with no scoping. `getTamperCount` counts `ForensicEvent` globally. **Fix:** scope by `req.user.id` + `school_id`.
3. **Cross-tenant broadcast leak** — `getParentNotifications` / `getParentEvents` include `user_id IS NULL` rows with no school filter. **Fix:** scope the null branch by `school_id`.
4. **No role gate** — `routes/parent.js` applies only `authenticateToken`; there's no `req.user.role === 'parent'` check. Any authenticated user (teacher/student) hits every parent endpoint, compounding the IDOR.
5. **Fake payments / data integrity** — `startPayment` and `donateToCampaign` mark fees/campaigns paid without any money movement. A parent can zero their fees.
6. **Broken anonymity** — whistleblower reports are stored plaintext + `school_id`-tagged and not encrypted (§3.4); the counsellor `anonymous` flag is dropped. Anonymity holds only by omission (no `user_id` stored), not by design.
7. **Auth-context writes** — `updateParentProfile`/`enable2FA`/`disable2FA` call `.update()` on the plain JWT object → 500; 2FA is security theater.

## Data models

| Model | Table | State |
|---|---|---|
| `Parent` | `pruh_core_parent` | **Unused** by `parentController` — the portal derives identity from the JWT, not this table |
| `CoGuardian` | `pruh_core_co_guardian` | Has `status` (default `pending`), **no `is_active`** — yet the controller filters `is_active:true` (the 500). Invites write `status:'pending'`, which the filter would never match even if the column existed |
| `StudentParent` | `pruh_core_student_parent` | The proper parent↔student join table — **completely unused**. Linkage instead relies on `Student.user_id` / dead phone match / broken co-guardian |
| `User` | `users` | **No `phone` column** and **no `two_factor_enabled` column** — yet the JWT signs `phone: user.phone` (undefined), breaking phone-based child linkage, and 2FA has nowhere to persist |
| `ChannelPreference` | — | Flat per-channel booleans only (`push/email/sms/in_app/whatsapp`); cannot store the UI's per-category matrix |

**Child-linkage is the quiet time bomb:** the only path that actually resolves children is `Student.user_id === req.user.id`. Phone linkage is dead (no `User.phone`), co-guardian linkage 500s (`is_active`), and `StudentParent` is unused. A guardian who is *not* the student's own user account — i.e. the normal case — sees **no children** even after the API-client fix. The right fix is to route all child resolution through the `StudentParent` join table.
