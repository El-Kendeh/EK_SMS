import React, { useState, useEffect, useCallback } from 'react';
import './SAGradesAccumulation.css';

const API = (process.env.REACT_APP_NODE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const token = () => { try { return localStorage.getItem('token') || ''; } catch { return ''; } };

async function apiGet(path) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!r.ok) { let m = `HTTP ${r.status}`; try { const d = await r.json(); m = d.message || m; } catch {} throw new Error(m); }
  return r.json();
}

const IcLayers  = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IcCheck   = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcClock   = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcTrend   = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IcShield  = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcWarn    = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcRefresh = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;

const fmt = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString());

export default function SAGradesAccumulation({ onNavigate }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [sortKey, setSortKey] = useState('grades');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await apiGet('/api/grade-stats/');
      if (d.success) setStats(d);
      else setError(d.message || 'Failed to load grade statistics.');
    } catch (e) {
      setError(e.message || 'Could not reach server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const perSchool = (stats?.per_school || []).slice().sort((a, b) => {
    if (sortKey === 'avg') return (b.avg_total ?? -1) - (a.avg_total ?? -1);
    if (sortKey === 'pending') return b.pending - a.pending;
    return b.grades - a.grades;
  });
  const maxGrades = Math.max(1, ...perSchool.map(s => s.grades));

  const kpis = stats ? [
    { label: 'Total Grades Recorded', value: fmt(stats.total_grades),    icon: <IcLayers />, tone: 'blue'  },
    { label: 'Approved (Locked)',     value: fmt(stats.locked_grades),   icon: <IcCheck />,  tone: 'green' },
    { label: 'Pending Review',        value: fmt(stats.pending_reviews), icon: <IcClock />,  tone: 'amber' },
    { label: 'Platform Average',      value: stats.average_score != null ? `${stats.average_score}%` : '—', icon: <IcTrend />, tone: 'violet' },
    { label: 'Integrity Score',       value: `${stats.integrity_score}%`, icon: <IcShield />, tone: stats.integrity_score >= 90 ? 'green' : 'amber' },
    { label: 'Entries (30 days)',     value: fmt(stats.grade_events_30d), icon: <IcClock />,  tone: 'blue'  },
  ] : [];

  return (
    <div className="saga-wrap">
      <div className="saga-head">
        <div>
          <h1 className="saga-title">Grades Accumulation</h1>
          <p className="saga-sub">Platform-wide grade volume, approval pipeline and per-school accumulation.</p>
        </div>
        <button className="saga-btn" onClick={load} disabled={loading}>
          <IcRefresh /> Refresh
        </button>
      </div>

      {loading && (
        <div className="saga-state"><span className="saga-spinner" />Loading grade statistics…</div>
      )}
      {!loading && error && (
        <div className="saga-state saga-state--err"><IcWarn /><span>{error}</span></div>
      )}

      {!loading && !error && stats && (
        <>
          <div className="saga-kpis">
            {kpis.map(k => (
              <div key={k.label} className={`saga-kpi saga-kpi--${k.tone}`}>
                <span className="saga-kpi-icon">{k.icon}</span>
                <div>
                  <div className="saga-kpi-val">{k.value}</div>
                  <div className="saga-kpi-key">{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="saga-card">
            <div className="saga-card-head">
              <h2 className="saga-card-title">Accumulation by School</h2>
              <div className="saga-sorts">
                {[['grades', 'Volume'], ['avg', 'Average'], ['pending', 'Pending']].map(([key, label]) => (
                  <button
                    key={key}
                    className={`saga-sort-btn${sortKey === key ? ' active' : ''}`}
                    onClick={() => setSortKey(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {perSchool.length === 0 ? (
              <p className="saga-empty">
                No grades recorded anywhere yet. Once teachers start entering grades, every school's
                accumulation appears here automatically.
              </p>
            ) : (
              <div className="saga-rows">
                {perSchool.map(s => {
                  const pct = Math.round((s.grades / maxGrades) * 100);
                  const approvedPct = s.grades > 0 ? Math.round((s.approved / s.grades) * 100) : 0;
                  return (
                    <div key={s.school_id} className="saga-row">
                      <div className="saga-row-top">
                        <span className="saga-row-name">{s.school_name}</span>
                        <span className="saga-row-meta">
                          <strong>{fmt(s.grades)}</strong> grades
                          {s.avg_total != null && <> · avg <strong>{s.avg_total}%</strong></>}
                          {s.pending > 0 && <span className="saga-pending-pill">{fmt(s.pending)} pending</span>}
                        </span>
                      </div>
                      <div className="saga-bar-track" title={`${approvedPct}% approved`}>
                        <div className="saga-bar-fill" style={{ width: `${pct}%` }}>
                          <div className="saga-bar-approved" style={{ width: `${approvedPct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="saga-legend">
              <span><span className="saga-dot saga-dot--blue" /> Total recorded</span>
              <span><span className="saga-dot saga-dot--green" /> Approved share</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
