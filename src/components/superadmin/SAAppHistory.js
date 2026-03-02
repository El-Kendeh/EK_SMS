import React from 'react';

/* ---- Icons ---- */
const IcBack   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const IcClock  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>;
const IcRotate = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;
const IcUser   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcDiff   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;

/* ---- Helpers ---- */
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysSince(dateStr) {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

export default function SAAppHistory({ school, onBack, onCompare }) {
  const days     = daysSince(school.registration_date);
  const revisions = school.changes_requested ? 2 : 1;
  const adminName = school.admin_full_name || school.principal_name || 'School Admin';

  const events = [
    {
      id:    'submit',
      dot:   'blue',
      label: 'Initial Submission',
      desc:  'Application submitted by ' + adminName,
      date:  fmtDate(school.registration_date),
    },
    {
      id:    'review',
      dot:   'amber',
      label: 'Review Started',
      desc:  'Application picked up for review by Super Admin.',
      date:  fmtDate(school.registration_date),
    },
    ...(school.changes_requested ? [
      {
        id:    'changes',
        dot:   'purple',
        label: 'Changes Requested',
        desc:  'Reviewer requested additional information about school documentation and admin credentials.',
        date:  fmtDate(school.registration_date),
        quote: 'Please provide updated registration documents and confirm the admin email address.',
      },
      {
        id:    'resubmit',
        dot:   'blue',
        label: 'Re-submitted',
        desc:  'School admin updated the required fields and re-submitted the application.',
        date:  fmtDate(school.registration_date),
      },
    ] : []),
    ...(school.is_approved
      ? [{
          id:    'approved',
          dot:   'green',
          label: 'Application Approved',
          desc:  'School was approved and credentials activated. Welcome email sent.',
          date:  fmtDate(school.registration_date),
        }]
      : [{
          id:      'pending',
          dot:     'amber',
          label:   'Under Review',
          desc:    'Awaiting final decision from Super Admin.',
          date:    'Now',
          current: true,
        }]
    ),
  ];

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
          <p className="sa-page-sub">{school.name} · Review timeline</p>
        </div>
      </div>

      {/* Review Summary Card */}
      <div className="sa-card" style={{ marginBottom: 16 }}>
        <div className="sa-card-head">
          <p className="sa-card-title">Review Summary</p>
          {school.changes_requested && (
            <button className="sa-btn sa-btn--ghost sa-btn--sm" style={{ gap: 6 }} onClick={onCompare}>
              <IcDiff /> Compare Versions
            </button>
          )}
        </div>
        <div className="sa-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { icon: <IcClock />,  label: 'Days in Review', value: days,         cls: 'sa-stat-icon--amber'  },
              { icon: <IcRotate />, label: 'Revisions',      value: revisions,    cls: 'sa-stat-icon--purple' },
              { icon: <IcUser />,   label: 'Last Reviewer',  value: 'Super Admin', cls: 'sa-stat-icon--blue'  },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div className={`sa-stat-icon ${s.cls}`} style={{ margin: '0 auto 8px', width: 36, height: 36 }}>
                  {s.icon}
                </div>
                <p style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--sa-text)', margin: '0 0 4px', lineHeight: 1 }}>
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
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--sa-text-2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {ev.date}
                    </p>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text-2)', lineHeight: 1.55 }}>
                    {ev.desc}
                  </p>
                  {ev.quote && (
                    <blockquote className="sa-tl-quote">
                      "{ev.quote}"
                    </blockquote>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
