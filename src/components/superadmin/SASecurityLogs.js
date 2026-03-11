import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SECURITY_CONFIG } from '../../config/security';

const API = SECURITY_CONFIG.API_URL;

/* ---- Icons ---- */
const IcSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const IcShield = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const IcAlert = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
const IcUser = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const IcLock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>;
const IcArrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;

const SEVERITY_CFG = {
  critical: { label: 'Critical', color: 'var(--sa-red)', bg: 'var(--sa-red-dim)' },
  high: { label: 'High', color: 'var(--sa-amber)', bg: 'var(--sa-amber-dim)' },
  medium: { label: 'Medium', color: 'var(--sa-accent)', bg: 'var(--sa-accent-dim)' },
  low: { label: 'Low', color: 'var(--sa-purple)', bg: 'var(--sa-purple-dim)' },
  info: { label: 'Info', color: 'var(--sa-green)', bg: 'var(--sa-green-dim)' },
};

/* 24-hour activity (events per hour, 0–23) */
const ACTIVITY_BARS = [4, 7, 2, 1, 3, 8, 12, 9, 5, 3, 6, 15, 11, 8, 4, 3, 7, 20, 18, 14, 9, 6, 3, 2];

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function SASecurityLogs({ onForensic }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/security-logs/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch security logs', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    logs.forEach(e => { if (c[e.severity] !== undefined) c[e.severity]++; });
    return c;
  }, [logs]);

  const filtered = useMemo(() => {
    let list = logs;
    if (sevFilter !== 'all') list = list.filter(e => e.severity === sevFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.type.toLowerCase().includes(q) ||
        (e.actor && e.actor.toLowerCase().includes(q)) ||
        (e.ip && e.ip.includes(q)) ||
        (e.action && e.action.toLowerCase().includes(q))
      );
    }
    return list;
  }, [logs, sevFilter, search]);

  const stats = [
    { label: 'Threats Blocked', value: 4, icon: <IcShield />, cls: 'sa-stat-icon--red', trend: { dir: 'up', label: '+2 today' } },
    { label: 'Active Sessions', value: 127, icon: <IcUser />, cls: 'sa-stat-icon--green', trend: { dir: 'flat', label: 'Stable' } },
    { label: 'Failed Logins', value: 38, icon: <IcLock />, cls: 'sa-stat-icon--amber', trend: { dir: 'up', label: '+12 today' } },
    { label: 'Flagged IPs', value: 7, icon: <IcAlert />, cls: 'sa-stat-icon--blue', trend: { dir: 'up', label: '3 critical' } },
  ];

  const SEV_TABS = [
    { key: 'all', label: 'All Events', count: logs.length },
    { key: 'critical', label: 'Critical', count: counts.critical },
    { key: 'high', label: 'High', count: counts.high },
    { key: 'medium', label: 'Medium', count: counts.medium },
    { key: 'low', label: 'Low', count: counts.low },
  ];

  const maxBar = Math.max(...ACTIVITY_BARS);

  return (
    <div>
      {/* Header */}
      <div className="sa-page-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="sa-page-title">Security &amp; Audit Logs</h1>
          <p className="sa-page-sub">Real-time monitoring of suspicious activities, attacks, and tampering attempts.</p>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--sa-green-dim)', color: 'var(--sa-green)',
          border: '1px solid rgba(16,185,129,0.25)', borderRadius: 20,
          padding: '5px 14px', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
        }}>
          <span className="sa-live-dot" /> Live Monitoring
        </span>
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
            <span className={`sa-stat-trend sa-stat-trend--${s.trend.dir}`}>
              {s.trend.dir === 'up' ? '↑' : s.trend.dir === 'down' ? '↓' : '·'} {s.trend.label}
            </span>
          </div>
        ))}
      </div>

      {/* 24-Hour Activity Chart */}
      <div className="sa-card" style={{ marginBottom: 20 }}>
        <div className="sa-card-head">
          <p className="sa-card-title">24-Hour Activity</p>
          <span style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>Events per hour</span>
        </div>
        <div className="sa-card-body">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 64, padding: '0 2px' }}>
            {ACTIVITY_BARS.map((val, i) => {
              const pct = (val / maxBar) * 100;
              const isHigh = val >= 15;
              const isMed = val >= 8 && !isHigh;
              const col = isHigh ? 'var(--sa-red)' : isMed ? 'var(--sa-amber)' : 'var(--sa-accent)';
              return (
                <div
                  key={i}
                  title={`${String(i).padStart(2, '0')}:00 — ${val} events`}
                  style={{
                    flex: 1, height: `${Math.max(pct, 5)}%`,
                    background: col, opacity: 0.8, borderRadius: '3px 3px 0 0',
                    cursor: 'default', minWidth: 0,
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.625rem', color: 'var(--sa-text-3)' }}>
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="sa-toolbar" style={{ marginBottom: 12 }}>
        <div className="sa-search-bar sa-toolbar-search">
          <IcSearch />
          <input
            className="sa-search-input"
            type="text"
            placeholder="Search events, actors, IPs…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Severity filter tabs */}
      <div className="sa-filter-tabs" style={{ marginBottom: 16, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
        {SEV_TABS.map(t => {
          const cfg = SEVERITY_CFG[t.key];
          return (
            <button
              key={t.key}
              className={`sa-filter-tab${sevFilter === t.key ? ' active' : ''}`}
              onClick={() => setSevFilter(t.key)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {cfg && (
                <span className="sa-status-dot" style={{ background: cfg.color, color: cfg.color }} />
              )}
              {t.label}
              <span style={{
                marginLeft: 5, fontSize: '0.625rem', fontWeight: 700,
                background: sevFilter === t.key ? 'rgba(255,255,255,0.15)' : 'var(--sa-border)',
                borderRadius: 10, padding: '1px 7px',
              }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* Events table */}
      <div className="sa-card">
        <div className="sa-card-head">
          <p className="sa-card-title">
            Event Log &mdash; <span style={{ color: 'var(--sa-text-2)', fontWeight: 500 }}>{filtered.length} events</span>
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="sa-sec-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event Type</th>
                <th>Severity</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Source IP</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ev => {
                const cfg = SEVERITY_CFG[ev.severity];
                const statusColor =
                  ev.status === 'Blocked' ? 'var(--sa-red)' :
                    ev.status === 'Flagged' ? 'var(--sa-amber)' :
                      ev.status === 'Allowed' ? 'var(--sa-green)' :
                        ev.status === 'Throttled' ? 'var(--sa-purple)' : 'var(--sa-text-2)';
                const isCritical = ev.severity === 'critical';
                return (
                  <tr key={ev.id} style={{ cursor: 'pointer' }} onClick={() => onForensic && onForensic(ev)}>
                    <td style={{ fontFamily: 'Consolas, monospace', fontSize: '0.75rem', color: 'var(--sa-text-2)', whiteSpace: 'nowrap' }}>
                      {fmtTime(ev.ts)}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{ev.type}</td>
                    <td>
                      <span className={isCritical ? 'sa-sec-badge sa-sec-badge--glow' : 'sa-sec-badge'} style={{
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33`,
                      }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', whiteSpace: 'nowrap' }}>{ev.action}</td>
                    <td style={{ fontFamily: 'Consolas, monospace', fontSize: '0.75rem', color: 'var(--sa-text)', whiteSpace: 'nowrap' }}>{ev.actor}</td>
                    <td style={{ fontFamily: 'Consolas, monospace', fontSize: '0.75rem', color: isCritical || ev.severity === 'high' ? 'var(--sa-red)' : 'var(--sa-text-2)', whiteSpace: 'nowrap' }}>
                      {ev.ip}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ color: statusColor, fontSize: '0.6875rem', fontWeight: 700 }}>{ev.status}</span>
                    </td>
                    <td>
                      <button
                        className="sa-btn sa-btn--ghost sa-btn--sm"
                        style={{ padding: '3px 8px' }}
                        onClick={e => { e.stopPropagation(); onForensic && onForensic(ev); }}
                        title="Open forensic detail"
                      >
                        <IcArrow />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="sa-empty">
              <div className="sa-empty-icon">🔍</div>
              <p className="sa-empty-title">No events found</p>
              <p className="sa-empty-desc">Try adjusting your search or severity filter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
