import React, { useState } from 'react';

/* ---- Icons ---- */
const IcExport  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IcEdit    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>;
const IcShield  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcClock   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcAlert   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcCheck   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcArrow   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

/* ---- Chart data: events per day for 30 days ---- */
const CHART_30D = [3,5,4,7,9,6,8,5,3,4,7,11,9,6,4,3,5,7,10,14,20,16,11,8,5,3,6,9,7,4];
const CHART_90D = [2,3,4,3,5,4,6,5,4,3,4,7,9,6,4,3,5,7,10,14,20,16,11,8,5,3,6,9,7,4,3,5,4,7,9,6,8,5,3,4,7,11,9,6,4,3,5,7,10,14,20,16,11,8,5,3,6,9,7,4,3,5,4,7,9,6,8,5,3,4,7,11,9,6,4,3,5,7,10,14,20,16,11,8,5,3,6,9,7,4];

/* ---- Schools at risk (most overrides) ---- */
const TOP_SCHOOLS = [
  { name: 'MAB Secondary',   count: 42, pct: 85, color: 'var(--sa-red)'    },
  { name: 'AIC Grammar',     count: 28, pct: 58, color: 'var(--sa-amber)'  },
  { name: 'Fourah Bay Sec.', count: 19, pct: 40, color: 'var(--sa-accent)' },
  { name: 'UMU School',      count: 12, pct: 25, color: 'var(--sa-purple)' },
];

/* ---- Reasons breakdown (for donut) ---- */
const REASONS = [
  { label: 'Data Entry Error',  pct: 45, color: 'var(--sa-accent)' },
  { label: 'Policy Exception',  pct: 25, color: 'var(--sa-red)'    },
  { label: 'Re-grading Appeal', pct: 30, color: 'var(--sa-amber)'  },
];

/* ---- Recent audit log rows ---- */
const RECENT_LOGS = [
  { id: 'REQ-2026-001', time: '14:30', date: 'Feb 28', school: 'MAB Secondary', subject: 'Mathematics', oldGrade: 'B+', newGrade: 'A-', actor: 'Mr. A. Jalloh', status: 'Verified',  isFlag: false },
  { id: 'REQ-2026-002', time: '11:15', date: 'Feb 28', school: 'AIC Grammar',   subject: 'Physics 101', oldGrade: 'C',  newGrade: 'B',  actor: 'Mrs. Robinson', status: 'Pending',  isFlag: false },
  { id: 'REQ-2026-003', time: '08:50', date: 'Feb 27', school: 'UMU School',    subject: 'Biology AP',  oldGrade: 'F',  newGrade: 'A',  actor: 'Mr. S. Kamara', status: 'Flagged',  isFlag: true  },
  { id: 'REQ-2026-004', time: '16:22', date: 'Feb 26', school: 'MAB Secondary', subject: 'English Lit', oldGrade: 'B',  newGrade: 'B+', actor: 'Ms. Williams',  status: 'Approved', isFlag: false },
  { id: 'REQ-2026-005', time: '09:42', date: 'Feb 28', school: 'AIC Grammar',   subject: 'Chemistry',   oldGrade: 'A-', newGrade: 'A+', actor: 'Dr. Mansaray',  status: 'Pending',  isFlag: false },
];

