import React, { useState } from 'react';

/* ---- Icons ---- */
const IcCampaign = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 22-7z"/></svg>;
const IcCheck    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcAlert    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcUsers    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const IcMail     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const IcSecurity = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcArrow    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IcAnalytics= () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IcBack     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;

/* ---- Mock data ---- */
const ALERTS = [
  {
    id: 'ALT-001', title: 'Emergency Grade Lock Protocol Update',
    type: 'Security', severity: 'critical',
    target: 'All Schools', status: 'Sent', time: 'Today, 09:42 AM',
    body: 'Please be advised that the emergency grade lock protocol has been updated effective immediately. All school administrators are required to review the new procedures regarding classroom lockdown drills and real-time reporting mechanisms. Failure to acknowledge this protocol may result in suspension of administrative override privileges.',
    readRate: 87, recipients: 1245,
  },
  {
    id: 'ALT-002', title: 'Scheduled Server Maintenance Window',
    type: 'System Ops', severity: 'medium',
    target: 'Region: Western', status: 'Scheduled', time: 'Tomorrow, 11:00 PM',
    body: 'A planned maintenance window is scheduled for the Western region servers. Expect brief service interruptions. Administrators should notify their users in advance and ensure all pending grade submissions are saved before the window begins.',
    readRate: 0, recipients: 342,
  },
  {
    id: 'ALT-003', title: 'Policy Update: Q4 Data Retention',
    type: 'General', severity: 'low',
    target: 'Admin Staff', status: 'Draft', time: 'Last edited 2h ago',
    body: 'The Q4 data retention policy update is currently in draft. This will affect how student records are archived at the end of the academic year. Please review and provide feedback before the policy goes into effect.',
    readRate: 0, recipients: 0,
  },
];

const STATUS_STYLE = {
  Sent:      { color: 'var(--sa-green)',  bg: 'var(--sa-green-dim)'  },
  Scheduled: { color: 'var(--sa-accent)', bg: 'var(--sa-accent-dim)' },
  Draft:     { color: 'var(--sa-text-2)', bg: 'var(--sa-card-bg2)'   },
};

const SEV_STYLE = {
  critical: { color: 'var(--sa-red)',    bg: 'var(--sa-red-dim)',    iconBg: 'rgba(239,68,68,0.12)'    },
  medium:   { color: 'var(--sa-amber)',  bg: 'var(--sa-amber-dim)',  iconBg: 'rgba(245,158,11,0.12)'  },
  low:      { color: 'var(--sa-purple)', bg: 'var(--sa-purple-dim)', iconBg: 'rgba(139,92,246,0.12)' },
};

const TYPE_ICONS = { Security: <IcSecurity />, 'System Ops': <IcAnalytics />, General: <IcMail /> };

/* ==============================
   Detail View
   ============================== */
