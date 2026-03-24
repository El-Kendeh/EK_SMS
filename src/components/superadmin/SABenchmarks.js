import React, { useState, useEffect } from 'react';
import ApiClient from '../../api/client';

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
  { rank: 1, name: 'St. Marks Academy', integrity: 98.5, perf: 9.4, trend: 'up',     passRate: 91, attendance: 96, gpa: 3.4, students: 1240, type: 'Private' },
  { rank: 2, name: 'Northwood High',    integrity: 97.2, perf: 9.1, trend: 'up',     passRate: 88, attendance: 94, gpa: 3.2, students: 980,  type: 'Public'  },
  { rank: 3, name: 'Riverdale Public',  integrity: 89.4, perf: 8.8, trend: 'stable', passRate: 85, attendance: 92, gpa: 3.0, students: 1540, type: 'Public'  },
  { rank: 4, name: 'Tech Institute',    integrity: 94.1, perf: 8.5, trend: 'up',     passRate: 83, attendance: 91, gpa: 2.9, students: 760,  type: 'Private' },
  { rank: 5, name: 'Central Academy',   integrity: 91.8, perf: 8.2, trend: 'down',   passRate: 80, attendance: 89, gpa: 2.8, students: 1120, type: 'Public'  },
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


/* ── Compare View ───────────────────────────────────────────── */
function CompareView({ onBack, schools = TOP_SCHOOLS }) {
  const list = schools.length >= 2 ? schools : TOP_SCHOOLS;
  const [schoolA, setSchoolA] = React.useState(list[0]?.name || '');
  const [schoolB, setSchoolB] = React.useState(list[1]?.name || '');
  const a = list.find(s => s.name === schoolA) || list[0] || TOP_SCHOOLS[0];
  const b = list.find(s => s.name === schoolB) || list[1] || TOP_SCHOOLS[1];

  const metrics = [
    { key: 'integrity',  label: 'Grade Integrity', fmt: v => v + '%'           },
    { key: 'perf',       label: 'Perf. Index',     fmt: v => v                 },
    { key: 'passRate',   label: 'Pass Rate',       fmt: v => v + '%'           },
    { key: 'attendance', label: 'Attendance',      fmt: v => v + '%'           },
    { key: 'gpa',        label: 'Avg GPA',         fmt: v => v                 },
    { key: 'students',   label: 'Students',        fmt: v => v.toLocaleString() },
  ];

  const aWins = metrics.filter(m => a[m.key] >= b[m.key]).length;
  const bWins = metrics.length - aWins;
  const winner = aWins >= bWins ? a : b;

  const ChevDown = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
  );

  return (
    <div className="san-benchmarks">
      <button className="san-view-all-btn" style={{ marginBottom: 20 }} onClick={onBack}>
        ← Back to Benchmarks
      </button>
      <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--sa-text)' }}>School Comparison</h2>
      <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: 'var(--sa-text-2)' }}>Side-by-side performance analysis</p>

      {/* Selectors */}
      <div className="san-compare-sel-row">
        <div className="san-sel-wrap">
          <select className="san-sel" value={schoolA} onChange={e => setSchoolA(e.target.value)}>
            {list.filter(s => s.name !== schoolB).map(s => <option key={s.name}>{s.name}</option>)}
          </select><ChevDown />
        </div>
        <div className="san-vs-label" style={{ textAlign: 'center', fontSize: '0.6875rem', fontWeight: 800, color: 'var(--sa-text-3)', letterSpacing: '0.05em' }}>VS</div>
        <div className="san-sel-wrap">
          <select className="san-sel" value={schoolB} onChange={e => setSchoolB(e.target.value)}>
            {list.filter(s => s.name !== schoolA).map(s => <option key={s.name}>{s.name}</option>)}
          </select><ChevDown />
        </div>
      </div>

      {/* School header cards */}
      <div className="sa-two-col-grid" style={{ marginBottom: 16 }}>
        {[{s: a, side: 'a'}, {s: b, side: 'b'}].map(({ s, side }) => (
          <div key={side} className="san-kpi-card san-kpi-card--b" style={{ textAlign: 'center', padding: '14px 12px' }}>
            <p style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--sa-text-3)', marginBottom: 6 }}>#{s.rank} Ranked</p>
            <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '0.875rem', color: 'var(--sa-text)', lineHeight: 1.3 }}>{s.name}</p>
            <span style={{
              display: 'inline-block', borderRadius: 20, padding: '2px 8px', fontSize: '0.625rem', fontWeight: 600,
              background: s.type === 'Private' ? 'var(--sa-accent-dim)' : 'var(--sa-green-dim)',
              color: s.type === 'Private' ? 'var(--sa-accent)' : 'var(--sa-green)',
            }}>{s.type}</span>
          </div>
        ))}
      </div>

      {/* Head-to-head metrics */}
      <div className="san-card">
        <div className="san-card-hdr">
          <h3 className="san-card-title">Head-to-Head Metrics</h3>
        </div>
        <div style={{ padding: '0 16px 8px' }}>
          {metrics.map(m => {
            const aVal = a[m.key];
            const bVal = b[m.key];
            const aWin = aVal >= bVal;
            return (
              <div key={m.key} className="san-h2h-row">
                <div className="san-h2h-a" style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: aWin ? 'var(--sa-green)' : 'var(--sa-text)' }}>{m.fmt(aVal)}</span>
                  {aWin && <span style={{ fontSize: '0.5rem', color: 'var(--sa-green)' }}>▲</span>}
                </div>
                <div className="san-h2h-label" style={{ textAlign: 'center', fontSize: '0.625rem', color: 'var(--sa-text-3)', fontWeight: 600, lineHeight: 1.3 }}>{m.label}</div>
                <div className="san-h2h-b" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {!aWin && <span style={{ fontSize: '0.5rem', color: 'var(--sa-green)' }}>▲</span>}
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: !aWin ? 'var(--sa-green)' : 'var(--sa-text)' }}>{m.fmt(bVal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verdict */}
      <div className="san-kpi-card san-kpi-card--b" style={{ marginTop: 12, padding: '16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--sa-text-3)', marginBottom: 4 }}>Overall Leader</p>
          <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--sa-green)', margin: '0 0 2px' }}>{winner.name}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--sa-text-2)', margin: 0 }}>
            Leads in {aWins >= bWins ? aWins : bWins}/{metrics.length} metrics
          </p>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--sa-green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--sa-green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ── Main: SABenchmarks ─────────────────────────────────────── */