/* ---- Build SVG path from data array ---- */
function buildAreaPath(data) {
  const W = 400, H = 140;
  const max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (v / max) * (H - 10);
    return [x, y];
  });
  // Smooth curve via cardinal spline approximation
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cx = (pts[i][0] + pts[i + 1][0]) / 2;
    d += ` Q${cx},${pts[i][1]} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  const area = d + ` V${H} H0 Z`;
  return { line: d, area };
}

/* ---- Status badge colour helper ---- */
function statusStyle(s) {
  if (s === 'Verified' || s === 'Approved') return { color: 'var(--sa-green)',  bg: 'var(--sa-green-dim)'  };
  if (s === 'Flagged')                       return { color: 'var(--sa-red)',    bg: 'var(--sa-red-dim)'    };
  return                                            { color: 'var(--sa-amber)',  bg: 'var(--sa-amber-dim)'  };
}

/* ============================================================
   Main Component
   ============================================================ */
export default function SAGradeReport({ onViewRequests, onViewDetail }) {
  const [period, setPeriod] = useState('30D');
  const chartData = period === '30D' ? CHART_30D : CHART_90D;
  const { line, area } = buildAreaPath(chartData);

  const stats = [
    { label: 'Manual Modifications', value: '142', icon: <IcEdit />,   iconCls: 'sa-stat-icon--amber', trend: { dir: 'up',   label: '+5% this term'  } },
    { label: 'Hash-Verified',         value: '100%', icon: <IcShield />, iconCls: 'sa-stat-icon--green', trend: { dir: 'flat', label: 'All records clean' } },
    { label: 'Pending Requests',      value: '12',   icon: <IcClock />,  iconCls: 'sa-stat-icon--blue',  trend: { dir: 'down', label: '−2% from last week' } },
    { label: 'Anomalous Alerts',      value: '3',    icon: <IcAlert />,  iconCls: 'sa-stat-icon--red',   trend: { dir: 'up',   label: '+1 new today',   isAlert: true } },
  ];

  /* Donut gradient string */
  const donutGrad = `conic-gradient(var(--sa-accent) 0% 45%, var(--sa-red) 45% 70%, var(--sa-amber) 70% 100%)`;

  return (
    <div>

      {/* ── Page Header ── */}
      <div className="sa-page-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="sa-page-title">Grade Integrity Deep Dive</h1>
          <p className="sa-page-sub">Investigate suspicious grade changes, audit modification requests, and track tampering attempts.</p>
        </div>
        <button
          className="sa-btn sa-btn--primary"
          style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}
          aria-label="Export audit report"
        >
          <span style={{ width: 16, height: 16, display: 'flex' }}><IcExport /></span>
          <span>Export Audit</span>
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="sa-stat-grid" style={{ marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div
            key={i}
            className="sa-stat-card"
            style={s.trend.isAlert ? { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' } : {}}
          >
            <p className="sa-stat-label" style={s.trend.isAlert ? { color: 'var(--sa-red)' } : {}}>{s.label}</p>
            <div className="sa-stat-row">
              <span className="sa-stat-value">{s.value}</span>
              <span className={`sa-stat-icon ${s.iconCls}`}>{s.icon}</span>
            </div>
            <span className={`sa-stat-trend sa-stat-trend--${s.trend.dir}`} style={s.trend.isAlert ? { color: 'var(--sa-red)' } : {}}>
              {s.trend.dir === 'up' ? '↑' : s.trend.dir === 'down' ? '↓' : '·'} {s.trend.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Modification Frequency Chart ── */}
      <div className="sa-card" style={{ marginBottom: 20 }}>
        <div className="sa-card-head">
          <div>
            <p className="sa-card-title">Modification Frequency</p>
            <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>
              Active Term — {period === '30D' ? 'Last 30 days' : 'Last 90 days'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--sa-card-bg)', borderRadius: 8, padding: 3 }}>
            {['30D', '90D'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: '0.6875rem', fontWeight: 700,
                  background: period === p ? 'var(--sa-accent)' : 'transparent',
                  color: period === p ? '#fff' : 'var(--sa-text-2)',
                  transition: 'all 150ms',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="sa-card-body">
          {/* SVG area chart */}
          <div style={{ position: 'relative', height: 160, width: '100%', overflow: 'hidden' }}>
            {/* Grid lines */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', width: '100%' }} />
              ))}
            </div>
            <svg
              viewBox="0 0 400 140"
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%' }}
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="giChartGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--sa-accent)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--sa-accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Anomaly spike marker at ~day 20 */}
              <line
                x1={(20 / (chartData.length - 1)) * 400}
                y1="0"
                x2={(20 / (chartData.length - 1)) * 400}
                y2="140"
                stroke="rgba(239,68,68,0.25)"
                strokeDasharray="4 3"
                strokeWidth="1.5"
              />
              {/* Area fill */}
              <path d={area} fill="url(#giChartGrad)" />
              {/* Line */}
              <path d={line} fill="none" stroke="var(--sa-accent)" strokeWidth="2.5" strokeLinecap="round" />
              {/* Peak dot */}
              <circle
                cx={(20 / (chartData.length - 1)) * 400}
                cy={140 - (chartData[20] / Math.max(...chartData)) * 130}
                r="5"
                fill="var(--sa-red)"
                stroke="var(--sa-card-bg)"
                strokeWidth="2"
              />
            </svg>
          </div>
          {/* X-axis labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.625rem', color: 'var(--sa-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            <span>Week 1</span>
            <span>Week 2</span>
            <span style={{ color: 'var(--sa-amber)' }}>Mid-Term</span>
            <span style={{ color: 'var(--sa-red)', fontWeight: 800 }}>Exam Period</span>
            <span>Finals</span>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>
              <div style={{ width: 20, height: 3, background: 'var(--sa-accent)', borderRadius: 2 }} /> Modifications
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sa-red)' }} /> Anomaly Spike
            </div>
          </div>
        </div>
      </div>

      {/* ── Risk Analysis: 2-column grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }} className="sa-gi-risk-grid">

        {/* Schools at Risk */}
        <div className="sa-card">
          <div className="sa-card-head">
            <p className="sa-card-title">Top Schools — Manual Overrides</p>
          </div>
          <div className="sa-card-body">
            {TOP_SCHOOLS.map((s, i) => (
              <div key={i} className="sa-gi-bar-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)' }}>{s.name}</span>
                  <span style={{ fontFamily: 'Consolas, monospace', fontSize: '0.8125rem', fontWeight: 700, color: s.color }}>{s.count}</span>
                </div>
                <div className="sa-progress-track">
                  <div className="sa-progress-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modification Reasons Donut */}
        <div className="sa-card">
          <div className="sa-card-head">
            <p className="sa-card-title">Modification Reasons</p>
          </div>
          <div className="sa-card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Donut */}
              <div className="sa-gi-donut" style={{ background: donutGrad }} aria-hidden="true">
                <div className="sa-gi-donut-inner">
                  <span style={{ fontSize: '0.625rem', color: 'var(--sa-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--sa-text)' }}>142</span>
                </div>
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {REASONS.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--sa-text-2)', flex: 1 }}>{r.label}</span>
                    <span style={{ fontWeight: 700, color: 'var(--sa-text)' }}>{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Audit Logs ── */}
      <div className="sa-card">
        <div className="sa-card-head">
          <p className="sa-card-title">Recent Audit Logs</p>
          <button
            className="sa-btn sa-btn--ghost sa-btn--sm"
            onClick={onViewRequests}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            View All <span style={{ width: 14, height: 14, display: 'flex' }}><IcArrow /></span>
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="sa-sec-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>School &amp; Subject</th>
                <th>Change</th>
                <th>Performed By</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_LOGS.map(log => {
                const st = statusStyle(log.status);
                return (
                  <tr
                    key={log.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewDetail && onViewDetail(log)}
                  >
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: 'var(--sa-text)', fontSize: '0.8125rem' }}>{log.time}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>{log.date}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: 'var(--sa-text)', fontSize: '0.8125rem' }}>{log.school}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>{log.subject}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                        <span className="sa-gi-grade-chip sa-gi-grade-chip--old">{log.oldGrade}</span>
                        <span style={{ fontSize: '0.625rem', color: 'var(--sa-text-3)' }}>→</span>
                        <span className={`sa-gi-grade-chip ${log.isFlag ? 'sa-gi-grade-chip--flagged' : 'sa-gi-grade-chip--new'}`}>{log.newGrade}</span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div className="sa-gi-avatar">{log.actor.charAt(0)}</div>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)' }}>{log.actor}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 20, fontSize: '0.6875rem', fontWeight: 700,
                        background: st.bg, color: st.color,
                        border: `1px solid ${st.color}33`,
                      }}>
                        {log.status === 'Verified' || log.status === 'Approved'
                          ? <span style={{ width: 12, height: 12, display: 'flex' }}><IcCheck /></span>
                          : null
                        }
                        {log.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
