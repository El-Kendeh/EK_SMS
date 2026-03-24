import React, { useState, useEffect, useMemo } from 'react';
import ApiClient from '../../api/client';

/* ── Icons ──────────────────────────────────────────────────── */
const IcChevDown = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IcCalendar = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcGlobe    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>;
const IcBack     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>;

/* ── Mock Data ──────────────────────────────────────────────── */
const REG_VOL = {
  labels:      ['Jan','Feb','Mar','Apr','May','Jun'],
  submissions: [120, 145, 160, 190, 218, 248],
  approvals:   [100, 125, 140, 165, 188, 210],
};
const RISK_DIST = [
  { label: 'Low',    pct: 60, color: '#10B981' },
  { label: 'Medium', pct: 25, color: '#F59E0B' },
  { label: 'High',   pct: 15, color: '#EF4444' },
];
const ADMIN_EFF = [
  { name: 'Sarah J.',   days: 1.2, color: 'var(--sa-accent)' },
  { name: 'Michael B.', days: 1.8, color: 'var(--sa-accent)' },
  { name: 'Elena R.',   days: 2.5, color: 'var(--sa-amber)'  },
];
const REJECT_REASONS = [
  { reason: 'Missing Documents', pct: 45, color: 'var(--sa-red)'    },
  { reason: 'Domain Mismatch',   pct: 30, color: 'var(--sa-amber)'  },
  { reason: 'Fraudulent Info',   pct: 15, color: 'var(--sa-purple)' },
  { reason: 'Incomplete Fees',   pct: 10, color: 'var(--sa-text-2)' },
];
const REGIONS = [
  { name: 'West Africa',    count: 412, growth: '+12%', flag: 'WA' },
  { name: 'East Africa',    count: 285, growth: '+8%',  flag: 'EA' },
  { name: 'North Africa',   count: 154, growth: '+24%', flag: 'NA' },
  { name: 'Central Africa', count: 98,  growth: '+6%',  flag: 'CA' },
  { name: 'Southern Africa',count: 72,  growth: '+19%', flag: 'SA' },
];
const REGION_COLORS = ['#10B981','#0EA5E9','#F59E0B','#8B5CF6','#EF4444'];

/* ── Donut Chart ────────────────────────────────────────────── */
function DonutChart({ segments, size = 130, thickness = 20, center }) {
  const cx = size / 2, cy = size / 2;
  const r    = cx - thickness / 2;
  const circ = 2 * Math.PI * r;
  let cumPct = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0 }}>
      {/* Background track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness}/>
      {segments.map((seg, i) => {
        const dash   = (seg.pct / 100) * circ;
        const offset = -(cumPct / 100) * circ;
        cumPct += seg.pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        );
      })}
      {center && (
        <>
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="16" fontWeight="800" fill="#EFF4FF">{center.value}</text>
          <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9"  fill="#7A8BA8">{center.sub}</text>
        </>
      )}
    </svg>
  );
}

/* ── Dual-Series Line Chart ─────────────────────────────────── */
function DualLineChart({ data, height = 110 }) {
  const { labels, submissions, approvals } = data;
  const all = [...submissions, ...approvals];
  const max = Math.max(...all), min = Math.min(...all), rng = max - min || 1;
  const W = 300, H = height, PAD = 8;

  const pts = arr => arr.map((v, i) => [
    PAD + (i / (arr.length - 1)) * (W - PAD * 2),
    PAD + (1 - (v - min) / rng) * (H - PAD * 2),
  ]);

  const subPts = pts(submissions);
  const appPts = pts(approvals);
  const areaD  = `M${subPts[0][0]},${H} ` + subPts.map(([x, y]) => `L${x},${y}`).join(' ') + ` L${subPts[subPts.length-1][0]},${H} Z`;

  return (
    <div className="san-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H }}>
        <defs>
          <linearGradient id="ob-sub-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--sa-accent)" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="var(--sa-accent)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0, 0.33, 0.67, 1].map((t, i) => (
          <line key={i} x1={PAD} y1={PAD + t*(H-PAD*2)} x2={W-PAD} y2={PAD + t*(H-PAD*2)} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        ))}
        <path d={areaD} fill="url(#ob-sub-grad)"/>
        <polyline points={subPts.map(([x,y]) => `${x},${y}`).join(' ')} fill="none" stroke="var(--sa-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points={appPts.map(([x,y]) => `${x},${y}`).join(' ')} fill="none" stroke="rgba(148,163,184,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3"/>
      </svg>
      <div className="san-chart-x">
        {labels.map((l, i) => <span key={i} className="san-chart-xl">{l}</span>)}
      </div>
      <div className="san-legend-row">
        <span className="san-legend-item"><span className="san-legend-dot" style={{ background: 'var(--sa-accent)' }}/>Submissions</span>
        <span className="san-legend-item"><span className="san-legend-dot" style={{ background: 'rgba(148,163,184,0.6)' }}/>Approvals</span>
      </div>
    </div>
  );
}

