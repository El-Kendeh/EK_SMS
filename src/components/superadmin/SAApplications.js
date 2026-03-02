import React, { useState, useMemo } from 'react';

/* ---- Icons ---- */
const IcSearch   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcPin      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcUser     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcCalendar = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcArrowR   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IcClock    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>;
const IcCheck    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcX        = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;

/* ---- Helpers ---- */
const AVATAR_COLORS = ['#1B3FAF','#0EA5E9','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#6366F1'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function getRisk(school) {
  const hasCity    = !!(school.city || school.country);
  const hasContact = !!(school.phone && school.email);
  const hasAdmin   = !!(school.principal_name);
  const score      = [hasCity, hasContact, hasAdmin].filter(Boolean).length;
  if (score === 3) return 'low';
  if (score === 2) return 'medium';
  return 'high';
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 2)   return 'Just now';
  if (mins < 60)  return `${mins} min ago`;
  if (hrs  < 24)  return `${hrs}h ago`;
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SAApplications({ schools, onReview }) {
  const [search,     setSearch]     = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  /* Split pending vs approved vs rejected */
  const pending  = useMemo(() => schools.filter(s => !s.is_approved), [schools]);
  const approved = useMemo(() => schools.filter(s => s.is_approved),  [schools]);

  /* Avg review time — mock for now */
  const avgReview = '3h 20m';

  const stats = [
    { label: 'Pending',    value: pending.length,  icon: <IcClock />,    cls: 'sa-stat-icon--amber',  trend: { dir: pending.length > 0 ? 'up' : 'flat',    label: pending.length > 0 ? `${pending.length} awaiting` : 'All caught up' } },
    { label: 'Approved',   value: approved.length, icon: <IcCheck />,    cls: 'sa-stat-icon--green',  trend: { dir: approved.length > 0 ? 'up' : 'flat',   label: approved.length > 0 ? `+${approved.length} total` : 'None yet' } },
    { label: 'Rejected',   value: 0,               icon: <IcX />,        cls: 'sa-stat-icon--red',    trend: { dir: 'flat', label: 'No change' } },
    { label: 'Avg Review', value: avgReview,        icon: <IcCalendar />, cls: 'sa-stat-icon--blue',   trend: { dir: 'down', label: '−10m faster' } },
  ];

  const filtered = useMemo(() => {
    let list = pending;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.country?.toLowerCase().includes(q) ||
        s.principal_name?.toLowerCase().includes(q) ||
        s.admin_full_name?.toLowerCase().includes(q)
      );
    }
    if (riskFilter !== 'all') {
      list = list.filter(s => getRisk(s) === riskFilter);
    }
    return list;
  }, [pending, search, riskFilter]);

  const RISK_TABS = [
    { key: 'all',    label: 'All Requests' },
    { key: 'high',   label: 'High Risk'    },
    { key: 'medium', label: 'Medium Risk'  },
    { key: 'low',    label: 'Low Risk'     },
  ];

  return (
    <div>
      {/* Header */}
      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">School Applications</h1>
          <p className="sa-page-sub">Review and approve pending school registration requests.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="sa-stat-grid" style={{ marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div key={i} className="sa-stat-card">
            <p className="sa-stat-label">{s.label}</p>
            <div className="sa-stat-row">
              <span className="sa-stat-value">{s.value}</span>
              <span className={`sa-stat-icon ${s.cls}`}>{s.icon}</span>
            </div>
            {s.trend && (
              <span className={`sa-stat-trend sa-stat-trend--${s.trend.dir}`}>
                {s.trend.dir === 'up' ? '↑' : s.trend.dir === 'down' ? '↓' : '·'} {s.trend.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="sa-toolbar">
        <div className="sa-search-bar sa-toolbar-search">
          <IcSearch />
          <input
            className="sa-search-input"
            type="text"
            placeholder="Search schools, cities or admins…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Risk filter tabs */}
      <div className="sa-filter-tabs" style={{ marginBottom: 20 }}>
        {RISK_TABS.map(t => (
          <button
            key={t.key}
            className={`sa-filter-tab${riskFilter === t.key ? ' active' : ''}`}
            onClick={() => setRiskFilter(t.key)}
          >
            {t.key !== 'all' && <span className="sa-status-dot" style={{ color: t.key === 'high' ? 'var(--sa-red)' : t.key === 'medium' ? 'var(--sa-amber)' : 'var(--sa-green)', background: t.key === 'high' ? 'var(--sa-red)' : t.key === 'medium' ? 'var(--sa-amber)' : 'var(--sa-green)' }} />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Section label */}
      <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sa-text-2)', marginBottom: 14 }}>
        Recent Applications — {filtered.length} result{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Application cards */}
      {filtered.length === 0 ? (
        <div className="sa-card">
          <div className="sa-empty">
            <div className="sa-empty-icon">📋</div>
            <p className="sa-empty-title">{search || riskFilter !== 'all' ? 'No results found' : 'No pending applications'}</p>
            <p className="sa-empty-desc">
              {search ? `No schools matching "${search}"` : riskFilter !== 'all' ? `No ${riskFilter}-risk applications` : 'All caught up — nothing to review right now.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="sa-app-list">
          {filtered.map(school => {
            const risk     = getRisk(school);
            const color    = avatarColor(school.name);
            const adminName = school.admin_full_name || school.principal_name || '—';
            const adminEmail = school.admin_email || school.email || '—';
            const location = [school.city, school.country].filter(Boolean).join(', ') || school.address?.split(',').slice(0,2).join(', ') || '—';
            const isHighRisk = risk === 'high';

            return (
              <div key={school.id} className={`sa-app-card sa-app-card--${risk}`}>
                <div className="sa-app-card-top">
                  <div className="sa-app-avatar" style={{ background: color }}>
                    {school.name[0].toUpperCase()}
                  </div>
                  <div className="sa-app-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <p className="sa-app-school-name">{school.name}</p>
                      <span className={`sa-badge sa-badge--${risk}`}>
                        {risk.charAt(0).toUpperCase() + risk.slice(1)} Risk
                      </span>
                      {school.changes_requested && (
                        <span className="sa-badge sa-badge--changes">Changes Requested</span>
                      )}
                    </div>
                    <p className="sa-app-location">
                      <IcPin /> {location}
                    </p>
                  </div>
                </div>

                <div className="sa-app-meta-row">
                  <div>
                    <p className="sa-app-meta-key">Admin</p>
                    <p className="sa-app-meta-val">
                      <IcUser style={{ width: 11, height: 11, verticalAlign: 'middle', marginRight: 3, stroke: 'var(--sa-text-2)', fill: 'none' }} />
                      {adminName}
                    </p>
                  </div>
                  <div>
                    <p className="sa-app-meta-key">Submitted</p>
                    <p className="sa-app-meta-val">
                      <IcCalendar style={{ width: 11, height: 11, verticalAlign: 'middle', marginRight: 3, stroke: 'var(--sa-text-2)', fill: 'none' }} />
                      {timeAgo(school.registration_date)}
                    </p>
                  </div>
                  <div>
                    <p className="sa-app-meta-key">Email</p>
                    <p className="sa-app-meta-val" style={{ fontSize: '0.75rem' }}>{adminEmail}</p>
                  </div>
                  <div>
                    <p className="sa-app-meta-key">Date</p>
                    <p className="sa-app-meta-val">{fmtDate(school.registration_date)}</p>
                  </div>
                </div>

                <button
                  className={`sa-btn sa-btn--full${isHighRisk ? ' sa-btn--primary' : ' sa-btn--ghost'}`}
                  onClick={() => onReview(school)}
                >
                  Review Application <IcArrowR />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
