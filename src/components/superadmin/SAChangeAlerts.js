import React, { useState, useEffect, useCallback, useRef } from 'react';
import ApiClient from '../../api/client';

/* ── Trigger type config ─────────────────────────────────── */
const TRIGGER_CFG = {
  grade_lock_attempt: {
    label: 'Grade Lock',
    desc:  'Grade modification on locked record',
    color: 'var(--sa-red)',
    bg:    'rgba(239,68,68,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
    ),
  },
  enrollment_change: {
    label: 'Enrollment',
    desc:  'Student enrollment status change',
    color: 'var(--sa-amber)',
    bg:    'rgba(245,158,11,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  fee_payment: {
    label: 'Fee Payment',
    desc:  'Fee payment recorded',
    color: 'var(--sa-green)',
    bg:    'rgba(16,185,129,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
  attendance_anomaly: {
    label: 'Attendance',
    desc:  'Attendance anomaly detected',
    color: '#a78bfa',
    bg:    'rgba(167,139,250,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  permission_change: {
    label: 'Permission',
    desc:  'User permission change',
    color: 'var(--sa-accent)',
    bg:    'rgba(14,165,233,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
};

const SEV_CFG = {
  critical: { label: 'Critical', color: 'var(--sa-red)',    bg: 'rgba(239,68,68,0.12)'  },
  high:     { label: 'High',     color: 'var(--sa-red)',    bg: 'rgba(239,68,68,0.08)'  },
  medium:   { label: 'Medium',   color: 'var(--sa-amber)',  bg: 'rgba(245,158,11,0.12)' },
  low:      { label: 'Low',      color: 'var(--sa-green)',  bg: 'rgba(16,185,129,0.12)' },
};

const STATUS_CFG = {
  new:          { label: 'New',          color: 'var(--sa-accent)', bg: 'rgba(14,165,233,0.12)' },
  acknowledged: { label: 'Acknowledged', color: 'var(--sa-amber)',  bg: 'rgba(245,158,11,0.10)' },
  resolved:     { label: 'Resolved',     color: 'var(--sa-green)',  bg: 'rgba(16,185,129,0.12)' },
};

/* ── Channel badges ──────────────────────────────────────── */
function ChannelBadge({ active, sentAt, label, icon }) {
  const title = active && sentAt
    ? `${label} sent ${new Date(sentAt).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}`
    : active ? `${label} sent` : `${label} not sent`;
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 20, fontSize: '0.625rem', fontWeight: 700,
        background: active ? 'rgba(16,185,129,0.12)' : 'var(--sa-card-bg2)',
        color: active ? 'var(--sa-green)' : 'var(--sa-text-3)',
        border: `1px solid ${active ? 'rgba(16,185,129,0.25)' : 'var(--sa-border)'}`,
      }}
    >
      {icon}
      {label}
      {active && (
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </span>
  );
}

/* ── Helpers ─────────────────────────────────────────────── */
function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatFull(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── Icons ───────────────────────────────────────────────── */
const IcRefresh = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
  </svg>
);
const IcInApp = () => (
  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);