/* ── Horizontal Bar ─────────────────────────────────────────── */
function HBar({ label, value, max = 100, color, unit = '%' }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="san-hbar-item">
      <div className="san-hbar-hdr">
        <span className="san-hbar-label">{label}</span>
        <span className="san-hbar-val" style={{ color: color || 'var(--sa-text)' }}>{value}{unit}</span>
      </div>
      <div className="san-hbar-track">
        <div className="san-hbar-fill" style={{ width: `${pct}%`, background: color || 'var(--sa-accent)' }}/>
      </div>
    </div>
  );
}

/* ── Main: SAOnboarding ─────────────────────────────────────── */
export default function SAOnboarding({ schools: schoolsProp = [] }) {
  const [dateRange,  setDateRange]  = useState('Last 30 Days');
  const [schoolType, setSchoolType] = useState('All Types');
  const [region,     setRegion]     = useState('All Regions');
  const [fetched,    setFetched]    = useState([]);

  useEffect(() => {
    // Only fetch if no schools were passed down from the parent dashboard
    if (schoolsProp.length > 0) return;
    ApiClient.get('/api/schools/').then(data => {
      if (data.success && Array.isArray(data.schools)) setFetched(data.schools);
    }).catch(() => {});
  }, [schoolsProp.length]);

  const schools = schoolsProp.length > 0 ? schoolsProp : fetched;

  /* ── Derived KPIs from real school data ── */
  const totalSchools   = schools.length;
  const approvedCount  = schools.filter(s => s.is_approved).length;
  const pendingCount   = schools.filter(s => !s.is_approved && s.is_active && !s.changes_requested).length;
  // eslint-disable-next-line no-unused-vars
  const rejectedCount  = schools.filter(s => !s.is_active && !s.is_approved).length;
  const conversionRate = totalSchools > 0 ? Math.round((approvedCount / totalSchools) * 100) : 0;

  const kpis = totalSchools > 0 ? [
    { label: 'Conversion Rate',    value: `${conversionRate}%`, badge: 'Live',  badgeCls: 'san-kbadge--green',   sub: 'Of submissions approved' },
    { label: 'Registered Schools', value: totalSchools.toLocaleString(), badge: 'YTD', badgeCls: 'san-kbadge--neutral', sub: 'Total on platform' },
    { label: 'Approved Schools',   value: approvedCount.toLocaleString(), badge: 'Active', badgeCls: 'san-kbadge--green', sub: 'Currently live' },
    { label: 'Pending Queue',      value: pendingCount.toLocaleString(), badge: pendingCount > 0 ? 'Review' : 'Clear', badgeCls: pendingCount > 0 ? 'san-kbadge--amber' : 'san-kbadge--neutral', sub: 'Awaiting review' },
  ] : [
    { label: 'Conversion Rate',    value: '—',   badge: '…', badgeCls: 'san-kbadge--neutral', sub: 'Of submissions approved' },
    { label: 'Registered Schools', value: '—',   badge: '…', badgeCls: 'san-kbadge--neutral', sub: 'Total on platform' },
    { label: 'Approved Schools',   value: '—',   badge: '…', badgeCls: 'san-kbadge--neutral', sub: 'Currently live' },
    { label: 'Pending Queue',      value: '—',   badge: '…', badgeCls: 'san-kbadge--neutral', sub: 'Awaiting review' },
  ];

  /* ── Registration volume by month (submissions) ── */
  const regVolData = useMemo(() => {
    if (schools.length === 0) return REG_VOL;
    const monthMap = {};
    schools.forEach(s => {
      if (!s.registration_date) return;
      const d = new Date(s.registration_date);
      const key = d.toLocaleString('en-GB', { month: 'short' });
      monthMap[key] = (monthMap[key] || { sub: 0, app: 0 });
      monthMap[key].sub++;
      if (s.is_approved) monthMap[key].app++;
    });
    const labels      = Object.keys(monthMap).slice(-6);
    const submissions = labels.map(k => monthMap[k]?.sub || 0);
    const approvals   = labels.map(k => monthMap[k]?.app || 0);
    return labels.length >= 2 ? { labels, submissions, approvals } : REG_VOL;
  }, [schools]);

  /* ── Rejection reasons from real rejection_reason field ── */
  const rejectData = useMemo(() => {
    const rejected = schools.filter(s => !s.is_active && !s.is_approved && s.rejection_reason);
    if (rejected.length === 0) return REJECT_REASONS;
    const reasonMap = {};
    rejected.forEach(s => {
      const r = s.rejection_reason.trim().slice(0, 30) || 'Other';
      reasonMap[r] = (reasonMap[r] || 0) + 1;
    });
    const COLORS = ['var(--sa-red)', 'var(--sa-amber)', 'var(--sa-purple)', 'var(--sa-text-2)'];
    const total = rejected.length;
    return Object.entries(reasonMap).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([reason, n], i) => ({
      reason, pct: Math.round((n / total) * 100), color: COLORS[i],
    }));
  }, [schools]);

  /* ── Pipeline real counts ── */
  const pipelineSteps = totalSchools > 0 ? [
    { step: 'Submitted',  count: totalSchools,  color: 'var(--sa-accent)', pct: 100 },
    { step: 'In Review',  count: pendingCount + approvedCount, color: 'var(--sa-amber)', pct: totalSchools > 0 ? Math.round(((pendingCount + approvedCount) / totalSchools) * 80) : 60 },
    { step: 'Approved',   count: approvedCount, color: 'var(--sa-green)',  pct: totalSchools > 0 ? Math.round((approvedCount / totalSchools) * 80) : 40 },
    { step: 'Active',     count: approvedCount, color: 'var(--sa-green)',  pct: totalSchools > 0 ? Math.round((approvedCount / totalSchools) * 70) : 30 },
  ] : [
    { step: 'Submitted', count: 0, color: 'var(--sa-accent)', pct: 100 },
    { step: 'In Review',  count: 0, color: 'var(--sa-amber)', pct: 75  },
    { step: 'Approved',   count: 0, color: 'var(--sa-green)', pct: 60  },
    { step: 'Active',     count: 0, color: 'var(--sa-green)', pct: 45  },
  ];

  /* ── Regions from real school.region field ── */
  const regionData = useMemo(() => {
    const regionMap = {};
    schools.forEach(s => {
      if (!s.region) return;
      regionMap[s.region] = (regionMap[s.region] || 0) + 1;
    });
    const entries = Object.entries(regionMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (entries.length === 0) return null;
    return entries.map(([name, count], i) => ({
      name, count, growth: '', flag: name.slice(0, 2).toUpperCase(),
    }));
  }, [schools]);

  return (
    <div className="san-onboarding">
      {/* Header row */}
      <div className="san-ob-header">
        <div>
          <h2 className="san-ob-title">Onboarding Analytics</h2>
          <p className="san-ob-sub">Monitor registration pipeline, approvals &amp; regional trends</p>
        </div>
        <button className="san-ob-cal-btn"><IcCalendar /></button>
      </div>

      {/* Filters */}
      <div className="san-filter-bar">
        {[
          [dateRange,  setDateRange,  ['Last 30 Days','Last 90 Days','This Year','All Time']],
          [schoolType, setSchoolType, ['All Types','Public','Private','International','Community']],
          [region,     setRegion,     ['All Regions','West Africa','East Africa','North Africa','Central Africa']],
        ].map(([val, setter, opts], idx) => (
          <div key={idx} className="san-sel-wrap">
            <select className="san-sel" value={val} onChange={e => setter(e.target.value)}>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select><IcChevDown />
          </div>
        ))}
      </div>

      {/* KPI 2×2 */}
      <div className="san-kpi-2x2">
        {kpis.map(k => (
          <div key={k.label} className="san-kpi-card san-kpi-card--b">
            <div className="san-bkpi-top">
              <p className="san-kpi-lbl">{k.label}</p>
              <span className={`san-kbadge ${k.badgeCls}`}>{k.badge}</span>
            </div>
            <p className="san-kpi-val san-kpi-val--lg">{k.value}{k.unit && <span className="san-kpi-unit"> {k.unit}</span>}</p>
            <p className="san-kpi-sub">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Registration Volume */}
      <div className="san-card">
        <div className="san-card-hdr">
          <div><h3 className="san-card-title">Registration Volume</h3><p className="san-card-sub">Submissions vs approvals over time</p></div>
          <button className="san-card-action">View Report</button>
        </div>
        <div className="san-card-body">
          <DualLineChart data={regVolData} height={110} />
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="san-card">
        <div className="san-card-hdr">
          <h3 className="san-card-title">Risk Distribution</h3>
          <p className="san-card-sub">Application risk scoring</p>
        </div>
        <div className="san-card-body">
          <div className="san-risk-layout">
            <DonutChart segments={RISK_DIST} size={130} thickness={22} center={{ value: '1.2k', sub: 'Total' }}/>
            <div className="san-risk-legend">
              {RISK_DIST.map((r, i) => (
                <div key={r.label} className="san-risk-item">
                  <span className="san-legend-dot san-legend-dot--lg" style={{ background: r.color }}/>
                  <span className="san-risk-label">{r.label}</span>
                  <span className="san-risk-pct">{r.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Efficiency */}
      <div className="san-card">
        <div className="san-card-hdr">
          <div><h3 className="san-card-title">Admin Efficiency</h3><p className="san-card-sub">Average review time per reviewer</p></div>
        </div>
        <div className="san-card-body">
          {ADMIN_EFF.map(a => (
            <HBar key={a.name} label={a.name} value={a.days} max={3} color={a.color} unit=" days avg"/>
          ))}
          <p className="san-hbar-footnote">Target: &lt; 2.0 days avg per reviewer</p>
        </div>
      </div>

      {/* Rejection Reasons */}
      <div className="san-card">
        <div className="san-card-hdr">
          <div><h3 className="san-card-title">Rejection Reasons</h3><p className="san-card-sub">Top causes for application denial</p></div>
        </div>
        <div className="san-card-body">
          {rejectData.map(r => (
            <HBar key={r.reason} label={r.reason} value={r.pct} color={r.color}/>
          ))}
        </div>
      </div>

      {/* Top Growing Regions */}
      <div className="san-card">
        <div className="san-card-hdr">
          <div><h3 className="san-card-title">Top Growing Regions</h3><p className="san-card-sub">Registration growth by geography</p></div>
          <span style={{ color: 'var(--sa-accent)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><IcGlobe />View Map</span>
        </div>
        {/* Regional growth bars */}
        <div className="san-card-body">
          <div className="san-region-chart">
            {(regionData || REGIONS).map((r, i) => {
              const list = regionData || REGIONS;
              const maxCount = list[0].count;
              return (
                <div key={r.name} className="san-region-row">
                  <div className="san-region-flag" style={{ background: REGION_COLORS[i] }}>{r.flag}</div>
                  <div className="san-region-info">
                    <div className="san-region-name-row">
                      <span className="san-region-name">{r.name}</span>
                      <span className="san-region-growth">{r.growth}</span>
                    </div>
                    <div className="san-hbar-track">
                      <div className="san-hbar-fill" style={{ width: `${(r.count / maxCount) * 100}%`, background: REGION_COLORS[i] }}/>
                    </div>
                  </div>
                  <span className="san-region-count">{r.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="san-card">
        <div className="san-card-hdr">
          <h3 className="san-card-title">Pipeline Summary</h3>
          <span className="san-card-meta">{dateRange}</span>
        </div>
        <div className="san-card-body">
          <div className="san-pipeline-steps">
            {pipelineSteps.map((s, i) => (
              <div key={s.step} className="san-pipeline-step">
                <div className="san-pipeline-bar-wrap">
                  <div className="san-pipeline-bar" style={{ height: `${s.pct * 0.8}px`, background: s.color }}/>
                </div>
                <p className="san-pipeline-count" style={{ color: s.color }}>{s.count}</p>
                <p className="san-pipeline-label">{s.step}</p>
                {i < 3 && <div className="san-pipeline-arrow"><IcBack /></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
