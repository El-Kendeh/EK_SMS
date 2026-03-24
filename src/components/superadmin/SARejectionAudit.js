import React from 'react';

/* ---- Icons ---- */
const IcBack    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const IcShield  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcInfo    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IcRefresh = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;
const IcLock    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;

/* ---- Helpers ---- */
function fmtDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SARejectionAudit({ school, onBack, onReconsider }) {
  const reason    = school.rejection_reason || '—';
  const adminName = school.admin_full_name || school.principal_name || '—';
  const location  = [school.city, school.country].filter(Boolean).join(', ') || '—';

  const auditLog = [
    {
      dot:   'blue',
      label: 'Application Submitted',
      desc:  'School admin submitted the registration form online.',
      date:  fmtDateTime(school.registration_date),
    },
    {
      dot:   'amber',
      label: 'Under Review',
      desc:  'Super Admin opened the application for manual review.',
      date:  fmtDateTime(school.registration_date),
    },
    {
      dot:      'red',
      label:    'Rejection Decision Made',
      desc:     `Reason recorded: ${reason}`,
      date:     fmtDateTime(school.registration_date),
      highlight: true,
    },
    {
      dot:   'red',
      label: 'Application Rejected',
      desc:  'Status set to Rejected. School admin notified via system email.',
      date:  fmtDateTime(school.registration_date),
    },
    {
      dot:   'purple',
      label: 'Archived',
      desc:  'Record moved to the rejected applications archive for audit purposes.',
      date:  fmtDateTime(school.registration_date),
    },
  ];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Back */}
      <button className="sa-btn sa-btn--ghost sa-btn--sm" style={{ marginBottom: 20, gap: 6 }} onClick={onBack}>
        <IcBack /> Back to Rejected
      </button>

      {/* Header */}
      <div className="sa-page-head" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="sa-page-title">Rejection Audit</h1>
          <p className="sa-page-sub">{school.name} · Full audit trail</p>
        </div>
      </div>

      {/* Decision Summary */}
      <div className="sa-review-section" style={{ marginBottom: 16 }}>
        <div className="sa-review-section-head">
          <IcShield /> Decision Summary
        </div>
        <div className="sa-review-section-body">
          <div className="sa-review-field">
            <span className="sa-review-field-key">Rejected By</span>
            <span className="sa-review-field-val">Super Admin</span>
          </div>
          <div className="sa-review-field">
            <span className="sa-review-field-key">Date of Rejection</span>
            <span className="sa-review-field-val">{fmtDate(school.registration_date)}</span>
          </div>
          <div className="sa-review-field">
            <span className="sa-review-field-key">Official Reason</span>
            <span className="sa-review-field-val sa-review-field-val--red">{reason}</span>
          </div>
          <div className="sa-review-field" style={{ borderBottom: 'none' }}>
            <span className="sa-review-field-key">Record Status</span>
            <span className="sa-badge sa-badge--rejected">Rejected &amp; Archived</span>
          </div>
        </div>
      </div>

      {/* Internal Audit Log */}
      <div className="sa-card" style={{ marginBottom: 16 }}>
        <div className="sa-card-head">
          <p className="sa-card-title">Internal Audit Log</p>
        </div>
        <div className="sa-card-body" style={{ paddingBottom: 8 }}>
          <div className="sa-tl">
            {auditLog.map((ev, i) => (
              <div key={i} className="sa-tl-item">
                <div className="sa-tl-left">
                  <div className={`sa-tl-dot sa-tl-dot--${ev.dot}`} />
                  {i < auditLog.length - 1 && <div className="sa-tl-line" />}
                </div>
                <div className="sa-tl-content" style={{ paddingBottom: i < auditLog.length - 1 ? 22 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <p style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      color: ev.highlight ? 'var(--sa-red)' : 'var(--sa-text)',
                    }}>
                      {ev.label}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--sa-text-2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {ev.date}
                    </p>
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

      {/* Data Snapshot */}
      <div className="sa-review-section" style={{ marginBottom: 16 }}>
        <div className="sa-review-section-head">
          <IcInfo /> Data Snapshot (Read-Only)
        </div>
        <div className="sa-review-section-body">
          <div className="sa-review-field">
            <span className="sa-review-field-key">School Name</span>
            <span className="sa-review-field-val">{school.name || '—'}</span>
          </div>
          <div className="sa-review-field">
            <span className="sa-review-field-key">Location</span>
            <span className="sa-review-field-val">{location}</span>
          </div>
          <div className="sa-review-field">
            <span className="sa-review-field-key">Administrator</span>
            <span className="sa-review-field-val">{adminName}</span>
          </div>
          <div className="sa-review-field" style={{ borderBottom: 'none' }}>
            <span className="sa-review-field-key">Admin Email</span>
            <span className="sa-review-field-val">{school.admin_email || school.email || '—'}</span>
          </div>
        </div>
      </div>

      {/* Recovery Action */}
      <div style={{
        background: 'var(--sa-card-bg)',
        border: '1px solid var(--sa-border)',
        borderRadius: 'var(--sa-radius)',
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div className="sa-stat-icon sa-stat-icon--amber" style={{ width: 36, height: 36, flexShrink: 0 }}>
            <IcLock />
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--sa-text)' }}>
              Recovery Action
            </p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text-2)' }}>
              Reconsider this application and return it to pending review for re-evaluation.
            </p>
          </div>
        </div>
        <button
          className="sa-btn sa-btn--primary"
          onClick={() => onReconsider && onReconsider(school)}
          style={{ flexShrink: 0 }}
        >
          <IcRefresh /> Reconsider Application
        </button>
      </div>
    </div>
  );
}
