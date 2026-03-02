import React, { useState } from 'react';

/* ── Icons ──────────────────────────────────────────────────── */
const IcChevDown = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IcTrend    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IcTrendDn  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>;
const IcMinus    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>;

/* ── Mock Data ──────────────────────────────────────────────── */
const PASS_RATE  = [76, 78, 79, 81, 80, 82, 81.8, 82.4];
const GPA_DATA   = [2.7, 2.8, 2.9, 2.95, 3.0, 3.05, 3.1, 3.1];
const ATTEND     = [88, 90, 91, 92, 93, 93.5, 94, 94];
const IMPROVEMENT= [0.8, 1.0, 1.2, 1.5, 1.7, 1.9, 2.0, 2.1];

const TREND_PRIVATE = [58, 64, 70, 74, 78, 81, 83, 84.5];
const TREND_PUBLIC  = [50, 56, 62, 66, 70, 73, 77, 80];
const Q_LABELS      = ['Q1','Q2','Q3','Q4'];

const GRADE_DIST = [
  { label: 'A', value: 28, color: '#10B981' },
  { label: 'B', value: 35, color: '#0EA5E9' },
  { label: 'C', value: 22, color: '#F59E0B' },
  { label: 'D', value: 10, color: '#8B5CF6' },
  { label: 'F', value:  5, color: '#EF4444' },
];

const TOP_SCHOOLS = [
  { rank: 1, name: 'St. Marks Academy',  integrity: 98.5, perf: 9.4, trend: 'up'     },
  { rank: 2, name: 'Northwood High',     integrity: 97.2, perf: 9.1, trend: 'up'     },
  { rank: 3, name: 'Riverdale Public',   integrity: 89.4, perf: 8.8, trend: 'stable' },
  { rank: 4, name: 'Tech Institute',     integrity: 94.1, perf: 8.5, trend: 'up'     },
  { rank: 5, name: 'Central Academy',    integrity: 91.8, perf: 8.2, trend: 'down'   },
];

/* ── Sparkline ──────────────────────────────────────────────── */
function Sparkline({ data, color = 'var(--sa-accent)', h = 28 }) {
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 80},${h - 2 - ((v - min) / rng) * (h - 4)}`).join(' ');
  return (
    <svg viewBox={`0 0 80 ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── SVG Line Chart ─────────────────────────────────────────── */