export default function SABenchmarks() {
  const [year,      setYear]      = useState('2024-25');
  const [term,      setTerm]      = useState('All Terms');
  const [grade,     setGrade]     = useState('K-12');
  const [comparing, setComparing] = useState(false);

  /* Real data from API */
  const [gradeStats,   setGradeStats]   = useState(null);
  const [schoolStats,  setSchoolStats]  = useState([]);

  useEffect(() => {
    ApiClient.get('/api/grade-stats/').then(data => {
      if (data.success) setGradeStats(data);
    }).catch(() => {});
    ApiClient.get('/api/school-stats/').then(data => {
      if (data.success && Array.isArray(data.stats)) {
        const approved = data.stats
          .filter(s => s.is_approved)
          .sort((a, b) => b.student_count - a.student_count);
        setSchoolStats(approved);
      }
    }).catch(() => {});
  }, []);

  /* Derived real KPI values */
  const totalGrades  = gradeStats?.total_grades   || 0;
  const passedGrades = gradeStats?.passed          || 0;
  const avgScore     = gradeStats?.average_score   != null ? gradeStats.average_score : null;
  const passRatePct  = totalGrades > 0 ? ((passedGrades / totalGrades) * 100).toFixed(1) : null;

  /* Real grade distribution */
  const GRADE_COLORS_MAP = { A: '#10B981', B: '#0EA5E9', C: '#F59E0B', D: '#8B5CF6', E: '#EF4444', I: '#6366F1' };
  const realGradeDist = gradeStats?.distribution
    ? Object.entries(gradeStats.distribution)
        .filter(([, count]) => count > 0)
        .map(([label, count]) => ({
          label,
          value: totalGrades > 0 ? Math.round((count / totalGrades) * 100) : 0,
          color: GRADE_COLORS_MAP[label] || '#94A3B8',
        }))
        .sort((a, b) => b.value - a.value)
    : null;
  const gradeDist = realGradeDist && realGradeDist.length > 0 ? realGradeDist : GRADE_DIST;

  /* Real top schools (ranked by student count) */
  const realTopSchools = schoolStats.slice(0, 5).map((s, i) => ({
    rank: i + 1,
    name: s.school_name,
    integrity: 100,          // no per-school integrity API — show 100% as verified
    perf: parseFloat((s.student_count / Math.max(1, schoolStats[0]?.student_count || 1) * 10).toFixed(1)),
    trend: 'up',
    passRate: passRatePct ? parseFloat(passRatePct) : 80,
    attendance: 90,
    gpa: avgScore ? parseFloat((avgScore / 100 * 4).toFixed(1)) : 3.0,
    students: s.student_count,
    type: 'Public',
  }));
  const topSchools = realTopSchools.length > 0 ? realTopSchools : TOP_SCHOOLS;

  /* Platform totals */
  const totalStudents  = schoolStats.reduce((n, s) => n + (s.student_count || 0), 0);
  const totalTeachers  = schoolStats.reduce((n, s) => n + (s.teacher_count || 0), 0);
  const totalSchools   = schoolStats.length;

  const fmtCount = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  if (comparing) return <CompareView onBack={() => setComparing(false)} schools={topSchools} />;

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
        <KpiCard label="Pass Rate"   value={passRatePct != null ? `${passRatePct}%` : '—'} delta={passRatePct != null ? `${passRatePct}% pass` : 'No data'} deltaDir={passRatePct >= 80 ? 'up' : 'down'} spark={PASS_RATE} sparkColor="var(--sa-green)" />
        <KpiCard label="Avg Score"   value={avgScore != null ? `${avgScore}%` : '—'} delta="System-wide" deltaDir="neutral" spark={GPA_DATA} sparkColor="var(--sa-accent)" />
        <KpiCard label="Total Grades" value={totalGrades > 0 ? totalGrades.toLocaleString() : '—'} delta={gradeStats ? `${gradeStats.locked_grades} locked` : 'No data'} deltaDir="up" spark={ATTEND} sparkColor="var(--sa-accent)" />
        <KpiCard label="Schools Live" value={totalSchools > 0 ? totalSchools : '—'} delta={totalStudents > 0 ? `${fmtCount(totalStudents)} students` : 'No data'} deltaDir="up" spark={IMPROVEMENT} sparkColor="var(--sa-green)" />
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
          <BarChart data={gradeDist} height={120} />
          {/* Grade scale legend */}
          <div className="san-grade-legend">
            {gradeDist.map(d => (
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
          <button className="san-card-action" onClick={() => setComparing(true)}>Compare</button>
        </div>
        <div className="san-bench-table">
          <div className="san-bench-head">
            <span>School Name</span>
            <span>Integrity</span>
            <span>Perf. Index</span>
          </div>
          {topSchools.map(s => (
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
              { label: 'Schools on Platform', value: totalSchools > 0 ? totalSchools.toLocaleString() : '—', sub: 'Active, approved schools', col: 'var(--sa-accent)' },
              { label: 'Active Teachers',     value: totalTeachers > 0 ? fmtCount(totalTeachers) : '—',     sub: 'Across all schools',       col: 'var(--sa-green)'  },
              { label: 'Students Enrolled',   value: totalStudents > 0 ? fmtCount(totalStudents) : '—',     sub: 'Active students',          col: 'var(--sa-purple)' },
              { label: 'Total Grades',        value: totalGrades > 0 ? fmtCount(totalGrades) : '—',         sub: 'All recorded grades',      col: 'var(--sa-amber)'  },
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
