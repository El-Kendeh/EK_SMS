import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ApiClient from '../../api/client';

/* ---- Icons (explicitly sized — a bare <svg viewBox> with no width/height
        renders at its full intrinsic block size, which is what blew the
        old Decision Summary shield up to fill the card). ---- */
const Ic = (size, paths) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>;

const IcBack    = ({ size = 16 }) => Ic(size, <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>);
const IcShield  = ({ size = 18 }) => Ic(size, <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>);
const IcInfo    = ({ size = 15 }) => Ic(size, <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>);
const IcRefresh = ({ size = 15 }) => Ic(size, <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></>);
const IcLock    = ({ size = 16 }) => Ic(size, <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>);
const IcDoc     = ({ size = 14 }) => Ic(size, <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>);
const IcEdit    = ({ size = 14 }) => Ic(size, <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>);
const IcCheck   = ({ size = 14 }) => Ic(size, <><polyline points="20 6 9 17 4 12"/></>);
const IcX       = ({ size = 14 }) => Ic(size, <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>);
const IcArchive = ({ size = 14 }) => Ic(size, <><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></>);
const IcUser    = ({ size = 11 }) => Ic(size, <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>);

/* ---- Event-type config (maps real audit-log types → timeline presentation) ---- */
const TYPE_CFG = {
  school_registration_submitted: { label: 'Application Submitted',    dot: 'blue',   icon: <IcDoc /> },
  school_changes_requested:      { label: 'Changes Requested',        dot: 'purple', icon: <IcEdit /> },
  school_approved:               { label: 'Application Approved',      dot: 'green',  icon: <IcCheck /> },
  school_rejected:               { label: 'Rejection Decision Made',   dot: 'red',    icon: <IcX />, highlight: true },
};

const DOT_COLOR = {
  blue:   'var(--sa-accent)',
  amber:  'var(--sa-amber)',
  green:  'var(--sa-green)',
  red:    'var(--sa-red)',
  purple: 'var(--sa-purple)',
};

