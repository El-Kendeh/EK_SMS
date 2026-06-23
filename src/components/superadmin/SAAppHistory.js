import React from 'react';

/* ---- Icons ---- */
const IcBack  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const IcClock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>;
const IcInfo  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

/* ---- Helpers ---- */
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysSince(dateStr) {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

/* SAAppHistory — reconstructed application timeline. EK-SMS records the
   submission date but not a per-event audit timeline for registrations, so this
   is honestly reconstructed from the application's current status: the only exact
   timestamp is the submission date, and intermediate steps are shown without
   fabricated dates/quotes. (The old version invented a full timeline, a reviewer
   quote, and a v1-vs-v2 "Compare Versions" diff — all removed.) */
export default function SAAppHistory({ school, onBack }) {
  const days      = daysSince(school.registration_date);
  const adminName = school.admin_full_name || school.principal_name || 'the school admin';
  const isRejected = !school.is_approved && school.is_active === false;

  const status = school.is_approved ? 'Approved'
    : isRejected ? 'Rejected'
    : school.changes_requested ? 'Changes Requested'
    : 'Under Review';

  const events = [
    { id: 'submit', dot: 'blue', label: 'Application Submitted', desc: `Submitted by ${adminName}.`, date: fmtDate(school.registration_date) },
  ];
  if (school.changes_requested) {
    events.push({ id: 'changes', dot: 'purple', label: 'Changes Requested', desc: 'The Super Admin requested changes to this application.', date: null });
  }
  if (isRejected) {
    events.push({ id: 'rejected', dot: 'red', label: 'Application Rejected', desc: school.rejection_reason || 'No reason recorded.', date: null });
  } else if (school.is_approved) {
    events.push({ id: 'approved', dot: 'green', label: 'Application Approved', desc: 'The school account was activated.', date: null });
  } else {
    events.push({ id: 'pending', dot: 'amber', label: 'Under Review', desc: 'Awaiting a decision from the Super Admin.', date: 'Now', current: true });
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Back */}
      <button className="sa-btn sa-btn--ghost sa-btn--sm" style={{ marginBottom: 20, gap: 6 }} onClick={onBack}>
        <IcBack /> Back to Review
      </button>

      {/* Header */}
      <div className="sa-page-head" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="sa-page-title">Application History</h1>
          <p className="sa-page-sub">{school.name}</p>
        </div>
      </div>

      {/* Honest disclaimer */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
        <span style={{ flexShrink: 0, color: 'var(--sa-amber)', display: 'flex', width: 16, height: 16 }}><IcInfo /></span>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--sa-text-2)', lineHeight: 1.5 }}>
          Reconstructed from the application's current status. Only the submission date is exact — per-event timestamps are not recorded for registrations.
        </p>
      </div>

      {/* Review Summary Card */}
      <div className="sa-card" style={{ marginBottom: 16 }}>
        <div className="sa-card-head"><p className="sa-card-title">Review Summary</p></div>
        <div className="sa-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { icon: <IcClock />, label: 'Days Since Submission', value: days,                            cls: 'sa-stat-icon--amber' },
              { icon: <IcInfo />,  label: 'Status',                value: status,                          cls: 'sa-stat-icon--blue'  },
              { icon: <IcClock />, label: 'Submitted',             value: fmtDate(school.registration_date), cls: 'sa-stat-icon--purple' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div className={`sa-stat-icon ${s.cls}`} style={{ margin: '0 auto 8px', width: 36, height: 36 }}>
                  {s.icon}
                </div>
                <p style={{ fontSize: s.label === 'Status' || s.label === 'Submitted' ? '0.9375rem' : '1.375rem', fontWeight: 800, color: 'var(--sa-text)', margin: '0 0 4px', lineHeight: 1.1 }}>
                  {s.value}
                </p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event Timeline */}
      <div className="sa-card">
        <div className="sa-card-head">
          <p className="sa-card-title">Event Timeline</p>
        </div>
        <div className="sa-card-body" style={{ paddingBottom: 8 }}>
          <div className="sa-tl">
            {events.map((ev, i) => (
              <div key={ev.id} className="sa-tl-item">
                <div className="sa-tl-left">
                  <div className={`sa-tl-dot sa-tl-dot--${ev.dot}${ev.current ? ' sa-tl-dot--pulse' : ''}`} />
                  {i < events.length - 1 && <div className="sa-tl-line" />}
                </div>
                <div className="sa-tl-content" style={{ paddingBottom: i < events.length - 1 ? 22 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: 'var(--sa-text)' }}>
                      {ev.label}
                    </p>
                    {ev.date && (
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--sa-text-2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {ev.date}
                      </p>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text-2)', lineHeight: 1.55 }}>
                    {ev.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