function AlertDetail({ alert, onBack }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const sev = SEV_STYLE[alert.severity] || SEV_STYLE.low;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <button className="sa-btn sa-btn--ghost sa-btn--sm" style={{ marginBottom: 20, gap: 6 }} onClick={onBack}>
        <IcBack /> Back to Broadcast Center
      </button>

      {/* Type + severity badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--sa-card-bg2)', color: 'var(--sa-text-2)',
          border: '1px solid var(--sa-border)', borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600,
        }}>
          {TYPE_ICONS[alert.type]} {alert.type}
        </span>
        <span style={{
          background: sev.bg, color: sev.color, border: `1px solid ${sev.color}33`,
          borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700,
        }}>
          {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)} Alert
        </span>
      </div>

      {/* Title */}
      <h1 style={{ margin: '0 0 12px', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.25, color: 'var(--sa-text)' }}>
        {alert.title}
      </h1>

      {/* Metadata */}
      <div style={{ borderLeft: '2px solid var(--sa-accent)', paddingLeft: 12, marginBottom: 24 }}>
        <p style={{ margin: '0 0 2px', fontSize: '0.875rem', color: 'var(--sa-text-2)' }}>
          Target: <span style={{ color: 'var(--sa-text)', fontWeight: 600 }}>{alert.target}</span>
        </p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--sa-text-2)' }}>{alert.time}</p>
      </div>

      {/* Body */}
      <p style={{ margin: '0 0 24px', fontSize: '0.9375rem', color: 'var(--sa-text-2)', lineHeight: 1.7 }}>{alert.body}</p>

      {/* Acknowledgment box */}
      <div style={{
        background: 'var(--sa-card-bg2)', border: '1px solid var(--sa-border)', borderRadius: 12,
        padding: '18px 20px', marginBottom: 16, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -10, right: -10, width: 64, height: 64, background: 'var(--sa-accent-dim)', borderRadius: '50%', filter: 'blur(14px)' }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative' }}>
          <div className="sa-stat-icon sa-stat-icon--blue" style={{ width: 32, height: 32, flexShrink: 0 }}>
            <IcCheck />
          </div>
          <div>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--sa-text)' }}>Acknowledgment Required</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text-2)', lineHeight: 1.55 }}>
              This is a critical security update. Your acknowledgment is logged for system audit and compliance tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <button
        className={`sa-btn sa-btn--full ${acknowledged ? 'sa-btn--ghost' : 'sa-btn--primary'}`}
        onClick={() => setAcknowledged(true)}
        disabled={acknowledged}
        style={{ marginBottom: 12, justifyContent: 'center' }}
      >
        <IcCheck /> {acknowledged ? 'Acknowledged ✓' : 'Acknowledge & Dismiss'}
      </button>

      {/* Secondary */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="sa-btn sa-btn--ghost sa-btn--full" style={{ justifyContent: 'center', fontSize: '0.8125rem' }}>
          View Full Audit Log
        </button>
        <button className="sa-btn sa-btn--ghost sa-btn--full" style={{ justifyContent: 'center', fontSize: '0.8125rem' }}>
          Review School Settings
        </button>
      </div>

      {/* Delivery analytics — only for Sent */}
      {alert.status === 'Sent' && (
        <div className="sa-card" style={{ marginTop: 20 }}>
          <div className="sa-card-head">
            <p className="sa-card-title"><IcAnalytics style={{ display: 'inline', verticalAlign: 'middle', width: 14, height: 14, marginRight: 6 }} />Delivery Analytics</p>
          </div>
          <div className="sa-card-body">
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)' }}>Read Rate</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: alert.readRate >= 90 ? 'var(--sa-green)' : 'var(--sa-amber)' }}>{alert.readRate}%</span>
              </div>
              <div className="sa-progress-track">
                <div className="sa-progress-fill" style={{ width: `${alert.readRate}%`, background: alert.readRate >= 90 ? 'var(--sa-green)' : 'var(--sa-amber)' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Recipients', alert.recipients.toLocaleString()],
                ['Read',       Math.round(alert.recipients * alert.readRate / 100).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--sa-card-bg2)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--sa-border)' }}>
                  <p style={{ margin: '0 0 2px', fontSize: '0.6875rem', color: 'var(--sa-text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.125rem', color: 'var(--sa-text)' }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==============================
   Compose View
   ============================== */
function ComposeAlert({ onBack }) {
  const [title,    setTitle]    = useState('');
  const [type,     setType]     = useState('General');
  const [severity, setSeverity] = useState('low');
  const [target,   setTarget]   = useState('All Schools');
  const [body,     setBody]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);

  const canSend = title.trim().length > 0 && body.trim().length > 0;

  const handleSend = () => {
    setSending(true);
    setTimeout(() => { setSent(true); setTimeout(onBack, 1200); }, 800);
  };

  if (sent) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 16, textAlign: 'center' }}>
      <div className="sa-stat-icon sa-stat-icon--green" style={{ width: 56, height: 56 }}><IcCheck /></div>
      <p style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--sa-text)', margin: 0 }}>Alert Sent!</p>
      <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', margin: 0 }}>Returning to Broadcast Center…</p>
    </div>
  );

  const ChevDown = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
  );

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <button className="sa-btn sa-btn--ghost sa-btn--sm" style={{ marginBottom: 20, gap: 6 }} onClick={onBack}>
        <IcBack /> Back to Broadcast Center
      </button>
      <h1 style={{ margin: '0 0 4px', fontSize: '1.375rem', fontWeight: 800, color: 'var(--sa-text)' }}>Compose Alert</h1>
      <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: 'var(--sa-text-2)' }}>Create a new broadcast for school administrators.</p>

      {/* Title */}
      <div style={{ marginBottom: 16 }}>
        <label className="sa-field-label" htmlFor="cmp-title">
          Title <span style={{ color: 'var(--sa-red)' }}>*</span>
        </label>
        <input id="cmp-title" className="sa-text-input" type="text"
          placeholder="e.g. Emergency Grade Lock Protocol Update"
          value={title} onChange={e => setTitle(e.target.value)} maxLength={120} />
        <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-3)', marginTop: 4, textAlign: 'right' }}>{title.length}/120</p>
      </div>

      {/* Type + Severity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="sa-field-label" htmlFor="cmp-type">Alert Type</label>
          <div className="sa-select-wrap">
            <select id="cmp-type" className="sa-select" value={type} onChange={e => setType(e.target.value)}>
              {['General', 'Security', 'System Ops'].map(o => <option key={o}>{o}</option>)}
            </select>
            <span className="sa-select-chevron"><ChevDown /></span>
          </div>
        </div>
        <div>
          <label className="sa-field-label" htmlFor="cmp-sev">Severity</label>
          <div className="sa-select-wrap">
            <select id="cmp-sev" className="sa-select" value={severity} onChange={e => setSeverity(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="critical">Critical</option>
            </select>
            <span className="sa-select-chevron"><ChevDown /></span>
          </div>
        </div>
      </div>

      {/* Target */}
      <div style={{ marginBottom: 16 }}>
        <label className="sa-field-label" htmlFor="cmp-target">Target Audience</label>
        <div className="sa-select-wrap">
          <select id="cmp-target" className="sa-select" value={target} onChange={e => setTarget(e.target.value)}>
            {['All Schools', 'Region: Western', 'Region: Eastern', 'Region: Northern', 'Admin Staff'].map(o => <option key={o}>{o}</option>)}
          </select>
          <span className="sa-select-chevron"><ChevDown /></span>
        </div>
      </div>

      {/* Message */}
      <div style={{ marginBottom: 20 }}>
        <label className="sa-field-label" htmlFor="cmp-body">
          Message <span style={{ color: 'var(--sa-red)' }}>*</span>
        </label>
        <textarea id="cmp-body" className="sa-lcc-reason" rows={6}
          placeholder="Write the full alert message. Be specific about required actions, deadlines, and contact points."
          value={body} onChange={e => setBody(e.target.value)}
          style={{ resize: 'vertical', minHeight: 120 }} />
        <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-3)', marginTop: 4, textAlign: 'right' }}>{body.length} chars</p>
      </div>

      {/* Live preview */}
      {title.trim() && body.trim() && (
        <div className="sa-card" style={{ marginBottom: 20, padding: '14px 16px' }}>
          <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--sa-text-3)', marginBottom: 8 }}>Preview</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ background: 'var(--sa-card-bg2)', color: 'var(--sa-text-2)', border: '1px solid var(--sa-border)', borderRadius: 20, padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 600 }}>{type}</span>
            <span style={{ background: SEV_STYLE[severity].bg, color: SEV_STYLE[severity].color, borderRadius: 20, padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 700 }}>
              {severity.charAt(0).toUpperCase() + severity.slice(1)}
            </span>
            <span style={{ background: 'var(--sa-accent-dim)', color: 'var(--sa-accent)', borderRadius: 20, padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 600 }}>{target}</span>
          </div>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--sa-text)' }}>{title}</p>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text-2)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{body}</p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="sa-btn sa-btn--primary sa-btn--full"
          style={{ justifyContent: 'center', height: 44 }}
          disabled={!canSend || sending}
          onClick={handleSend}>
          {sending ? 'Sending…' : <><IcCampaign /> Send Now — {target}</>}
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="sa-btn sa-btn--ghost sa-btn--full"
            style={{ justifyContent: 'center', fontSize: '0.8125rem' }}
            disabled={sending} onClick={onBack}>
            Schedule
          </button>
          <button className="sa-btn sa-btn--ghost sa-btn--full"
            style={{ justifyContent: 'center', fontSize: '0.8125rem' }}
            disabled={sending} onClick={onBack}>
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==============================
   Main List View
   ============================== */
