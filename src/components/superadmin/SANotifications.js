import React, { useState } from 'react';

/* ================================================================
   Mock notification data
   ================================================================ */
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'application',
    severity: 'info',
    title: 'New school application submitted',
    body: 'Freetown International Academy has submitted a registration application and is awaiting review.',
    school: 'Freetown International Academy',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    read: false,
    actionLabel: 'Review Application',
    actionPage: 'applications',
  },
  {
    id: 2,
    type: 'security',
    severity: 'critical',
    title: 'Multiple failed login attempts detected',
    body: '14 consecutive failed login attempts from IP 197.242.81.34 targeting admin accounts at Bo Science Secondary.',
    school: 'Bo Science Secondary School',
    timestamp: new Date(Date.now() - 1000 * 60 * 34).toISOString(),
    read: false,
    actionLabel: 'View Security Logs',
    actionPage: 'security-logs',
  },
  {
    id: 3,
    type: 'grade',
    severity: 'warning',
    title: 'Grade modification request pending',
    body: 'A grade modification request for JSS 3B Mathematics (Final Exam) at Kenema Girls Secondary is awaiting approval.',
    school: 'Kenema Girls Secondary',
    timestamp: new Date(Date.now() - 1000 * 60 * 58).toISOString(),
    read: false,
    actionLabel: 'Review Request',
    actionPage: 'grade-requests',
  },
  {
    id: 4,
    type: 'application',
    severity: 'success',
    title: 'School registration approved',
    body: 'Makeni United College was successfully approved and onboarded. School admin credentials have been dispatched.',
    school: 'Makeni United College',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: true,
    actionLabel: 'View School',
    actionPage: 'schools',
  },
  {
    id: 5,
    type: 'system',
    severity: 'warning',
    title: 'System health degraded',
    body: 'Database response time exceeded threshold (2.4s avg). Performance may be affected for up to 200 concurrent users.',
    school: null,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    read: true,
    actionLabel: 'View System Health',
    actionPage: 'system-health',
  },
  {
    id: 6,
    type: 'security',
    severity: 'warning',
    title: 'Unusual access pattern flagged',
    body: 'User k.sesay@portloko-sec.edu.sl accessed grade records outside normal working hours (02:47 AM).',
    school: 'Port Loko Secondary School',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    read: true,
    actionLabel: 'View Forensics',
    actionPage: 'forensics',
  },
  {
    id: 7,
    type: 'application',
    severity: 'error',
    title: 'Application rejected',
    body: 'Registration for Lunsar Islamic School was rejected due to incomplete documentation. Rejection notice sent.',
    school: 'Lunsar Islamic School',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    read: true,
    actionLabel: 'View Rejected',
    actionPage: 'rejected',
  },
  {
    id: 8,
    type: 'grade',
    severity: 'info',
    title: 'Grade lock period started',
    body: 'Term 2 grade lock has been applied across 6 active schools. No further edits are permitted without a modification request.',
    school: null,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
    actionLabel: 'View Grade Integrity',
    actionPage: 'grade-report',
  },
];

/* ================================================================
   SVG Icons
   ================================================================ */
const IcApplication = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
  </svg>
);
const IcSecurity = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IcGrade = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M9 11l3 3L22 4"/>
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
);
const IcSystem = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const IcCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/* ================================================================
   Helpers
   ================================================================ */
const TYPE_CFG = {
  application: { icon: <IcApplication />, color: 'var(--sa-accent)'  },
  security:    { icon: <IcSecurity />,    color: 'var(--sa-red)'     },
  grade:       { icon: <IcGrade />,       color: 'var(--sa-purple)'  },
  system:      { icon: <IcSystem />,      color: 'var(--sa-amber)'   },
};

const SEV_CFG = {
  critical: { label: 'Critical', color: 'var(--sa-red)',    bg: 'rgba(239,68,68,0.12)'  },
  error:    { label: 'Error',    color: 'var(--sa-red)',    bg: 'rgba(239,68,68,0.08)'  },
  warning:  { label: 'Warning',  color: 'var(--sa-amber)',  bg: 'rgba(245,158,11,0.12)' },
  info:     { label: 'Info',     color: 'var(--sa-accent)', bg: 'rgba(99,102,241,0.10)' },
  success:  { label: 'Success',  color: 'var(--sa-green)',  bg: 'rgba(16,185,129,0.12)' },
};

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

/* ================================================================
   Initial unread count — exported so Dashboard can initialise badge
   ================================================================ */
export const INITIAL_UNREAD_COUNT = MOCK_NOTIFICATIONS.filter(n => !n.read).length;

/* ================================================================
   Main Component
   ================================================================ */