function LineChart({ series, xLabels, height = 130 }) {
  const W = 300, H = height, PAD = 8;
  const allVals = series.flatMap(s => s.data);
  const max = Math.max(...allVals), min = Math.min(...allVals), rng = max - min || 1;

  const toXY = (data, i) => [
    (i / (data.length - 1)) * (W - PAD * 2) + PAD,
    PAD + (1 - (data[i] - min) / rng) * (H - PAD * 2),
  ];

  return (
    <div className="san-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H }}>
        <defs>
          {series.map(s => (
            <linearGradient key={`g-${s.id}`} id={`g-${s.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={s.color} stopOpacity="0.28"/>
              <stop offset="100%" stopColor={s.color} stopOpacity="0"/>
            </linearGradient>
          ))}
        </defs>
        {/* Grid */}
        {[0, 0.33, 0.67, 1].map((t, i) => (
          <line key={i} x1={PAD} y1={PAD + t * (H - PAD * 2)} x2={W - PAD} y2={PAD + t * (H - PAD * 2)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        ))}
        {series.map(s => {
          const pts  = s.data.map((_, i) => toXY(s.data, i));
          const linePts = pts.map(([x, y]) => `${x},${y}`).join(' ');
          const areaD   = `M${pts[0][0]},${H} ` + pts.map(([x, y]) => `L${x},${y}`).join(' ') + ` L${pts[pts.length - 1][0]},${H} Z`;
          return (
            <g key={s.id}>
              {!s.dashed && <path d={areaD} fill={`url(#g-${s.id})`}/>}
              <polyline points={linePts} fill="none" stroke={s.color} strokeWidth={s.dashed ? 1.5 : 2}
                strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={s.dashed ? '5 4' : undefined}/>
              {/* Last-point dot */}
              <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="4"
                fill={s.color} stroke="var(--sa-card-bg)" strokeWidth="2"/>
            </g>
          );
        })}
      </svg>
      {/* X-axis labels: space them across width */}
      {xLabels && (
        <div className="san-chart-x">
          {xLabels.map((l, i) => <span key={i} className="san-chart-xl">{l}</span>)}
        </div>
      )}
      {/* Legend */}
      <div className="san-legend-row">
        {series.map(s => (
          <span key={s.id} className="san-legend-item">
            <span className="san-legend-dot" style={{ background: s.color, opacity: s.dashed ? 0.6 : 1 }}/>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Vertical Bar Chart ─────────────────────────────────────── */
function BarChart({ data, height = 110 }) {
  const maxVal = Math.max(...data.map(d => d.value));
  const fillH  = height - 40; // space for value + label
  return (
    <div className="san-bar-chart" style={{ height }}>
      {data.map(d => (
        <div key={d.label} className="san-bar-col">
          <span className="san-bar-pct">{d.value}%</span>
          <div className="san-bar-fill-wrap" style={{ height: fillH }}>
            <div className="san-bar-fill" style={{ height: `${(d.value / maxVal) * fillH}px`, background: d.color }}/>
          </div>
          <span className="san-bar-lbl">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── KPI Card ───────────────────────────────────────────────── */
function KpiCard({ label, value, delta, deltaDir = 'up', spark, sparkColor }) {
  const DeltaIcon = deltaDir === 'up' ? IcTrend : deltaDir === 'down' ? IcTrendDn : IcMinus;
  return (
    <div className="san-kpi-card san-kpi-card--b">
      <div className="san-bkpi-top">
        <p className="san-kpi-lbl">{label}</p>
        {delta && (
          <span className={`san-delta san-delta--${deltaDir}`} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <DeltaIcon/>{delta}
          </span>
        )}
      </div>
      <p className="san-kpi-val san-kpi-val--lg">{value}</p>
      {spark && <Sparkline data={spark} color={sparkColor || 'var(--sa-accent)'} h={26} />}
    </div>
  );
}

/* ── Main: SABenchmarks ─────────────────────────────────────── */
export default function SABenchmarks() {
  const [year,  setYear]  = useState('2024-25');
  const [term,  setTerm]  = useState('All Terms');
  const [grade, setGrade] = useState('K-12');

  return (
    <div className="san-benchmarks">
      {/* Filters */}
      <div className="san-filter-bar">
        {[
          [year,  setYear,  ['2023-24','2024-25','2022-23']],
          [term,  setTerm,  ['All Terms','Spring','Fall','Summer']],
          [grade, setGrade, ['K-12','Primary','Secondary','Tertiary']],
        ].map(([val, setter, opts], idx) => (
          <div key={idx} className="san-sel-wrap">
            <select className="san-sel" value={val} onChange={e => setter(e.target.value)}>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select><IcChevDown />
          </div>
        ))}
      </div>

      {/* 2×2 KPI Grid */}
      <div className="san-kpi-2x2">
        <KpiCard label="Pass Rate"       value="82.4%"  delta="+1.2%"     deltaDir="up"      spark={PASS_RATE}   sparkColor="var(--sa-green)" />
        <KpiCard label="Avg GPA"         value="3.1"    delta="Stable"    deltaDir="neutral"  spark={GPA_DATA}    sparkColor="var(--sa-accent)" />
        <KpiCard label="Attendance"      value="94%"    delta="+0.5%"     deltaDir="up"       spark={ATTEND}      sparkColor="var(--sa-accent)" />
        <KpiCard label="YoY Improvement" value="+2.1%"  delta="YoY Growth" deltaDir="up"     spark={IMPROVEMENT} sparkColor="var(--sa-green)" />
      </div>

      {/* Performance Trend */}
      <div className="san-card">
        <div className="san-card-hdr">
          <div><h3 className="san-card-title">Performance Trend</h3><p className="san-card-sub">Public vs Private Sector</p></div>
          <button className="san-card-action">Export</button>
        </div>
        <div className="san-card-body">
          <LineChart
            series={[
              { id: 'private', label: 'Private', color: 'var(--sa-accent)',         data: TREND_PRIVATE },
              { id: 'public',  label: 'Public',  color: 'rgba(148,163,184,0.65)', dashed: true, data: TREND_PUBLIC },
            ]}
            xLabels={Q_LABELS}
            height={130}
          />
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="san-card">
        <div className="san-card-hdr">
          <div><h3 className="san-card-title">Grade Distribution</h3><p className="san-card-sub">System-wide percentage</p></div>
        </div>
        <div className="san-card-body">
          <BarChart data={GRADE_DIST} height={120} />
          {/* Grade scale legend */}
          <div className="san-grade-legend">
            {GRADE_DIST.map(d => (
              <span key={d.label} className="san-grade-leg-item">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: 'inline-block' }}/>
                {d.label}: {d.value}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performing Schools */}
      <div className="san-card">
        <div className="san-card-hdr">
          <div><h3 className="san-card-title">Top Performing Schools</h3><p className="san-card-sub">Ranked by Integrity &amp; Performance Index</p></div>
        </div>
        <div className="san-bench-table">
          <div className="san-bench-head">
            <span>School Name</span>
            <span>Integrity</span>
            <span>Perf. Index</span>
          </div>
          {TOP_SCHOOLS.map(s => (
            <div key={s.rank} className="san-bench-row">
              <span className="san-bench-rank">{s.rank}</span>
              <span className="san-bench-sname">{s.name}</span>
              <span className="san-bench-int" style={{ color: s.integrity >= 95 ? 'var(--sa-green)' : 'var(--sa-amber)' }}>{s.integrity}</span>
              <span className="san-bench-perf">
                {s.trend === 'up'     && <IcTrend />}
                {s.trend === 'down'   && <IcTrendDn />}
                {s.trend === 'stable' && <IcMinus />}
                {s.perf}
              </span>
            </div>
          ))}
        </div>
        <div className="san-card-foot">
          <button className="san-view-all-btn">View All Schools</button>
        </div>
      </div>

      {/* Platform Summary */}
      <div className="san-card">
        <div className="san-card-hdr">
          <h3 className="san-card-title">Platform Summary</h3>
          <span className="san-card-meta">{year}</span>
        </div>
        <div className="san-card-body">
          <div className="san-summary-grid">
            {[
              { label: 'Schools on Platform', value: '1,245',  sub: '+142 this quarter',   col: 'var(--sa-accent)' },
              { label: 'Active Teachers',      value: '18.4k', sub: '+2.1k YoY',            col: 'var(--sa-green)'  },
              { label: 'Students Enrolled',    value: '285k',  sub: '+34k YoY',             col: 'var(--sa-purple)' },
              { label: 'Reports Generated',    value: '92k',   sub: 'Last 90 days',         col: 'var(--sa-amber)'  },
            ].map(s => (
              <div key={s.label} className="san-summary-item" style={{ borderTopColor: s.col }}>
                <p className="san-summary-val" style={{ color: s.col }}>{s.value}</p>
                <p className="san-summary-lbl">{s.label}</p>
                <p className="san-summary-sub">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