export default function SAAlertBroadcast() {
  const [selected,  setSelected]  = useState(null);
  const [composing, setComposing] = useState(false);

  if (composing) return <ComposeAlert onBack={() => setComposing(false)} />;

  if (selected) {
    const alert = ALERTS.find(a => a.id === selected);
    if (alert) return <AlertDetail alert={alert} onBack={() => setSelected(null)} />;
  }

  const metrics = [
    { label: 'Active Admins',   value: '1,245', sub: '+2.4% this week', icon: <IcUsers />,    cls: 'sa-stat-icon--blue'  },
    { label: 'Avg Read Rate',   value: '94.2%', sub: 'Target: 90%',      icon: <IcMail />,     cls: 'sa-stat-icon--green' },
    { label: 'Critical Alerts', value: 12,      sub: 'This month',       icon: <IcAlert />,    cls: 'sa-stat-icon--red'   },
  ];

  return (
    <div>
      {/* Header */}
      <div className="sa-page-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="sa-page-title">Alert Broadcast Center</h1>
          <p className="sa-page-sub">Send and manage system-wide security alerts to school administrators.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--sa-green-dim)', color: 'var(--sa-green)',
            border: '1px solid rgba(16,185,129,0.25)', borderRadius: 20, padding: '5px 12px', fontSize: '0.75rem', fontWeight: 700,
          }}>
            <span className="sa-live-dot" /> System: Optimal
          </span>
          <button className="sa-btn sa-btn--primary sa-btn--sm" onClick={() => setComposing(true)}>
            <IcCampaign /> New Alert
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="sa-stat-grid" style={{ marginBottom: 20 }}>
        {metrics.map((m, i) => (
          <div key={i} className="sa-stat-card">
            <p className="sa-stat-label">{m.label}</p>
            <div className="sa-stat-row">
              <span className="sa-stat-value">{m.value}</span>
              <span className={`sa-stat-icon ${m.cls}`}>{m.icon}</span>
            </div>
            <span className="sa-stat-trend sa-stat-trend--flat">· {m.sub}</span>
          </div>
        ))}
      </div>

      {/* Broadcast history header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--sa-text)' }}>Broadcast History</p>
        <button style={{ fontSize: '0.75rem', color: 'var(--sa-accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          View All
        </button>
      </div>

      {/* Alert cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ALERTS.map(alert => {
          const ss  = STATUS_STYLE[alert.status] || STATUS_STYLE.Draft;
          const sev = SEV_STYLE[alert.severity]  || SEV_STYLE.low;
          const typeIcon = TYPE_ICONS[alert.type] || <IcCampaign />;
          return (
            <div key={alert.id} className="sa-card" style={{ cursor: 'pointer' }} onClick={() => setSelected(alert.id)}>
              <div style={{ padding: '16px 20px' }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, background: sev.iconBg, color: sev.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {typeIcon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--sa-text)', lineHeight: 1.3 }}>
                        {alert.title}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--sa-text-2)' }}>{alert.time}</p>
                    </div>
                  </div>
                  <span style={{ background: ss.bg, color: ss.color, borderRadius: 6, padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {alert.status}
                  </span>
                </div>

                {/* Meta grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[['Target', alert.target], ['Type', alert.type]].map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--sa-card-bg2)', borderRadius: 6, padding: '8px 10px', border: '1px solid var(--sa-border)' }}>
                      <p style={{ margin: '0 0 2px', fontSize: '0.625rem', color: 'var(--sa-text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{k}</p>
                      <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sa-text)' }}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Actions row */}
                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--sa-border)', paddingTop: 12 }}>
                  <button
                    className="sa-btn sa-btn--ghost sa-btn--sm"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem' }}
                    onClick={e => { e.stopPropagation(); if (alert.status === 'Draft') setComposing(true); }}
                  >
                    {alert.status === 'Sent' ? <><IcAnalytics /> View Report</> : alert.status === 'Draft' ? '✏ Continue' : '✏ Edit'}
                  </button>
                  <div style={{ width: 1, background: 'var(--sa-border)' }} />
                  <button
                    className="sa-btn sa-btn--ghost sa-btn--sm"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem' }}
                    onClick={e => { e.stopPropagation(); setSelected(alert.id); }}
                  >
                    View Details <IcArrow />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
