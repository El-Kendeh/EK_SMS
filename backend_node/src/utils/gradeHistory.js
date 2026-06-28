// Maps append-only GradeEvent rows into a single shape consumed by BOTH grade-history UIs:
//   - student GradeHistoryPanel  -> eventType, recordedBy, recordedAt, score, reason, approvedBy, isSecurityEvent
//   - parent  GradeHistoryDrawer -> type, created_at, event/action, score/value, by
// One mapper so the two portals can never drift apart again (the audit sweep found the
// parent + student readers had diverged). See sweep #2.

// GradeEvent.event_type is one of: create | update | submit | approve | reject | publish | unpublish
const STUDENT_TYPE = { create: 'DRAFT', update: 'UPDATE', submit: 'SUBMIT', approve: 'LOCK', publish: 'LOCK', reject: 'MODIFICATION_ATTEMPT', unpublish: 'UPDATE' };
const PARENT_TYPE  = { create: 'draft', update: 'ca',     submit: 'draft',  approve: 'locked', publish: 'locked', reject: 'alert', unpublish: 'draft' };

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function mapGradeEvents(events) {
  return (events || []).map((e) => {
    const ev = String(e.event_type || '').toLowerCase();
    const score = toNum(e.new_value);
    const who = e.actor_name || 'System';
    const label = e.field
      ? `${e.field}: ${e.old_value == null ? '—' : e.old_value} → ${e.new_value == null ? '—' : e.new_value}`
      : (ev ? ev.charAt(0).toUpperCase() + ev.slice(1) : 'Updated');
    // undefined (not null) so JSON drops the key — the student panel hides the score
    // badge on `event.score !== undefined`, and the parent falls through to '—'.
    const scoreOut = score == null ? undefined : score;
    return {
      id: e.id,
      // canonical event-sourced fields
      field: e.field,
      oldValue: e.old_value,
      newValue: e.new_value,
      approvalStatus: e.approval_status_after,
      hash: e.hash,
      prevHash: e.prev_hash,
      // student GradeHistoryPanel keys
      eventType: STUDENT_TYPE[ev] || (ev ? ev.toUpperCase() : 'UPDATE'),
      isSecurityEvent: false, // legitimate workflow events; tamper attempts live in ForensicEvent
      score: scoreOut,
      recordedBy: who,
      recordedAt: e.created_at,
      reason: null, // GradeEvent stores no free-text reason; the before/after delta carries the change
      approvedBy: ev === 'approve' ? who : null,
      // parent GradeHistoryDrawer keys
      type: PARENT_TYPE[ev] || 'draft',
      created_at: e.created_at,
      time: e.created_at,
      event: label,
      action: label,
      by: who,
      value: scoreOut,
    };
  });
}

module.exports = { mapGradeEvents };