/* ---- Date / time helpers ---- */
function fmtDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
/* Live, self-updating relative time ("3 hrs ago") */
function relTime(ts, now) {
  if (!ts) return '';
  const t = new Date(ts).getTime();
  if (isNaN(t)) return '';
  const diff = Math.max(0, now - t);
  const s = Math.floor(diff / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} mo ago`;
  const y = Math.floor(mo / 12);
  return `${y} yr${y > 1 ? 's' : ''} ago`;
}

function describeEvent(l, fallbackReason) {
  const m = l.metadata || {};
  switch (l.type) {
    case 'school_registration_submitted':
      return `Registration form submitted online${l.actor ? ` by ${l.actor}` : ''}.`;
    case 'school_changes_requested':
      return m.note ? `Reviewer requested changes: ${m.note}` : 'Reviewer requested additional information.';
    case 'school_approved':
      return 'Application approved and admin credentials activated.';
    case 'school_rejected':
      return `Reason recorded: ${m.rejection_reason || m.note || fallbackReason || '—'}`;
    default:
      return l.action || '';
  }
}

export default function SARejectionAudit({ school, onBack, onReconsider }) {
  const reason    = school.rejection_reason || '—';
  const adminName = school.admin_full_name || school.principal_name || 'School Admin';
  const location  = [school.city, school.country].filter(Boolean).join(', ') || '—';

  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [now, setNow]         = useState(() => Date.now());

  /* Tick a live clock so relative timestamps stay current */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ApiClient.get('/api/security-logs/?limit=500');
      if (data && data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
        setLastSync(Date.now());
      }
    } catch (err) {
      console.error('Failed to fetch audit trail', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  /* Real audit events for THIS school, oldest → newest */
  const realEvents = useMemo(() => {
    return logs
      .filter(l => l.metadata && String(l.metadata.school_id) === String(school.id) && TYPE_CFG[l.type])
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
      .map(l => {
        const cfg = TYPE_CFG[l.type];
        return {
          key:       `log-${l.id}`,
          dot:       cfg.dot,
          icon:      cfg.icon,
          label:     cfg.label,
          highlight: cfg.highlight,
          desc:      describeEvent(l, reason),
          actor:     l.actor || '—',
          ts:        l.ts,
        };
      });
  }, [logs, school.id, reason]);

  const isReal      = realEvents.length > 0;
  // No fabricated fallback: a missing real event shows "Not recorded" rather than
  // the registration date dressed up as a rejection time / "Super Admin" as actor.
  const rejectionEvt = realEvents.find(e => e.label === 'Rejection Decision Made');
  const rejectedTs  = rejectionEvt ? rejectionEvt.ts : null;
  const rejectedBy  = rejectionEvt ? rejectionEvt.actor : null;

  const archivedNode = {
    key: 'archived', dot: 'purple', icon: <IcArchive />, label: 'Archived',
    desc: 'Record moved to the rejected applications archive for audit purposes.',
    ts: rejectedTs, derived: true,
  };

  // Only real, logged events. When none exist we render an honest empty state
  // (below) instead of inventing a reviewer timeline.
  const timeline = isReal ? [...realEvents, archivedNode] : [];

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>
      {/* Back */}
      <button className="sa-btn sa-btn--ghost sa-btn--sm" style={{ marginBottom: 20, gap: 6 }} onClick={onBack}>
        <IcBack /> Back to Rejected
      </button>

      {/* Header */}
      <div className="sa-page-head" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
        <div>
          <h1 className="sa-page-title">Rejection Audit</h1>
          <p className="sa-page-sub">{school.name} · Full audit trail</p>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--sa-green-dim)', color: 'var(--sa-green)',
          border: '1px solid rgba(16,185,129,0.25)', borderRadius: 20,
          padding: '5px 12px', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0,
        }}>
          <span className="sa-live-dot" /> {isReal ? 'Live' : (loading ? 'Syncing…' : 'No events')}
        </span>
      </div>

      {/* Decision Summary — verdict banner */}
      <div className="sa-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          padding: '18px 20px',
          background: 'linear-gradient(135deg, var(--sa-red-dim), transparent 70%)',
          borderBottom: '1px solid var(--sa-border)',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--sa-red-dim)', color: 'var(--sa-red)',
            border: '1px solid rgba(239,68,68,0.3)',
          }}>
            <IcShield size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ margin: '0 0 3px', fontWeight: 800, fontSize: '1.0625rem', color: 'var(--sa-text)' }}>
              Application Rejected
            </p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text-2)' }}>
              This registration was reviewed and declined, then archived for the record.
            </p>
          </div>
          <span className="sa-badge sa-badge--rejected" style={{ flexShrink: 0 }}>Rejected &amp; Archived</span>
        </div>
        <div className="sa-review-section-body">
          <div className="sa-review-field">
            <span className="sa-review-field-key">Rejected By</span>
            <span className="sa-review-field-val">{rejectedBy || 'Not recorded'}</span>
          </div>
          <div className="sa-review-field">
            <span className="sa-review-field-key">Date of Rejection</span>
            <span className="sa-review-field-val" style={{ textAlign: 'right' }}>
              {rejectedTs ? fmtDateTime(rejectedTs) : 'Not recorded'}
              {rejectedTs && (
                <span style={{ display: 'block', fontWeight: 500, fontSize: '0.6875rem', color: 'var(--sa-text-3)' }}>
                  {relTime(rejectedTs, now)}
                </span>
              )}
            </span>
          </div>
          <div className="sa-review-field" style={{ borderBottom: 'none' }}>
            <span className="sa-review-field-key">Official Reason</span>
            <span className="sa-review-field-val sa-review-field-val--red">{reason}</span>
          </div>
        </div>
      </div>

      {/* Internal Audit Log */}
      <div className="sa-card" style={{ marginBottom: 16 }}>
        <div className="sa-card-head" style={{ flexWrap: 'wrap', gap: 8 }}>
          <p className="sa-card-title">
            Internal Audit Log
            <span style={{ color: 'var(--sa-text-2)', fontWeight: 500 }}> — {timeline.length} events</span>
          </p>
          <button
            className="sa-btn sa-btn--ghost sa-btn--sm"
            style={{ gap: 6 }}
            onClick={fetchLogs}
            disabled={loading}
            title="Refresh audit trail"
          >
            <IcRefresh /> {loading ? 'Syncing…' : 'Refresh'}
          </button>
        </div>

        <div className="sa-card-body" style={{ paddingBottom: 8 }}>
          {/* Source caption */}
          <p style={{ margin: '0 0 14px', fontSize: '0.6875rem', color: 'var(--sa-text-3)' }}>
            {isReal
              ? <>Live trail from the security audit log{lastSync ? ` · synced ${relTime(lastSync, now)}` : ''}.</>
              : loading
                ? 'Loading live audit events…'
                : 'No detailed audit events were recorded for this school — the summary above reflects its current status.'}
          </p>

          <div className="sa-tl">
            {timeline.length === 0 && (
              <p style={{ margin: '8px 0', fontSize: '0.8125rem', color: 'var(--sa-text-3)' }}>
                {loading ? 'Loading audit events…' : 'No audit events recorded for this school.'}
              </p>
            )}
            {timeline.map((ev, i) => {
              const last = i === timeline.length - 1;
              return (
                <div key={ev.key} className="sa-tl-item">
                  <div className="sa-tl-left">
                    <div className={`sa-tl-dot sa-tl-dot--${ev.dot}`} />
                    {!last && <div className="sa-tl-line" />}
                  </div>
                  <div className="sa-tl-content" style={{ paddingBottom: last ? 0 : 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                        <span style={{ color: DOT_COLOR[ev.dot], display: 'flex', flexShrink: 0 }}>{ev.icon}</span>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: ev.highlight ? 'var(--sa-red)' : 'var(--sa-text)' }}>
                          {ev.label}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--sa-text-2)', whiteSpace: 'nowrap' }}>
                          {fmtDateTime(ev.ts)}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.625rem', color: 'var(--sa-text-3)', whiteSpace: 'nowrap' }}>
                          {relTime(ev.ts, now)}
                        </p>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text-2)', lineHeight: 1.55 }}>
                      {ev.desc}
                    </p>
                    {ev.actor && ev.actor !== '—' && !ev.derived && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
                        background: 'var(--sa-border)', color: 'var(--sa-text-2)',
                        borderRadius: 20, padding: '2px 9px', fontSize: '0.6875rem', fontWeight: 600,
                      }}>
                        <IcUser /> {ev.actor}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data Snapshot */}
      <div className="sa-review-section" style={{ marginBottom: 16 }}>
        <div className="sa-review-section-head">
          <span className="sa-review-section-icon"><IcInfo /></span> Data Snapshot (Read-Only)
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
          <div className="sa-review-field">
            <span className="sa-review-field-key">Admin Email</span>
            <span className="sa-review-field-val">{school.admin_email || school.email || '—'}</span>
          </div>
          <div className="sa-review-field" style={{ borderBottom: 'none' }}>
            <span className="sa-review-field-key">Submitted</span>
            <span className="sa-review-field-val">{fmtDate(school.registration_date)}</span>
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
              Reopen this rejected application and return it to the school to update and resubmit.
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
