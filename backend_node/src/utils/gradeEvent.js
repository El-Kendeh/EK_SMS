const crypto = require('crypto');
const GradeEvent = require('../models/GradeEvent');

/**
 * Append a tamper-evident event to the grade audit chain.
 *
 * The chain is scoped per school: each new event hashes the previous event's
 * hash together with this event's payload (SHA-256). Verifying the chain later
 * means recomputing each hash from prev_hash + payload — any edited/removed row
 * breaks every hash after it.
 *
 * Pass `options.transaction` to make the event part of the caller's transaction
 * (used for submit / approve / reject / publish so the audit row and the grade
 * change commit or roll back together).
 */
/**
 * The ONE hash formula for the grade-event chain — used both when appending
 * (appendGradeEvent) and when re-verifying stored chains (getGradeAudit).
 * Any drift between append and verify would make every stored chain report
 * tampering, so the payload shape here is load-bearing:
 *  - key order is fixed;
 *  - old_value/new_value are String()-coerced (they are TEXT columns);
 *  - ts is epoch SECONDS, not ISO ms — MySQL DATETIME drops fractional
 *    seconds, so a re-verification reading created_at back must hash the
 *    same value.
 */
// Coerce the id columns to Number so the hash is identical whether the caller
// passed a numeric model value (append path) or a string re-read from a body /
// query param — otherwise 5 vs "5" would serialize differently and verify would
// cry false tamper. The DB columns are BIGINT, so re-verification always reads
// numbers; append callers pass model numbers too, so this is a no-op for real
// data and only hardens against string-typed inputs.
const numOrNull = (v) => (v == null || v === '' ? null : Number(v));

function computeEventHash(evt, prevHash) {
  const payload = JSON.stringify({
    grade_id: numOrNull(evt.grade_id), school_id: numOrNull(evt.school_id),
    student_id: numOrNull(evt.student_id), subject_id: numOrNull(evt.subject_id),
    term_id: numOrNull(evt.term_id), actor_user_id: numOrNull(evt.actor_user_id),
    event_type: evt.event_type, field: evt.field ?? null,
    old_value: evt.old_value == null ? null : String(evt.old_value),
    new_value: evt.new_value == null ? null : String(evt.new_value),
    approval_status_after: evt.approval_status_after ?? null,
    ts: Math.floor(new Date(evt.created_at).getTime() / 1000),
  });
  return crypto.createHash('sha256').update((prevHash || '') + payload).digest('hex');
}

async function appendGradeEvent(evt, options = {}) {
  const { transaction } = options;
  const {
    grade_id = null, school_id, student_id = null, subject_id = null, term_id = null,
    actor_user_id = null, actor_name = null, event_type,
    field = null, old_value = null, new_value = null, approval_status_after = null,
  } = evt;

  // Row-lock the chain tip when in a transaction so two concurrent appends to
  // the same school serialize instead of both reading the same prev_hash and
  // forking the chain (which would make later verification cry false tamper).
  // (The very first two events of a brand-new school can still race — there is
  // no tip row to lock yet — but every subsequent append is protected.)
  const prev = await GradeEvent.findOne({
    where: { school_id },
    order: [['id', 'DESC']],
    attributes: ['hash'],
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}),
  });
  const prev_hash = prev ? prev.hash : '';
  const created_at = new Date();

  const hash = computeEventHash({
    grade_id, school_id, student_id, subject_id, term_id,
    actor_user_id, event_type, field,
    old_value, new_value, approval_status_after, created_at,
  }, prev_hash);

  return GradeEvent.create({
    grade_id, school_id, student_id, subject_id, term_id,
    actor_user_id, actor_name,
    event_type, field,
    old_value: old_value == null ? null : String(old_value),
    new_value: new_value == null ? null : String(new_value),
    approval_status_after,
    prev_hash: prev_hash || null,
    hash, created_at,
  }, transaction ? { transaction } : {});
}

/**
 * Best-effort variant for hot paths (autosave drafts): never throws, so an
 * audit hiccup can't break the user's grade entry. Logs and continues.
 */
async function appendGradeEventSafe(evt, options = {}) {
  try { return await appendGradeEvent(evt, options); }
  catch (err) { console.error('appendGradeEvent failed:', err.message); return null; }
}

module.exports = { appendGradeEvent, appendGradeEventSafe, computeEventHash };