const IcEmail = () => (
  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IcSms = () => (
  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const IcPush = () => (
  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
    <line x1="12" y1="18" x2="12.01" y2="18"/>
  </svg>
);

/* ── Alert Card ──────────────────────────────────────────── */
function AlertCard({ alert, onAcknowledge, onResolve }) {
  const [expanded, setExpanded] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [notes,    setNotes]    = useState('');

  const trig   = TRIGGER_CFG[alert.trigger_type] || TRIGGER_CFG.permission_change;
  const sev    = SEV_CFG[alert.severity]          || SEV_CFG.medium;
  const status = STATUS_CFG[alert.status]         || STATUS_CFG.new;
  const ch     = alert.channels || {};
  const isNew  = alert.status === 'new';

  const handleAction = async (action) => {
    setLoading(true);
    try {
      await (action === 'resolve' ? onResolve : onAcknowledge)(alert.id, notes);
    } finally {
      setLoading(false);
      setExpanded(false);
    }
  };

  return (
    <div
      className="sa-card"
      style={{
        padding: '16px 18px',
        borderLeft: `3px solid ${isNew ? trig.color : 'transparent'}`,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Icon bubble */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: trig.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: trig.color,
        }}>
          {trig.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
              {isNew && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: trig.color, flexShrink: 0, display: 'inline-block' }} />
              )}
              <span style={{ fontSize: '0.9rem', fontWeight: isNew ? 700 : 500, color: 'var(--sa-text)', wordBreak: 'break-word' }}>
                {alert.title}
              </span>
              {/* Trigger type pill */}
              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.625rem', fontWeight: 700, background: trig.bg, color: trig.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {trig.label}
              </span>
              {/* Severity */}
              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.625rem', fontWeight: 700, background: sev.bg, color: sev.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {sev.label}
              </span>
              {/* Status */}
              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.625rem', fontWeight: 700, background: status.bg, color: status.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {status.label}
              </span>
            </div>
            <span title={formatFull(alert.triggered_at)} style={{ fontSize: '0.75rem', color: 'var(--sa-text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {relativeTime(alert.triggered_at)}
            </span>
          </div>

          {/* Description */}
          <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', margin: '0 0 10px', lineHeight: 1.55 }}>
            {alert.description}
          </p>

          {/* Meta row */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10, fontSize: '0.75rem', color: 'var(--sa-text-3)' }}>
            {alert.school && (
              <span>School: <strong style={{ color: 'var(--sa-text-2)' }}>{alert.school}</strong></span>
            )}
            {alert.triggered_by && (
              <span>By: <strong style={{ color: 'var(--sa-text-2)' }}>{alert.triggered_by}</strong></span>
            )}
            {alert.acknowledged_by && alert.status !== 'new' && (
              <span>{alert.status === 'resolved' ? 'Resolved' : 'Ack.'} by: <strong style={{ color: 'var(--sa-text-2)' }}>{alert.acknowledged_by}</strong></span>
            )}
          </div>

          {/* Notification channels */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <ChannelBadge active={ch.in_app}  label="In-App" icon={<IcInApp />}  sentAt={null} />
            <ChannelBadge active={ch.email}   label="Email"  icon={<IcEmail />}  sentAt={ch.email_sent_at} />
            <ChannelBadge active={ch.sms}     label="SMS"    icon={<IcSms />}    sentAt={ch.sms_sent_at} />
            <ChannelBadge active={ch.push}    label="Push"   icon={<IcPush />}   sentAt={ch.push_sent_at} />
          </div>

          {/* Action row */}
          {isNew && !expanded && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setExpanded(true)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: '0.78125rem', fontWeight: 600,
                  minHeight: 44, background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)',
                  color: 'var(--sa-accent)', cursor: 'pointer',
                }}
              >
                Acknowledge
              </button>
              <button
                onClick={() => handleAction('resolve')}
                disabled={loading}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: '0.78125rem', fontWeight: 600,
                  minHeight: 44, background: 'transparent', border: '1px solid var(--sa-border)',
                  color: 'var(--sa-text-2)', cursor: 'pointer', opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? 'Saving…' : 'Resolve'}
              </button>
            </div>
          )}

          {/* Acknowledge form */}
          {expanded && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                placeholder="Add investigation notes (optional)…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                  background: 'var(--sa-card-bg2)', border: '1px solid var(--sa-border)',
                  borderRadius: 8, color: 'var(--sa-text)', fontSize: '0.8125rem',
                  resize: 'vertical', fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleAction('acknowledge')}
                  disabled={loading}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 600,
                    minHeight: 44, background: 'var(--sa-accent)', border: 'none', color: '#fff',
                    cursor: 'pointer', opacity: loading ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Saving…' : 'Confirm Acknowledge'}
                </button>
                <button
                  onClick={() => setExpanded(false)}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 600,
                    minHeight: 44, background: 'transparent', border: '1px solid var(--sa-border)',
                    color: 'var(--sa-text-2)', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Channel Preferences ─────────────────────────────────── */
