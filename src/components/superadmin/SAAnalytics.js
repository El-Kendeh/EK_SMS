import React, { useState, useMemo } from 'react';

/* ── Icons ──────────────────────────────────────────────────── */
const IcBack     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>;
const IcSearch   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcGrid     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
const IcList     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.2" fill="currentColor"/><circle cx="4" cy="12" r="1.2" fill="currentColor"/><circle cx="4" cy="18" r="1.2" fill="currentColor"/></svg>;
const IcUsers    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const IcSchool   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V10.6M19 21V10.6M12 3L2 8h20L12 3z"/><rect x="9" y="13" width="6" height="8" rx="1"/></svg>;
const IcMapPin   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcChevDown = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IcDots     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>;
const IcLogin    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>;
const IcCheck    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcX        = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcShield   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcLock     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const IcAlert    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcMail     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const IcPhone    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 012 2.18 2 2 0 014 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
const IcBook     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
const IcTrend    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;

/* ── Helpers ────────────────────────────────────────────────── */
const COLORS = ['#1B3FAF','#0EA5E9','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#6366F1'];
const avatarColor = name => COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];
const initials    = name => (name || 'SC').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const TIER_COLORS  = { Enterprise: 'var(--sa-purple)', Pro: 'var(--sa-accent)', Basic: 'var(--sa-amber)' };
const TIER_BG      = { Enterprise: 'var(--sa-purple-dim)', Pro: 'var(--sa-accent-dim)', Basic: 'var(--sa-amber-dim)' };
const REGIONS      = ['West Africa', 'East Africa', 'North Africa', 'Central Africa', 'Southern Africa'];
const TIERS        = ['Enterprise', 'Pro', 'Basic'];

/* Deterministic mock overlay — consistent per school */
function mockOverlay(school) {
  const s = ((school.id || 1) * 31 + (school.name?.charCodeAt(0) || 7) * 17) & 0xffff;
  return {
    tier:       TIERS[s % 3],
    region:     REGIONS[s % 5],
    integrity:  (85 + (s % 15)).toFixed(1),
    perfIndex:  (7.5 + ((s % 20) / 10)).toFixed(1),
    attendance: (80 + (s % 18)).toFixed(1),
    grades:     70 + (s % 25),
    vacancies:  s % 4,
    students:   800  + ((s * 7)  % 1200),
    teachers:   40   + ((s * 3)  % 80),
    lastAudit:  `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][s % 12]} ${2024 + (s % 2)}`,
  };
}