export default function SANotifications({ onNavigate, onUnreadChange }) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter]               = useState('all');   // all | unread | application | security | grade | system

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      onUnreadChange && onUnreadChange(next.filter(n => !n.read).length);
      return next;
    });
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onUnreadChange && onUnreadChange(0);
  };

  const dismiss = (id) => {
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== id);
      onUnreadChange && onUnreadChange(next.filter(n => !n.read).length);
      return next;
    });
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread')  return !n.read;
    if (filter === 'all')     return true;
    return n.type === filter;
  });

  const FILTERS = [
    { key: 'all',         label: 'All' },
    { key: 'unread',      label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { key: 'application', label: 'Applications' },
    { key: 'security',    label: 'Security' },
    { key: 'grade',       label: 'Grades' },
    { key: 'system',      label: 'System' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Page header */}
      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">Notifications</h1>
          <p className="sa-page-sub">System alerts and activity notifications</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px',
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              color: 'var(--sa-accent)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <IcCheck /> Mark all as read
          </button>
        )}
      </div>

      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Total',        value: notifications.length,                               color: 'var(--sa-text)'   },
          { label: 'Unread',       value: unreadCount,                                         color: 'var(--sa-accent)' },
          { label: 'Security',     value: notifications.filter(n => n.type === 'security').length, color: 'var(--sa-red)'    },
          { label: 'Grade Alerts', value: notifications.filter(n => n.type === 'grade').length,    color: 'var(--sa-purple)' },
        ].map(card => (
          <div key={card.label} className="sa-card" style={{ padding: '18px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--sa-text-2)', margin: '4px 0 0', fontWeight: 500 }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="sa-filter-tabs">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="sa-filter-tab"
            style={{
              background:  filter === f.key ? 'var(--sa-accent)' : undefined,
              color:       filter === f.key ? '#fff'             : undefined,
              borderColor: filter === f.key ? 'var(--sa-accent)' : undefined,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 && (
          <div className="sa-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--sa-text-3)' }}>
            <p style={{ fontSize: '0.9375rem', margin: 0 }}>No notifications to show</p>
          </div>
        )}

        {filtered.map(notif => {
          const typeCfg = TYPE_CFG[notif.type] || TYPE_CFG.system;
          const sevCfg  = SEV_CFG[notif.severity] || SEV_CFG.info;

          return (
            <div
              key={notif.id}
              className="sa-card"
              style={{
                padding: '18px 20px',
                display: 'flex', gap: '16px', alignItems: 'flex-start',
                borderLeft: `3px solid ${notif.read ? 'transparent' : typeCfg.color}`,
                transition: 'border-color 0.2s',
              }}
            >
              {/* Type icon bubble */}
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                background: `${typeCfg.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: typeCfg.color,
              }}>
                {typeCfg.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: notif.read ? 500 : 700, color: notif.read ? 'var(--sa-text-2)' : 'var(--sa-text)' }}>
                      {notif.title}
                    </span>
                    {!notif.read && (
                      <span style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: typeCfg.color, flexShrink: 0,
                        display: 'inline-block',
                      }} />
                    )}
                    <span style={{
                      padding: '2px 8px', borderRadius: '20px', fontSize: '0.6875rem', fontWeight: 700,
                      background: sevCfg.bg, color: sevCfg.color,
                    }}>
                      {sevCfg.label}
                    </span>
                  </div>
                  <span
                    title={formatFull(notif.timestamp)}
                    style={{ fontSize: '0.75rem', color: 'var(--sa-text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {relativeTime(notif.timestamp)}
                  </span>
                </div>

                <p style={{ fontSize: '0.8125rem', color: notif.read ? 'var(--sa-text-2)' : 'var(--sa-text)', margin: '0 0 10px', lineHeight: 1.55 }}>
                  {notif.body}
                </p>

                {notif.school && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--sa-text-3)', margin: '0 0 10px' }}>
                    School: <span style={{ color: 'var(--sa-text-2)', fontWeight: 600 }}>{notif.school}</span>
                  </p>
                )}

                {/* Action row */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {notif.actionLabel && onNavigate && (
                    <button
                      onClick={() => { markRead(notif.id); onNavigate(notif.actionPage); }}
                      style={{
                        padding: '5px 12px', borderRadius: '6px', fontSize: '0.78125rem', fontWeight: 600,
                        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                        color: 'var(--sa-accent)', cursor: 'pointer',
                      }}
                    >
                      {notif.actionLabel}
                    </button>
                  )}
                  {!notif.read && (
                    <button
                      onClick={() => markRead(notif.id)}
                      style={{
                        padding: '5px 12px', borderRadius: '6px', fontSize: '0.78125rem', fontWeight: 600,
                        background: 'transparent', border: '1px solid var(--sa-border)',
                        color: 'var(--sa-text-2)', cursor: 'pointer',
                      }}
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={() => dismiss(notif.id)}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', fontSize: '0.78125rem', fontWeight: 600,
                      background: 'transparent', border: '1px solid var(--sa-border)',
                      color: 'var(--sa-text-3)', cursor: 'pointer',
                    }}
                  >
                    Dismiss
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