const CHANNEL_DEFS = [
  { key: 'in_app', icon: <IcInApp />, label: 'In-App',  desc: 'Show alerts inside this dashboard' },
  { key: 'email',  icon: <IcEmail />, label: 'Email',   desc: 'Send when an alert fires' },
  { key: 'sms',    icon: <IcSms />,   label: 'SMS',     desc: 'Send for critical alerts' },
  { key: 'push',   icon: <IcPush />,  label: 'Push',    desc: 'Mobile push notifications' },
];

function ChannelPrefs() {
  const [prefs, setPrefs] = useState({ in_app: true, email: true, sms: true, push: false });
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    ApiClient.get('/api/admin-settings/').then(d => {
      if (d?.success && d.settings?.alert_channel_prefs) {
        setPrefs(prev => ({ ...prev, ...d.settings.alert_channel_prefs }));
      }
    }).catch(() => {});
  }, []);

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    try {
      await ApiClient.patch('/api/admin-settings/', { settings: { alert_channel_prefs: next } });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      // revert on failure
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    setSaving(true);
    try {
      const d = await ApiClient.get('/api/admin-settings/');
      if (d?.success && d.settings?.alert_channel_prefs) {
        setPrefs(prev => ({ ...prev, ...d.settings.alert_channel_prefs }));
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sa-card" style={{ padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sa-text-3)', margin: 0 }}>
          Notification Channels {savedFlash && <span style={{ color: 'var(--sa-green)', marginLeft: 6 }}>· Saved ✓</span>}
        </p>
        <button
          onClick={refresh}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'var(--sa-card-bg2)', border: '1px solid var(--sa-border)', color: 'var(--sa-text-2)', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
          title="Reload channel preferences"
        >
          <IcRefresh /> Refresh
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CHANNEL_DEFS.map(ch => {
          const on = !!prefs[ch.key];
          return (
            <button
              key={ch.key}
              onClick={() => toggle(ch.key)}
              disabled={saving}
              title={ch.desc}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                background: on ? 'rgba(16,185,129,0.12)' : 'var(--sa-card-bg2)',
                border: `1px solid ${on ? 'rgba(16,185,129,0.35)' : 'var(--sa-border)'}`,
                color: on ? 'var(--sa-green)' : 'var(--sa-text-2)',
                fontSize: '0.75rem', fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
                transition: 'all 0.15s',
              }}
              aria-pressed={on}
            >
              <span style={{ display: 'flex' }}>{ch.icon}</span>
              {ch.label}
              <span style={{ marginLeft: 4, fontSize: '0.625rem', fontWeight: 700, opacity: 0.85 }}>{on ? 'ON' : 'OFF'}</span>
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-3)', marginTop: 8 }}>
        Click a channel to toggle; preferences are saved per superadmin.
      </p>
    </div>
  );
}


/* ── Main component ──────────────────────────────────────── */
export default function SAChangeAlerts() {
  const [alerts,       setAlerts]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [filter,       setFilter]       = useState('all');   // all | new | acknowledged | resolved | <trigger_type>
  const [lastRefresh,  setLastRefresh]  = useState(null);
  const [refreshing,   setRefreshing]   = useState(false);
  const timerRef = useRef(null);

  const fetchAlerts = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const data = await ApiClient.get('/api/system-alerts/');
      if (data.success) {
        setAlerts(data.alerts || []);
        setLastRefresh(new Date());
      } else {
        setError(data.message || 'Failed to load alerts.');
      }
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* Initial load + auto-refresh every 30 s */
  useEffect(() => {
    fetchAlerts(false);
    timerRef.current = setInterval(() => fetchAlerts(true), 30000);
    return () => clearInterval(timerRef.current);
  }, [fetchAlerts]);

  const handleAcknowledge = useCallback(async (id, notes) => {
    await ApiClient.post('/api/system-alerts/', { id, action: 'acknowledge', notes });
    await fetchAlerts(true);
  }, [fetchAlerts]);

  const handleResolve = useCallback(async (id, notes) => {
    await ApiClient.post('/api/system-alerts/', { id, action: 'resolve', notes });
    await fetchAlerts(true);
  }, [fetchAlerts]);

  /* Derived counts */
  const newCount    = alerts.filter(a => a.status === 'new').length;
  const critCount   = alerts.filter(a => a.severity === 'critical').length;
  const ackCount    = alerts.filter(a => a.status === 'acknowledged').length;
  const resolveCount = alerts.filter(a => a.status === 'resolved').length;

  const filtered = filter === 'all'          ? alerts
    : filter === 'new'                       ? alerts.filter(a => a.status === 'new')
    : filter === 'acknowledged'              ? alerts.filter(a => a.status === 'acknowledged')
    : filter === 'resolved'                  ? alerts.filter(a => a.status === 'resolved')
    : alerts.filter(a => a.trigger_type === filter);

  /* Filter tabs */
  const FILTER_TABS = [
    { key: 'all',          label: `All (${alerts.length})` },
    { key: 'new',          label: `New${newCount > 0 ? ` (${newCount})` : ''}` },
    { key: 'acknowledged', label: 'Acknowledged' },
    { key: 'resolved',     label: 'Resolved' },
    { key: 'separator',    label: '|' },
    ...Object.entries(TRIGGER_CFG).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      color: cfg.color,
      count: alerts.filter(a => a.trigger_type === key).length,
    })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">System-Wide Change Alerts</h1>
          <p className="sa-page-sub">
            Real-time notifications for significant change events across the platform.
            {lastRefresh && (
              <span style={{ marginLeft: 10, fontSize: '0.6875rem', color: 'var(--sa-text-3)' }}>
                Last updated {relativeTime(lastRefresh.toISOString())}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchAlerts(true)}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: 'var(--sa-card-bg2)', border: '1px solid var(--sa-border)',
            color: 'var(--sa-text-2)', fontSize: '0.8125rem', fontWeight: 600,
            cursor: 'pointer', opacity: refreshing ? 0.6 : 1,
          }}
        >
          <IcRefresh /> {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total Alerts',  value: alerts.length, color: 'var(--sa-text)'   },
          { label: 'New',           value: newCount,       color: 'var(--sa-accent)' },
          { label: 'Critical',      value: critCount,      color: 'var(--sa-red)'    },
          { label: 'Acknowledged',  value: ackCount,       color: 'var(--sa-amber)'  },
          { label: 'Resolved',      value: resolveCount,   color: 'var(--sa-green)'  },
        ].map(c => (
          <div key={c.label} className="sa-card" style={{ padding: '16px 18px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: c.color, margin: 0 }}>{c.value}</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)', margin: '4px 0 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Notification channel preferences — real toggles persisted to AdminSetting */}
      <ChannelPrefs />


      {/* Filter tabs */}
      <div className="sa-filter-tabs" style={{ flexWrap: 'wrap', gap: 6 }}>
        {FILTER_TABS.map(t => {
          if (t.key === 'separator') return (
            <span key="sep" style={{ width: 1, height: 24, background: 'var(--sa-border)', alignSelf: 'center', flexShrink: 0 }} />
          );
          const isActive = filter === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className="sa-filter-tab"
              style={{
                background:  isActive ? (t.color || 'var(--sa-accent)') : undefined,
                color:       isActive ? '#fff' : undefined,
                borderColor: isActive ? (t.color || 'var(--sa-accent)') : undefined,
              }}
            >
              {t.label}
              {t.count != null && t.count > 0 && !isActive && (
                <span style={{
                  marginLeft: 4, padding: '1px 6px', borderRadius: 10,
                  background: 'var(--sa-card-bg2)', fontSize: '0.625rem', fontWeight: 700,
                  color: 'var(--sa-text-2)',
                }}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="sa-loader-ring" style={{ width: 36, height: 36 }} />
        </div>
      )}

      {!loading && error && (
        <div className="sa-card" style={{ padding: 20, color: 'var(--sa-red)', fontSize: '0.875rem', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="sa-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--sa-text-3)', marginBottom: 12 }}>
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <p style={{ fontSize: '0.9375rem', color: 'var(--sa-text-3)', margin: 0 }}>
            {filter === 'all'
              ? 'No system alerts yet. Events will appear here automatically when trigger conditions are met.'
              : `No ${filter} alerts.`}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}
