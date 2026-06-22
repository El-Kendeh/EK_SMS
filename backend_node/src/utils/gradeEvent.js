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
async function appendGradeEvent(evt, options = {}) {
  const { transaction } = options;
  const {
    grade_id = null, school_id, student_id = null, subject_id = null, term_id = null,
    actor_user_id = null, actor_name = null, event_type,
    field = null, old_value = null, new_value = null, approval_status_after = null,
  } = evt;

  const prev = await GradeEvent.findOne({
    where: { school_id },
    order: [['id', 'DESC']],
    attributes: ['hash'],
    ...(transaction ? { transaction } : {}),
  });
  const prev_hash = prev ? prev.hash : '';
  const created_at = new Date();

  // Hash with epoch SECONDS, not ISO ms — MySQL DATETIME drops fractional
  // seconds, so a re-verification reading created_at back must hash the same
  // value. Keeping ms here would make every stored chain fail to re-verify.
  const payload = JSON.stringify({
    grade_id, school_id, student_id, subject_id, term_id,
    actor_user_id, event_type, field,
    old_value: old_value == null ? null : String(old_value),
    new_value: new_value == null ? null : String(new_value),
    approval_status_after, ts: Math.floor(created_at.getTime() / 1000),
  });
  const hash = crypto.createHash('sha256').update(prev_hash + payload).digest('hex');

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

module.exports = { appendGradeEvent, appendGradeEventSafe };
