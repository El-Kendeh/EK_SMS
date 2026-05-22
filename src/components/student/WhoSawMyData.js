import { useEffect, useState, useMemo } from 'react';
import { studentApi } from '../../api/studentApi';
import { Skeleton } from '../common/Skeleton';
import ErrorBoundary from '../common/ErrorBoundary';
import './WhoSawMyData.css';

const ROLE_BADGES = {
  parent:    { label: 'Parent',    icon: 'family_restroom', tone: 'parent' },
  teacher:   { label: 'Teacher',   icon: 'person',          tone: 'teacher' },
  admin:     { label: 'Admin',     icon: 'admin_panel_settings', tone: 'admin' },
  registrar: { label: 'Registrar', icon: 'badge',           tone: 'admin' },
  system:    { label: 'System',    icon: 'memory',          tone: 'system' },
};

function pickRoleBadge(role = '') {
  const r = role.toLowerCase();
  if (r.includes('parent') || r.includes('guardian')) return ROLE_BADGES.parent;
  if (r.includes('teacher')) return ROLE_BADGES.teacher;
  if (r.includes('registrar')) return ROLE_BADGES.registrar;
  if (r.includes('admin')) return ROLE_BADGES.admin;
  return ROLE_BADGES.system;
}

function formatTime(iso) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function WhoSawMyDataInner({ compact = false }) {
  const [entries, setEntries] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    studentApi.getWhoSawMyData()
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load access log.'));
  }, []);

  const filtered = useMemo(() => {
    if (!entries) return [];
    if (filter === 'all') return entries;
    return entries.filter((e) => pickRoleBadge(e.role).tone === filter);
  }, [entries, filter]);

  const tabs = [
    { id: 'all',      label: 'All' },
    { id: 'parent',   label: 'Family' },
    { id: 'teacher',  label: 'Teachers' },
    { id: 'admin',    label: 'Admin' },
  ];

  return (
    <div className={`who-saw ${compact ? 'who-saw--compact' : ''}`}>
      <header className="who-saw__head">
        <div>
          <h3>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>visibility</span>
            Who's seen my data
          </h3>
          <p>Every guardian view, teacher edit, and admin action — visible to you, in chronological order.</p>
        </div>
        <nav className="who-saw__tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={filter === t.id}
              className={`who-saw__tab ${filter === t.id ? 'is-active' : ''}`}
              onClick={() => setFilter(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {!entries && !error && (
        <div className="who-saw__list">
          {[0, 1, 2].map((i) => (
            <div className="who-saw__row" key={i}>
              <Skeleton width={42} height={42} radius={11} />
              <div style={{ flex: 1 }}>
                <Skeleton width="40%" height={14} />
                <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="who-saw__error">{error}</p>}

      {entries && filtered.length === 0 && (
        <p className="who-saw__empty">No access events for this filter.</p>
      )}

      {entries && filtered.length > 0 && (
        <ul className="who-saw__list">
          {filtered.map((e, i) => {
            const badge = pickRoleBadge(e.role);
            return (
              <li key={`${e.actor}-${i}`} className={`who-saw__row who-saw__row--${badge.tone}`}>
                <div className="who-saw__avatar" aria-hidden="true">
                  <span className="material-symbols-outlined">{badge.icon}</span>
                </div>
                <div className="who-saw__body">
                  <div className="who-saw__top">
                    <strong>{e.actor}</strong>
                    <span className={`who-saw__badge who-saw__badge--${badge.tone}`}>{badge.label}</span>
                  </div>
                  <div className="who-saw__meta">
                    <span>{e.section}</span>
                    <span className="dot" aria-hidden="true">·</span>
                    <span>{e.device}</span>
                    {e.location && <><span className="dot" aria-hidden="true">·</span><span>{e.location}</span></>}
                  </div>
                </div>
                <div className="who-saw__time" title={new Date(e.accessedAt).toLocaleString()}>
                  {formatTime(e.accessedAt)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function WhoSawMyData(props) {
  return (
    <ErrorBoundary>
      <WhoSawMyDataInner {...props} />
    </ErrorBoundary>
  );
}
