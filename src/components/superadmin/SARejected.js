import React, { useState, useMemo } from 'react';

/* ---- Icons ---- */
const IcSearch  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcPin     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcArchive = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
const IcRefresh = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;
const IcX       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
const IcTag     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;

/* ---- Helpers ---- */
const AVATAR_COLORS = ['#1B3FAF','#0EA5E9','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#6366F1'];
const avatarColor   = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TABS = [
  { key: 'all',        label: 'All Rejected'    },
  { key: 'fraud',      label: 'Fraud Risk'      },
  { key: 'incomplete', label: 'Incomplete Docs' },
  { key: 'policy',     label: 'Policy Violation'},
];

export default function SARejected({ schools, onAudit, onReconsider }) {
  const [search, setSearch] = useState('');
  const [tab,    setTab]    = useState('all');

  /* Rejected = not approved AND not active */
  const rejected = useMemo(() => schools.filter(s => !s.is_approved && !s.is_active), [schools]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    return rejected.filter(s => {
      const d = new Date(s.registration_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [rejected]);

  const filtered = useMemo(() => {
    let list = rejected;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.country?.toLowerCase().includes(q)
      );
    }
    if (tab === 'fraud')      list = list.filter(s => (s.rejection_reason || '').toLowerCase().includes('fraud'));
    if (tab === 'incomplete') list = list.filter(s => (s.rejection_reason || '').toLowerCase().includes('incomplete') || (s.rejection_reason || '').toLowerCase().includes('document'));
    if (tab === 'policy')     list = list.filter(s => (s.rejection_reason || '').toLowerCase().includes('policy'));
    return list;
  }, [rejected, search, tab]);

  const reasonCounts = {};
  rejected.forEach(s => { if (s.rejection_reason) reasonCounts[s.rejection_reason] = (reasonCounts[s.rejection_reason] || 0) + 1; });
  const topReason = Object.keys(reasonCounts).length > 0
    ? Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0][0]
    : '—';

  return (
    <div>
      {/* Header */}
      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">Rejected Applications</h1>
          <p className="sa-page-sub">Archived rejected school registration requests.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="sa-stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Rejected', value: rejected.length,  icon: <IcX />,       cls: 'sa-stat-icon--red' },
          { label: 'This Month',     value: thisMonth.length, icon: <IcArchive />, cls: 'sa-stat-icon--amber' },
          { label: 'Top Reason',     value: topReason,        icon: <IcTag />,     cls: 'sa-stat-icon--purple' },
        ].map((s, i) => (
          <div key={i} className="sa-stat-card">
            <p className="sa-stat-label">{s.label}</p>
            <div className="sa-stat-row">
              <span className="sa-stat-value" style={{ fontSize: i === 2 ? '0.875rem' : undefined, alignSelf: 'center' }}>
                {s.value}
              </span>
              <span className={`sa-stat-icon ${s.cls}`}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="sa-toolbar">
        <div className="sa-search-bar sa-toolbar-search">
          <IcSearch />
          <input
            className="sa-search-input"
            type="text"
            placeholder="Search rejected schools…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="sa-filter-tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`sa-filter-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Section label */}
      <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sa-text-2)', marginBottom: 14 }}>
        Rejected Archive — {filtered.length} record{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="sa-card">
          <div className="sa-empty">
            <div className="sa-empty-icon">🗃</div>
            <p className="sa-empty-title">
              {rejected.length === 0 ? 'No rejected applications' : 'No results found'}
            </p>
            <p className="sa-empty-desc">
              {rejected.length === 0
                ? 'Rejected applications will appear here once an application is declined.'
                : 'Try adjusting your filter or search query.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="sa-app-list">
          {filtered.map(school => {
            const reason = school.rejection_reason || '—';
            const color  = avatarColor(school.name);
            const loc    = [school.city, school.country].filter(Boolean).join(', ') || '—';
            return (
              <div key={school.id} className="sa-app-card sa-app-card--high">
                <div className="sa-app-card-top">
                  <div className="sa-app-avatar" style={{ background: color }}>
                    {school.name[0].toUpperCase()}
                  </div>
                  <div className="sa-app-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <p className="sa-app-school-name">{school.name}</p>
                      <span className="sa-badge sa-badge--rejected">Rejected</span>
                      <span className="sa-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--sa-text-3)', border: '1px solid var(--sa-border)', fontSize: '0.6rem', letterSpacing: '0.06em' }}>
                        Archived
                      </span>
                    </div>
                    <p className="sa-app-location"><IcPin /> {loc}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--sa-red)', fontWeight: 600 }}>
                      Reason: {reason}
                    </p>
                  </div>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--sa-text-2)', marginBottom: 14 }}>
                  Submitted {fmtDate(school.registration_date)}
                </p>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="sa-btn sa-btn--ghost sa-btn--full"
                    onClick={() => onAudit && onAudit(school)}
                  >
                    <IcArchive /> Audit Log
                  </button>
                  <button
                    className="sa-btn sa-btn--primary sa-btn--full"
                    onClick={() => onReconsider && onReconsider(school)}
                  >
                    <IcRefresh /> Reconsider
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
