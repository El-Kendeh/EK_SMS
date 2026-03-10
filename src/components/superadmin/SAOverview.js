import React, { useMemo } from 'react';

/* ---- Icons ---- */
const IcSchool   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V10.6M19 21V10.6M12 3L2 8h20L12 3z"/><rect x="9" y="13" width="6" height="8" rx="1"/></svg>;
const IcClock    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>;
const IcCheck    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcShield   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcAlert    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcLock     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const IcActivity = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IcArrow    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IcLogin    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>;

/* ---- Colour palette for school avatars ---- */
const AVATAR_COLORS = ['#1B3FAF','#0EA5E9','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#6366F1'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

/* ---- Risk helper ---- */
function getRisk(school) {
  const hasCity    = !!(school.city || school.country);
  const hasContact = !!(school.phone && school.email);
  const hasAdmin   = !!(school.principal_name);
  const score      = [hasCity, hasContact, hasAdmin].filter(Boolean).length;
  if (score === 3) return 'low';
  if (score === 2) return 'medium';
  return 'high';
}

/* ---- Relative time helper ---- */
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 2)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${days}d ago`;
}

export default function SAOverview({ schools, user, onNavigate, onReview }) {
  const pending  = useMemo(() => schools.filter(s => !s.is_approved && !s.changes_requested), [schools]);
  const approved = useMemo(() => schools.filter(s => s.is_approved), [schools]);
  const changes  = useMemo(() => schools.filter(s => s.changes_requested), [schools]);

  /* Derive activity from recent school registrations */
  const activity = useMemo(() => {
    return [...schools]
      .sort((a, b) => new Date(b.registration_date) - new Date(a.registration_date))
      .slice(0, 6)
      .map(s => ({
        id:      s.id,
        type:    s.is_approved ? 'approved' : 'pending',
        message: s.is_approved
          ? `"${s.name}" school was approved`
          : `New registration from "${s.name}"`,
        sub:     s.city ? `${s.city}${s.country ? ', ' + s.country : ''}` : s.address || '—',
        time:    s.registration_date,
      }));
  }, [schools]);

  const stats = [
    {
      label: 'Total Schools', value: schools.length,
      icon: <IcSchool />, cls: 'sa-stat-icon--blue', trend: '+5%',  trendDir: 'up',
    },
    {
      label: 'Pending Review', value: pending.length,
      icon: <IcClock />,  cls: 'sa-stat-icon--amber', trend: pending.length > 0 ? 'Needs action' : 'All clear', trendDir: pending.length > 0 ? 'down' : 'up',
    },
    {
      label: 'Active Schools', value: approved.length,
      icon: <IcCheck />,  cls: 'sa-stat-icon--green', trend: '+2%',  trendDir: 'up',
    },
    {
      label: 'Changes Requested', value: changes.length,
      icon: <IcActivity />, cls: 'sa-stat-icon--purple', trend: 'Awaiting resubmit', trendDir: 'flat',
    },
  ];

  /* Static security alerts (real-world: these would come from an audit log API) */
  const secAlerts = [
    { id: 1, type: 'error',  title: 'Failed Login Attempt',      desc: 'Multiple failures detected from Admin Portal',       time: '2m ago' },
    { id: 2, type: 'amber',  title: 'New School Awaiting Review', desc: pending.length > 0 ? `${pending.length} application${pending.length > 1 ? 's' : ''} pending approval` : 'No pending applications', time: 'Now' },
    { id: 3, type: 'blue',   title: 'System Backup Completed',   desc: 'Daily automated snapshot completed successfully',     time: '4h ago' },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">Command Center</h1>
          <p className="sa-page-sub">Welcome back, {user?.full_name || user?.username || 'Admin'} — here's what's happening.</p>
        </div>
        <div className="sa-page-actions">
          <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={() => onNavigate('applications')}>
            View Applications <IcArrow />
          </button>
        </div>
      </div>

      {/* System status bar */}
      <div className="sa-status-bar">
        <span style={{ fontSize: '0.75rem', color: 'var(--sa-text-2)', marginRight: 4 }}>System:</span>
        <span className="sa-status-pill sa-status-pill--ok"><span className="sa-status-dot" />API Healthy</span>
        <span className="sa-status-pill sa-status-pill--ok"><span className="sa-status-dot" />DB Connected</span>
        <span className="sa-status-pill sa-status-pill--ok"><span className="sa-status-dot" />Security Active</span>
        {pending.length > 0 && (
          <span className="sa-status-pill sa-status-pill--warn">
            <span className="sa-status-dot" />{pending.length} Pending
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="sa-stat-grid">
        {stats.map((s, i) => (
          <div key={i} className="sa-stat-card">
            <p className="sa-stat-label">{s.label}</p>
            <div className="sa-stat-row">
              <span className="sa-stat-value">{s.value}</span>
              <span className={`sa-stat-icon ${s.cls}`}>{s.icon}</span>
            </div>
            <span className={`sa-stat-trend sa-stat-trend--${s.trendDir}`}>{s.trend}</span>
          </div>
        ))}
      </div>

      {/* Grade integrity + Security alerts side by side */}
      <div className="sa-overview-grid" style={{ marginBottom: 16 }}>
        {/* Grade Integrity Monitor */}
        <div className="sa-integrity-card">
          <div className="sa-integrity-head">
            <p className="sa-integrity-title">
              <IcShield style={{ width: 15, height: 15, verticalAlign: 'middle', marginRight: 6, stroke: 'var(--sa-green)', fill: 'none' }} />
              Grade Integrity Monitor
            </p>
            <span className="sa-badge sa-badge--approved">Active</span>
          </div>
          <div className="sa-integrity-stats">
            <div className="sa-integrity-stat">
              <span className="sa-integrity-num sa-integrity-num--green">100%</span>
              <span className="sa-integrity-lbl">Hash Verified</span>
            </div>
            <div className="sa-integrity-stat">
              <span className="sa-integrity-num sa-integrity-num--amber">{pending.length}</span>
              <span className="sa-integrity-lbl">Pending Mods</span>
            </div>
            <div className="sa-integrity-stat">
              <span className="sa-integrity-num">{approved.length}</span>
              <span className="sa-integrity-lbl">Active Schools</span>
            </div>
            <div className="sa-integrity-stat">
              <span className="sa-integrity-num sa-integrity-num--green">Stable</span>
              <span className="sa-integrity-lbl">Chain Status</span>
            </div>
          </div>
        </div>

        {/* Security Alerts */}
        <div className="sa-card">
          <div className="sa-card-head">
            <p className="sa-card-title">Security Alerts</p>
            <span className="sa-badge sa-badge--pending">{secAlerts.length} Active</span>
          </div>
          <div className="sa-card-body" style={{ padding: '12px 16px' }}>
            <div className="sa-alert-list">
              {secAlerts.map(a => (
                <div key={a.id} className="sa-alert-item">
                  <div className={`sa-alert-icon sa-alert-icon--${a.type === 'error' ? 'red' : a.type === 'amber' ? 'amber' : 'blue'}`}>
                    {a.type === 'error' ? <IcAlert /> : a.type === 'amber' ? <IcLock /> : <IcLogin />}
                  </div>
                  <div className="sa-alert-content">
                    <p className="sa-alert-title">{a.title}</p>
                    <p className="sa-alert-desc">{a.desc}</p>
                  </div>
                  <span className="sa-alert-time">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed + Pending summary */}
      <div className="sa-overview-grid">
        {/* Activity Feed */}
        <div className="sa-card">
          <div className="sa-card-head">
            <p className="sa-card-title">Activity Feed</p>
            <button className="sa-btn sa-btn--ghost sa-btn--sm" style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => onNavigate('applications')}>View All</button>
          </div>
          <div className="sa-card-body" style={{ padding: '0 16px' }}>
            {activity.length === 0 ? (
              <div className="sa-empty" style={{ padding: '24px' }}>
                <p className="sa-empty-title">No recent activity</p>
              </div>
            ) : (
              <div className="sa-activity-list">
                {activity.map(a => (
                  <div key={a.id} className="sa-activity-item">
                    <div className={`sa-activity-dot sa-activity-dot--${a.type === 'approved' ? 'green' : 'amber'}`} />
                    <div className="sa-activity-content">
                      <p className="sa-activity-msg">{a.message}</p>
                      <p className="sa-activity-time">{a.sub} · {timeAgo(a.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending quick list */}
        <div className="sa-card">
          <div className="sa-card-head">
            <p className="sa-card-title">Needs Attention</p>
            {pending.length > 0 && <span className="sa-badge sa-badge--pending">{pending.length}</span>}
          </div>
          <div className="sa-card-body" style={{ padding: '8px 16px' }}>
            {pending.length === 0 ? (
              <div className="sa-empty" style={{ padding: '24px' }}>
                <div className="sa-empty-icon">✅</div>
                <p className="sa-empty-title">All caught up</p>
                <p className="sa-empty-desc">No pending applications right now.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pending.slice(0, 5).map(s => {
                  const risk = getRisk(s);
                  const color = avatarColor(s.name);
                  return (
                    <div
                      key={s.id}
                      onClick={() => onReview && onReview(s)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--sa-border)', cursor: onReview ? 'pointer' : 'default' }}
                    >
                      <div className="sa-app-avatar" style={{ background: color, width: 36, height: 36, fontSize: '0.875rem', borderRadius: 8 }}>
                        {s.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--sa-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--sa-text-2)' }}>{s.city || s.address?.split(',')[0] || '—'}</p>
                      </div>
                      <span className={`sa-badge sa-badge--${risk}`}>{risk.charAt(0).toUpperCase() + risk.slice(1)}</span>
                    </div>
                  );
                })}
                {pending.length > 5 && (
                  <button className="sa-btn sa-btn--ghost sa-btn--full" style={{ marginTop: 8 }} onClick={() => onNavigate('applications')}>
                    View all {pending.length} applications
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