/* ── Sparkline ──────────────────────────────────────────────── */
function Sparkline({ data, color = 'var(--sa-accent)', h = 28 }) {
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 72},${h - 2 - ((v - min) / rng) * (h - 4)}`).join(' ');
  return (
    <svg viewBox={`0 0 72 ${h}`} preserveAspectRatio="none" style={{ width: 72, height: h, flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── ProgressBar ────────────────────────────────────────────── */
function ProgressBar({ label, sublabel, value, max = 100, color = 'var(--sa-accent)' }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="san-prog-item">
      <div className="san-prog-header">
        <span className="san-prog-label">{label}</span>
        {sublabel && <span className="san-prog-sub">{sublabel}</span>}
      </div>
      <div className="san-prog-track">
        <div className="san-prog-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ── Individual School Oversight ────────────────────────────── */
const COMPLIANCE = [
  { id: 'twofa',    label: '2FA Enforced',     icon: <IcShield /> },
  { id: 'backups',  label: 'Automated Backups', icon: <IcShield /> },
  { id: 'gradelock',label: 'Grade Lock Policy', icon: <IcLock /> },
];
const TABS_OS = ['Overview', 'Academics', 'Compliance', 'Security'];

function OversightView({ school, onBack }) {
  const [tab, setTab] = useState('overview');
  const ov  = useMemo(() => mockOverlay(school), [school]);
  const sid = school.id || 1;

  const compliance = { twofa: sid % 3 !== 0, backups: sid % 4 !== 2, gradelock: sid % 5 === 0 };
  const alerts = [
    { color: 'var(--sa-red)',   title: 'Failed Login Attempt',  detail: `Admin_Principal • IP: 192.168.${sid % 256}.1`, time: '2 hours ago' },
    { color: 'var(--sa-amber)', title: 'Grade Modification',    detail: `Teacher_Math • Grade ${10 + sid % 3}-B`,        time: 'Yesterday, 4:30 PM' },
  ];
  const personnel = [
    { name: 'Dr. Sarah Jenkins', role: 'Principal' },
    { name: 'Marcus Chen',       role: 'IT Administrator' },
    { name: 'Registrar Office',  role: 'General Inquiry' },
  ];

  return (
    <div className="san-oversight">
      {/* Back header */}
      <div className="san-oversight-hdr">
        <button className="san-back-btn" onClick={onBack}>
          <IcBack /><span>Directory</span>
        </button>
        <span className="san-oversight-id">ID: #{school.code || school.id}</span>
      </div>

      {/* Profile card */}
      <div className="san-profile-card">
        <div className="san-profile-avatar" style={{ background: avatarColor(school.name) }}>
          {initials(school.name)}
          <span className="san-profile-online" />
        </div>
        <h2 className="san-profile-name">{school.name}</h2>
        <p className="san-profile-loc"><span className="san-profile-loc-icon"><IcMapPin /></span>{school.city || 'N/A'}{school.country ? `, ${school.country}` : ''}</p>
        <button className="san-login-btn"><IcLogin /><span>Login as Admin</span></button>
      </div>

      {/* Tabs */}
      <div className="san-tabs">
        {TABS_OS.map(t => (
          <button key={t} className={`san-tab${tab === t.toLowerCase() ? ' san-tab--active' : ''}`} onClick={() => setTab(t.toLowerCase())}>{t}</button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="san-tab-body">
          <div className="san-section-hdr"><span>Performance Overview</span><span className="san-live-pill">Live Updates</span></div>
          <div className="san-perf-grid">
            <div className="san-perf-card">
              <p className="san-perf-lbl">ATTENDANCE</p>
              <p className="san-perf-val">{ov.attendance}%</p>
              <p className="san-delta san-delta--up">+2.1%</p>
              <div className="san-perf-bar"><div style={{ width: `${ov.attendance}%`, background: 'var(--sa-green)' }} /></div>
            </div>
            <div className="san-perf-card">
              <p className="san-perf-lbl">GRADES</p>
              <p className="san-perf-val">{ov.grades}%</p>
              <p className="san-delta" style={{ color: 'var(--sa-amber)' }}>Pending</p>
              <div className="san-perf-bar"><div style={{ width: `${ov.grades}%`, background: 'var(--sa-accent)' }} /></div>
            </div>
          </div>
          <div className="san-perf-card san-perf-card--wide">
            <p className="san-perf-lbl">TEACHER VACANCIES</p>
            <p className="san-perf-val san-perf-val--xl">{ov.vacancies} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--sa-text-2)' }}>Positions</span></p>
          </div>
          <div className="san-section-hdr" style={{ marginTop: 20 }}><span>Compliance Status</span></div>
          <div className="san-comply-list">
            {COMPLIANCE.map(c => {
              const ok = compliance[c.id];
              return (
                <div key={c.id} className="san-comply-item">
                  <span className="san-comply-icon" style={{ color: ok ? 'var(--sa-green)' : 'var(--sa-amber)' }}>{c.icon}</span>
                  <span className="san-comply-label">{c.label}</span>
                  <span className={`san-comply-status ${ok ? 'san-cs--ok' : 'san-cs--warn'}`}>{ok ? <IcCheck /> : <IcX />}{ok ? 'Active' : 'Inactive'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Academics */}
      {tab === 'academics' && (
        <div className="san-tab-body">
          <div className="san-section-hdr"><span>Academic Performance</span></div>
          <div className="san-acad-kpis">
            {[['Pass Rate', `${ov.integrity}%`, 'var(--sa-green)', parseFloat(ov.integrity)],
              ['Avg GPA',   `${(parseFloat(ov.perfIndex)*0.4).toFixed(1)}`, 'var(--sa-accent)', parseFloat(ov.perfIndex)*10],
              ['Integrity Index', `${ov.perfIndex}`, 'var(--sa-purple)', parseFloat(ov.perfIndex)*10]].map(([lbl, val, col, pct]) => (
              <div key={lbl} className="san-acad-kpi">
                <p className="san-acad-kpi-label">{lbl}</p>
                <p className="san-acad-kpi-value" style={{ color: col }}>{val}</p>
                <div className="san-perf-bar"><div style={{ width: `${pct}%`, background: col }} /></div>
              </div>
            ))}
          </div>
          <div className="san-section-hdr" style={{ marginTop: 20 }}><span>Grade Distribution</span></div>
          {[['A+', 28, 'var(--sa-green)'], ['A', 32, 'var(--sa-green)'], ['B', 22, 'var(--sa-accent)'], ['C', 12, 'var(--sa-amber)'], ['D', 4, 'var(--sa-red)'], ['F', 2, 'var(--sa-red)']].map(([g, v, c]) => (
            <ProgressBar key={g} label={g} sublabel={`${v}%`} value={v} max={35} color={c} />
          ))}
        </div>
      )}

      {/* Compliance */}
      {tab === 'compliance' && (
        <div className="san-tab-body">
          <div className="san-section-hdr"><span>Compliance Status</span></div>
          <div className="san-comply-list">
            {COMPLIANCE.map(c => {
              const ok = compliance[c.id];
              return (
                <div key={c.id} className="san-comply-item">
                  <span className="san-comply-icon" style={{ color: ok ? 'var(--sa-green)' : 'var(--sa-amber)' }}>{c.icon}</span>
                  <span className="san-comply-label">{c.label}</span>
                  <span className={`san-comply-status ${ok ? 'san-cs--ok' : 'san-cs--warn'}`}>{ok ? <IcCheck /> : <IcX />}{ok ? 'Active' : 'Inactive'}</span>
                </div>
              );
            })}
          </div>
          <div className="san-section-hdr" style={{ marginTop: 20 }}><span>Coverage Metrics</span></div>
          <ProgressBar label="Data Encryption"  value={100} color="var(--sa-green)"  sublabel="100%" />
          <ProgressBar label="Backup Coverage"  value={94}  color="var(--sa-accent)" sublabel="94%" />
          <ProgressBar label="Policy Adherence" value={78}  color="var(--sa-amber)"  sublabel="78%" />
          <div className="san-comply-meta">
            <div className="san-comply-meta-item"><p className="san-comply-meta-lbl">Last Audit</p><p className="san-comply-meta-val">{ov.lastAudit}</p></div>
            <div className="san-comply-meta-item"><p className="san-comply-meta-lbl">Next Review</p><p className="san-comply-meta-val">Apr 2025</p></div>
          </div>
        </div>
      )}

      {/* Security */}
      {tab === 'security' && (
        <div className="san-tab-body">
          <div className="san-section-hdr"><span>Recent Security Alerts</span><span style={{ fontSize: '0.75rem', color: 'var(--sa-accent)', cursor: 'pointer' }}>View All</span></div>
          <div className="san-alerts-list">
            {alerts.map((a, i) => (
              <div key={i} className="san-alert-item" style={{ borderLeftColor: a.color }}>
                <span style={{ color: a.color }}><IcAlert /></span>
                <div>
                  <p className="san-alert-title">{a.title}</p>
                  <p className="san-alert-detail">{a.detail}</p>
                  <p className="san-alert-time">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="san-section-hdr" style={{ marginTop: 20 }}><span>Key Personnel</span></div>
          <div className="san-personnel-list">
            {personnel.map((p, i) => (
              <div key={i} className="san-personnel-item">
                <div className="san-personnel-av" style={{ background: COLORS[i] }}>{initials(p.name)}</div>
                <div className="san-personnel-info"><p className="san-personnel-name">{p.name}</p><p className="san-personnel-role">{p.role}</p></div>
                <div className="san-personnel-btns">
                  <button aria-label="Email"><IcMail /></button>
                  <button aria-label="Phone"><IcPhone /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── School Card ────────────────────────────────────────────── */
function SchoolCard({ school, onView }) {
  const ov = useMemo(() => mockOverlay(school), [school]);
  return (
    <div className="san-school-card" onClick={() => onView(school)}>
      <div className="san-school-card-top">
        <div className="san-school-av" style={{ background: avatarColor(school.name) }}>{initials(school.name)}</div>
        <div className="san-school-meta">
          <p className="san-school-name">{school.name}</p>
          <p className="san-school-loc">{school.city || '—'}{school.country ? `, ${school.country}` : ''}</p>
        </div>
        <button className="san-dots-btn" onClick={e => e.stopPropagation()} aria-label="Options"><IcDots /></button>
      </div>
      <div className="san-school-badges">
        <span className="san-badge san-badge--status" style={{ color: school.is_approved ? 'var(--sa-green)' : 'var(--sa-amber)', background: school.is_approved ? 'var(--sa-green-dim)' : 'var(--sa-amber-dim)' }}>
          {school.is_approved ? 'HEALTHY' : 'PENDING'}
        </span>
        <span className="san-badge san-badge--tier" style={{ color: TIER_COLORS[ov.tier], background: TIER_BG[ov.tier] }}>{ov.tier}</span>
      </div>
      <div className="san-school-stats-row">
        <div className="san-school-stat"><IcUsers /><span>{ov.students.toLocaleString()}</span><span className="san-stat-lbl">Students</span></div>
        <div className="san-school-stat"><IcBook /><span>{ov.teachers}</span><span className="san-stat-lbl">Teachers</span></div>
        <div className="san-school-stat"><IcShield /><span style={{ color: 'var(--sa-green)' }}>{ov.integrity}%</span><span className="san-stat-lbl">Integrity</span></div>
      </div>
      <button className="san-card-view-btn">View Details <IcTrend /></button>
    </div>
  );
}

/* ── Map Placeholder ────────────────────────────────────────── */
function GeoMapPlaceholder({ schools }) {
  const dots = useMemo(() => schools.slice(0, 12).map((s, i) => ({
    cx: 30 + ((s.id || i) * 23 % 240), cy: 20 + ((s.id || i) * 17 % 80),
    r: s.is_approved ? 4 : 3, color: s.is_approved ? 'var(--sa-accent)' : 'var(--sa-amber)',
  })), [schools]);
  return (
    <div className="san-map-wrap">
      <svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 120 }}>
        <rect width="300" height="120" fill="var(--sa-card-bg2)" rx="8"/>
        <text x="150" y="10" textAnchor="middle" fontSize="7" fill="rgba(122,139,168,0.5)" fontWeight="600" letterSpacing="2">GEOGRAPHIC DISTRIBUTION</text>
        {/* Simulated continent outline */}
        <path d="M60 40 Q80 30 110 35 Q140 25 170 38 Q195 30 220 42 Q240 50 235 65 Q220 75 200 70 Q180 80 155 72 Q130 82 105 70 Q80 75 65 62 Z" fill="none" stroke="rgba(14,165,233,0.15)" strokeWidth="1"/>
        <path d="M62 42 Q82 32 112 37 Q142 27 172 40 Q197 32 222 44 Q242 52 237 67 Q222 77 202 72 Q182 82 157 74 Q132 84 107 72 Q82 77 67 64 Z" fill="rgba(14,165,233,0.04)"/>
        {dots.map((d, i) => (
          <g key={i}>
            <circle cx={d.cx} cy={d.cy} r={d.r + 3} fill={d.color} opacity="0.15"/>
            <circle cx={d.cx} cy={d.cy} r={d.r} fill={d.color} opacity="0.85"/>
          </g>
        ))}
      </svg>
      <div className="san-map-legend">
        <span><span className="san-map-dot san-map-dot--active" />Active</span>
        <span><span className="san-map-dot san-map-dot--pending" />Pending</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--sa-text-3)' }}>{schools.length} Schools</span>
      </div>
    </div>
  );
}

/* ── Main: SAAnalytics ──────────────────────────────────────── */
export default function SAAnalytics({ schools = [] }) {
  const [view,     setView]     = useState('directory');
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState('');
  const [tierF,    setTierF]    = useState('All');
  const [statusF,  setStatusF]  = useState('All');
  const [dispMode, setDispMode] = useState('grid');

  const approved = useMemo(() => schools.filter(s => s.is_approved).length, [schools]);
  const pending  = useMemo(() => schools.filter(s => !s.is_approved).length, [schools]);
  const totalStu = useMemo(() => schools.reduce((n, s) => n + mockOverlay(s).students, 0), [schools]);

  const tierDist = useMemo(() => {
    const c = { Enterprise: 0, Pro: 0, Basic: 0 };
    schools.forEach(s => { const t = mockOverlay(s).tier; c[t]++; });
    const total = schools.length || 1;
    return TIERS.map(t => ({ tier: t, pct: Math.round(c[t] / total * 100) }));
  }, [schools]);

  const filtered = useMemo(() => {
    let list = schools;
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(s => s.name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.country?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q)); }
    if (statusF === 'Active')  list = list.filter(s =>  s.is_approved);
    if (statusF === 'Pending') list = list.filter(s => !s.is_approved);
    if (tierF   !== 'All')     list = list.filter(s => mockOverlay(s).tier === tierF);
    return list;
  }, [schools, search, statusF, tierF]);

  if (view === 'oversight' && selected) {
    return <OversightView school={selected} onBack={() => { setView('directory'); setSelected(null); }} />;
  }

  return (
    <div className="san-directory">
      {/* KPI Strip */}
      <div className="san-kpi-row">
        {[
          { label: 'Active Schools', value: approved, delta: '+5% MoM', col: 'var(--sa-accent)',  colD: 'up',   icon: <IcSchool />, cls: 'san-kpi-ico--blue',  spark: [8,10,9,12,11,14,approved || 15] },
          { label: 'Total Students', value: totalStu > 1000 ? `${(totalStu/1000).toFixed(1)}k` : totalStu || '0', delta: '+12% YTD', col: 'var(--sa-green)', colD: 'up', icon: <IcUsers />, cls: 'san-kpi-ico--green', spark: [40,52,60,72,80,90,95] },
          { label: 'Pending Review', value: pending,  delta: `${pending} queued`, col: 'var(--sa-amber)', colD: 'neutral', icon: <IcSchool />, cls: 'san-kpi-ico--amber', spark: [2,5,3,7,4,6,pending || 4] },
        ].map(k => (
          <div key={k.label} className="san-kpi-card">
            <div className={`san-kpi-ico ${k.cls}`}>{k.icon}</div>
            <div className="san-kpi-text">
              <p className="san-kpi-lbl">{k.label}</p>
              <p className="san-kpi-val">{k.value}</p>
              <p className={`san-delta san-delta--${k.colD}`}>{k.delta}</p>
            </div>
            <Sparkline data={k.spark} color={k.col} />
          </div>
        ))}
      </div>

      {/* Geographic Distribution */}
      <div className="san-card">
        <div className="san-card-hdr">
          <div><h3 className="san-card-title">Geographic Distribution</h3><p className="san-card-sub">School node locations across regions</p></div>
        </div>
        <div className="san-card-body">
          <GeoMapPlaceholder schools={schools} />
        </div>
      </div>

      {/* Resource Allocation */}
      <div className="san-card">
        <div className="san-card-hdr">
          <h3 className="san-card-title">Resource Allocation</h3>
          <span className="san-card-meta">Q1 2025</span>
        </div>
        <div className="san-card-body san-alloc-body">
          {tierDist.map(({ tier, pct }) => (
            <ProgressBar key={tier} label={tier} sublabel={`${pct}%`} value={pct} color={TIER_COLORS[tier]} />
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="san-filter-bar">
        <div className="san-search-wrap"><IcSearch /><input className="san-search-input" placeholder="Search schools…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="san-chip-row">
          {['All','Active','Pending'].map(s => (
            <button key={s} className={`san-chip${statusF === s ? ' san-chip--on' : ''}`} onClick={() => setStatusF(s)}>{s}</button>
          ))}
        </div>
        <div className="san-sel-wrap">
          <select className="san-sel" value={tierF} onChange={e => setTierF(e.target.value)}>
            {['All','Enterprise','Pro','Basic'].map(t => <option key={t}>{t}</option>)}
          </select><IcChevDown />
        </div>
        <div className="san-view-toggle">
          <button className={`san-view-tog${dispMode === 'grid' ? ' active' : ''}`} onClick={() => setDispMode('grid')} aria-label="Grid view"><IcGrid /></button>
          <button className={`san-view-tog${dispMode === 'list' ? ' active' : ''}`} onClick={() => setDispMode('list')} aria-label="List view"><IcList /></button>
        </div>
      </div>

      {/* Results meta */}
      <div className="san-results-meta">
        <span>{filtered.length} school{filtered.length !== 1 ? 's' : ''}</span>
        {(search || tierF !== 'All' || statusF !== 'All') && (
          <button className="san-clear-btn" onClick={() => { setSearch(''); setTierF('All'); setStatusF('All'); }}><IcX /> Clear</button>
        )}
      </div>

      {/* Schools: Grid */}
      {filtered.length === 0 ? (
        <div className="san-empty"><IcSchool /><p>No schools match your filters</p></div>
      ) : dispMode === 'grid' ? (
        <div className="san-school-grid">
          {filtered.map(s => <SchoolCard key={s.id} school={s} onView={sc => { setSelected(sc); setView('oversight'); }} />)}
        </div>
      ) : (
        /* List / Table */
        <div className="san-card">
          <div className="san-tbl-wrap">
            <table className="san-tbl">
              <thead><tr><th>School</th><th>Region</th><th>Tier</th><th>Integrity</th><th>Status</th><th>Last Audit</th><th></th></tr></thead>
              <tbody>
                {filtered.map(s => {
                  const ov = mockOverlay(s);
                  return (
                    <tr key={s.id} onClick={() => { setSelected(s); setView('oversight'); }} style={{ cursor: 'pointer' }}>
                      <td><div className="san-tbl-school"><div className="san-tbl-av" style={{ background: avatarColor(s.name) }}>{initials(s.name)}</div><div><p className="san-tbl-name">{s.name}</p><p className="san-tbl-sub">{s.city || '—'}</p></div></div></td>
                      <td><span className="san-tbl-txt">{ov.region}</span></td>
                      <td><span className="san-badge san-badge--tier" style={{ color: TIER_COLORS[ov.tier], background: TIER_BG[ov.tier] }}>{ov.tier}</span></td>
                      <td><span style={{ color: 'var(--sa-green)', fontWeight: 700 }}>{ov.integrity}%</span></td>
                      <td><span className="san-badge san-badge--status" style={{ color: s.is_approved ? 'var(--sa-green)' : 'var(--sa-amber)', background: s.is_approved ? 'var(--sa-green-dim)' : 'var(--sa-amber-dim)' }}>{s.is_approved ? 'ACTIVE' : 'PENDING'}</span></td>
                      <td><span className="san-tbl-txt">{ov.lastAudit}</span></td>
                      <td><button className="san-tbl-view-btn" onClick={e => { e.stopPropagation(); setSelected(s); setView('oversight'); }}>View</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
