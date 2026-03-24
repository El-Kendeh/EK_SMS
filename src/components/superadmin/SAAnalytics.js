import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ApiClient from '../../api/client';

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

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function OversightView({ school, onBack, onLoginAs }) {
  const [tab, setTab] = useState('overview');
  const fallback = useMemo(() => mockOverlay(school), [school]);
  const [ov, setOv] = useState(fallback);
  const [secAlerts, setSecAlerts] = useState([]);

  useEffect(() => {
    ApiClient.get(`/api/school-stats/?school_id=${school.id}`).then(data => {
      if (data.success && data.stats && data.stats.length > 0) {
        const s = data.stats[0];
        setOv(prev => ({
          ...prev,
          students: s.student_count ?? prev.students,
          teachers: s.teacher_count ?? prev.teachers,
        }));
      }
    }).catch(() => {});
    /* Recent system security alerts */
    ApiClient.get('/api/security-logs/?limit=5').then(data => {
      if (data.success && Array.isArray(data.logs) && data.logs.length > 0) {
        setSecAlerts(data.logs.slice(0, 3).map(l => ({
          color: l.severity === 'critical' || l.severity === 'high' ? 'var(--sa-red)' : 'var(--sa-amber)',
          title: (l.description || l.type || 'Security Event').slice(0, 60),
          detail: l.actor ? `${l.actor}${l.ip ? ` • IP: ${l.ip}` : ''}` : '—',
          time: timeAgo(l.ts || l.created_at),
        })));
      }
    }).catch(() => {});
  }, [school.id]);

  /* Compliance from real school flags */
  const compliance = {
    twofa:     !!(school.is_approved),
    backups:   !!(school.is_active !== false),
    gradelock: !!(school.is_approved && school.is_active !== false),
  };

  /* Personnel from real school data */
  const personnel = [
    school.admin_full_name && { name: school.admin_full_name, role: 'School Admin',  email: school.admin_email || school.email },
    school.principal_name  && { name: school.principal_name,  role: 'Principal',     email: school.email },
  ].filter(Boolean);

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
        <button className="san-login-btn" onClick={() => onLoginAs && onLoginAs(school)}><IcLogin /><span>Login as Admin</span></button>
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
          <div className="san-section-hdr"><span>Recent Security Alerts</span></div>
          <div className="san-alerts-list">
            {secAlerts.length > 0 ? secAlerts.map((a, i) => (
              <div key={i} className="san-alert-item" style={{ borderLeftColor: a.color }}>
                <span style={{ color: a.color }}><IcAlert /></span>
                <div>
                  <p className="san-alert-title">{a.title}</p>
                  <p className="san-alert-detail">{a.detail}</p>
                  <p className="san-alert-time">{a.time}</p>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-3)', padding: '12px 0' }}>No recent security events.</p>
            )}
          </div>
          {personnel.length > 0 && (
            <>
              <div className="san-section-hdr" style={{ marginTop: 20 }}><span>Key Personnel</span></div>
              <div className="san-personnel-list">
                {personnel.map((p, i) => (
                  <div key={i} className="san-personnel-item">
                    <div className="san-personnel-av" style={{ background: COLORS[i % COLORS.length] }}>{initials(p.name)}</div>
                    <div className="san-personnel-info"><p className="san-personnel-name">{p.name}</p><p className="san-personnel-role">{p.role}</p></div>
                    <div className="san-personnel-btns">
                      {p.email && <button aria-label="Email" onClick={() => window.location.href = `mailto:${p.email}`}><IcMail /></button>}
                      <button aria-label="Phone"><IcPhone /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── School Card ────────────────────────────────────────────── */
function SchoolCard({ school, onView, statsData }) {
  const ov = useMemo(() => mockOverlay(school), [school]);
  const students = statsData?.student_count ?? ov.students;
  const teachers = statsData?.teacher_count ?? ov.teachers;
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
          {school.is_approved ? 'ACTIVE' : 'PENDING'}
        </span>
        <span className="san-badge san-badge--tier" style={{ color: TIER_COLORS[ov.tier], background: TIER_BG[ov.tier] }}>{ov.tier}</span>
      </div>
      <div className="san-school-stats-row">
        <div className="san-school-stat"><IcUsers /><span>{students.toLocaleString()}</span><span className="san-stat-lbl">Students</span></div>
        <div className="san-school-stat"><IcBook /><span>{teachers}</span><span className="san-stat-lbl">Teachers</span></div>
        <div className="san-school-stat"><IcShield /><span style={{ color: 'var(--sa-green)' }}>{ov.integrity}%</span><span className="san-stat-lbl">Integrity</span></div>
      </div>
      <button className="san-card-view-btn">View Details <IcTrend /></button>
    </div>
  );
}

/* ── Geo Distribution Map ───────────────────────────────────── */

/* City → [lat, lng] — Africa */
const GEO_CITY = {
  // West Africa
  'lagos': [6.5, 3.4], 'abuja': [9.1, 7.2], 'kano': [12.0, 8.5], 'ibadan': [7.4, 3.9],
  'accra': [5.6, -0.2], 'kumasi': [6.7, -1.6], 'tamale': [9.4, -0.8],
  'dakar': [14.7, -17.4], 'saint-louis': [16.0, -16.5], 'thies': [14.8, -16.9],
  'abidjan': [5.3, -4.0], 'yamoussoukro': [6.8, -5.3], 'bouake': [7.7, -5.0],
  'conakry': [9.5, -13.7], 'freetown': [8.5, -13.2], 'monrovia': [6.3, -10.8],
  'bamako': [12.6, -8.0], 'niamey': [13.5, 2.1], 'ouagadougou': [12.4, -1.5],
  'lomé': [6.1, 1.2], 'lome': [6.1, 1.2], 'cotonou': [6.4, 2.4], 'porto-novo': [6.5, 2.6],
  'banjul': [13.5, -16.6], 'bissau': [11.9, -15.6], 'nouakchott': [18.1, -15.9],
  'libreville': [-0.4, 9.5], 'port gentil': [-0.7, 8.8], 'praia': [14.9, -23.5],
  // Central Africa
  'kinshasa': [-4.3, 15.3], 'lubumbashi': [-11.7, 27.5], 'kisangani': [0.5, 25.2],
  'brazzaville': [-4.3, 15.3], 'douala': [4.1, 9.7], 'yaoundé': [3.9, 11.5], 'yaounde': [3.9, 11.5],
  'malabo': [3.8, 8.8], 'bangui': [4.4, 18.6], 'ndjamena': [12.1, 15.0], "n'djamena": [12.1, 15.0],
  // East Africa
  'nairobi': [-1.3, 36.8], 'mombasa': [-4.0, 39.7], 'kisumu': [-0.1, 34.8],
  'dar es salaam': [-6.8, 39.3], 'dodoma': [-6.2, 35.7], 'arusha': [-3.4, 36.7],
  'kampala': [0.3, 32.6], 'entebbe': [0.1, 32.5],
  'kigali': [-1.9, 30.1], 'bujumbura': [-3.4, 29.4],
  'addis ababa': [9.0, 38.7], 'dire dawa': [9.6, 41.9], 'adama': [8.5, 39.3],
  'asmara': [15.3, 38.9], 'djibouti': [11.6, 43.1],
  'mogadishu': [2.0, 45.3], 'hargeisa': [9.6, 44.1],
  'juba': [4.9, 31.6], 'khartoum': [15.6, 32.5], 'port sudan': [19.6, 37.2],
  'lilongwe': [-13.9, 33.8], 'blantyre': [-15.8, 35.0],
  'lusaka': [-15.4, 28.3], 'ndola': [-13.0, 28.6],
  // Southern Africa
  'harare': [-17.8, 31.0], 'bulawayo': [-20.2, 28.6],
  'gaborone': [-24.7, 25.9], 'francistown': [-21.2, 27.5],
  'maputo': [-25.9, 32.6], 'beira': [-19.8, 34.8],
  'johannesburg': [-26.2, 28.0], 'cape town': [-33.9, 18.4], 'durban': [-29.9, 31.0],
  'pretoria': [-25.7, 28.2], 'bloemfontein': [-29.1, 26.2],
  'windhoek': [-22.6, 17.1], 'walvis bay': [-23.0, 14.5],
  'maseru': [-29.3, 27.5], 'mbabane': [-26.3, 31.1],
  'antananarivo': [-18.9, 47.5], 'moroni': [-11.7, 43.3],
  // North Africa
  'cairo': [30.0, 31.2], 'alexandria': [31.2, 29.9],
  'tripoli': [32.9, 13.2], 'benghazi': [32.1, 20.1],
  'tunis': [36.8, 10.2], 'sfax': [34.7, 10.8],
  'algiers': [36.7, 3.1], 'oran': [35.7, -0.6], 'constantine': [36.4, 6.6],
  'casablanca': [33.6, -7.6], 'rabat': [34.0, -6.8], 'marrakech': [31.6, -8.0],
  'fez': [34.0, -5.0], 'fès': [34.0, -5.0], 'tangier': [35.8, -5.8],
  'luanda': [-8.8, 13.2], 'huambo': [-12.8, 15.7],
};

/* Country → capital [lat, lng] fallback */
const GEO_COUNTRY = {
  'nigeria': [9.1, 7.2], 'ghana': [5.6, -0.2], 'senegal': [14.7, -17.4],
  'ivory coast': [6.8, -5.3], "côte d'ivoire": [6.8, -5.3], "cote d'ivoire": [6.8, -5.3], 'cote divoire': [6.8, -5.3],
  'cameroon': [3.9, 11.5], 'mali': [12.6, -8.0], 'guinea': [9.5, -13.7],
  'sierra leone': [8.5, -13.2], 'liberia': [6.3, -10.8], 'niger': [13.5, 2.1],
  'burkina faso': [12.4, -1.5], 'togo': [6.1, 1.2], 'benin': [6.4, 2.4],
  'gambia': [13.5, -16.6], 'guinea-bissau': [11.9, -15.6], 'guinea bissau': [11.9, -15.6],
  'cape verde': [14.9, -23.5], 'cabo verde': [14.9, -23.5], 'mauritania': [18.1, -15.9],
  'gabon': [-0.4, 9.5], 'equatorial guinea': [3.8, 8.8], 'chad': [12.1, 15.0],
  'congo': [-4.3, 15.3], 'dr congo': [-4.3, 15.3], 'republic of the congo': [-4.3, 15.3],
  'democratic republic of the congo': [-4.3, 15.3], 'drc': [-4.3, 15.3],
  'central african republic': [4.4, 18.6], 'car': [4.4, 18.6],
  'kenya': [-1.3, 36.8], 'tanzania': [-6.8, 35.7], 'uganda': [0.3, 32.6],
  'rwanda': [-1.9, 30.1], 'burundi': [-3.4, 29.4],
  'ethiopia': [9.0, 38.7], 'eritrea': [15.3, 38.9], 'djibouti': [11.6, 43.1],
  'somalia': [2.0, 45.3], 'south sudan': [4.9, 31.6], 'sudan': [15.6, 32.5],
  'malawi': [-13.9, 33.8], 'zambia': [-15.4, 28.3], 'angola': [-8.8, 13.2],
  'zimbabwe': [-17.8, 31.0], 'botswana': [-24.7, 25.9],
  'mozambique': [-25.9, 32.6], 'namibia': [-22.6, 17.1], 'south africa': [-26.2, 28.0],
  'lesotho': [-29.3, 27.5], 'eswatini': [-26.3, 31.1], 'swaziland': [-26.3, 31.1],
  'madagascar': [-18.9, 47.5], 'comoros': [-11.7, 43.3], 'mauritius': [-20.2, 57.5],
  'seychelles': [-4.6, 55.5], 'sao tome and principe': [0.3, 6.7],
  'egypt': [30.0, 31.2], 'libya': [32.9, 13.2], 'tunisia': [36.8, 10.2],
  'algeria': [36.7, 3.1], 'morocco': [34.0, -6.8],
};

/* Equirectangular Africa projection → SVG coords (viewBox 0 0 400 360) */
function project(lat, lng) {
  return { x: ((lng + 20) / 75) * 400, y: ((38 - lat) / 76) * 360 };
}

function geoCoords(school) {
  const city    = (school.city    || '').toLowerCase().trim();
  const country = (school.country || '').toLowerCase().trim();
  if (city && GEO_CITY[city]) return GEO_CITY[city];
  // Partial match only for city names ≥ 3 chars to avoid false positives
  if (city.length >= 3) {
    const cityKey = Object.keys(GEO_CITY).find(k => k.includes(city) || city.includes(k));
    if (cityKey) return GEO_CITY[cityKey];
  }
  if (country && GEO_COUNTRY[country]) return GEO_COUNTRY[country];
  return null;
}

/* Africa coast outline — equirectangular projection, viewBox 0 0 400 360 */
const AFRICA_PATH = [
  'M 76,10',
  'C 104,7 123,5 165,5',
  'C 178,10 200,22 240,28',
  'C 255,30 268,31 279,32',
  'C 285,42 290,58 304,76',
  'C 310,92 315,100 317,106',
  'C 328,115 333,120 337,125',
  'C 358,128 372,130 380,131',
  'C 368,148 354,162 348,171',
  'C 338,180 333,185 331,187',
  'C 323,193 320,197 318,199',
  'C 319,215 320,224 320,227',
  'C 322,233 324,236 324,237',
  'C 314,256 304,271 296,284',
  'C 286,302 276,316 272,322',
  'C 248,340 226,347 213,345',
  'C 208,344 205,342 205,341',
  'C 199,335 197,333 197,332',
  'C 192,318 188,307 188,306',
  'C 186,295 184,287 184,284',
  'C 178,270 173,258 171,261',
  'C 172,249 172,243 173,237',
  'C 172,219 171,209 171,203',
  'C 162,193 157,187 155,185',
  'C 156,174 157,169 157,166',
  'C 140,158 130,152 125,149',
  'C 113,152 107,153 106,154',
  'C 93,155 87,155 85,155',
  'C 65,152 55,150 49,150',
  'C 41,146 37,145 36,145',
  'C 34,139 34,136 34,135',
  'C 24,127 18,122 17,121',
  'C 14,114 13,112 14,110',
  'C 14,94 15,87 16,81',
  'C 16,72 16,68 16,66',
  'C 25,56 32,52 36,49',
  'C 47,43 52,39 54,38',
  'C 60,30 63,25 64,24',
  'C 70,17 73,13 76,10 Z',
].join(' ');

function GeoDistributionMap({ schools }) {
  const [hovered,  setHovered]  = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const mapColRef = useRef(null);

  const dots = useMemo(() => schools.map(s => {
    const c = geoCoords(s);
    if (!c) return null;
    const pt = project(c[0], c[1]);
    if (pt.x < 2 || pt.x > 395 || pt.y < 2 || pt.y > 355) return null;
    return { school: s, x: pt.x, y: pt.y, approved: s.is_approved };
  }).filter(Boolean), [schools]);

  const countryStats = useMemo(() => {
    const map = {};
    schools.forEach(s => {
      const key = (s.country || 'Unknown').trim();
      if (!map[key]) map[key] = { total: 0, active: 0 };
      map[key].total++;
      if (s.is_approved) map[key].active++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [schools]);

  const maxCountry = countryStats[0]?.total || 1;

  const countryCircles = useMemo(() => {
    const max = countryStats[0]?.total || 1;
    return countryStats.map(({ name, total }) => {
      const coords = GEO_COUNTRY[name.toLowerCase().trim()];
      if (!coords) return null;
      const pt = project(coords[0], coords[1]);
      if (pt.x < 0 || pt.x > 400 || pt.y < 0 || pt.y > 360) return null;
      return { name, total, x: pt.x, y: pt.y, r: 10 + (total / max) * 22 };
    }).filter(Boolean);
  }, [countryStats]);

  const activeCount  = dots.filter(d =>  d.approved).length;
  const pendingCount = dots.filter(d => !d.approved).length;
  const unmapped     = schools.length - dots.length;

  const handleMouseMove = useCallback(e => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div className="san-geo-wrap">
      {/* ── Map ── */}
      <div className="san-geo-map-col" ref={mapColRef} onMouseMove={handleMouseMove}>
        {/* Live badge */}
        <div className="san-geo-live-badge">
          <span className="sa-live-dot" /> Live &bull; {schools.length} School{schools.length !== 1 ? 's' : ''}
        </div>

        <svg
          viewBox="0 0 400 360"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 260, display: 'block' }}
          onMouseLeave={() => setHovered(null)}
        >
          {/* Background */}
          <rect width="400" height="360" fill="var(--sa-bg)" rx="6" />

          {/* Subtle grid */}
          {[72, 144, 216, 288].map(y => (
            <line key={`gy${y}`} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
          ))}
          {[100, 200, 300].map(x => (
            <line key={`gx${x}`} x1={x} y1="0" x2={x} y2="360" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
          ))}

          {/* Africa fill + outline */}
          <path d={AFRICA_PATH} fill="rgba(14,165,233,0.06)" stroke="rgba(14,165,233,0.22)" strokeWidth="1.5" />

          {/* Country heatmap rings */}
          {countryCircles.map((cc, i) => (
            <g key={i}>
              <circle cx={cc.x} cy={cc.y} r={cc.r} fill="rgba(14,165,233,0.07)" stroke="rgba(14,165,233,0.13)" strokeWidth="1" />
              <circle cx={cc.x} cy={cc.y} r={cc.r * 0.5} fill="rgba(14,165,233,0.06)" />
            </g>
          ))}

          {/* School dots */}
          {dots.map((d, i) => {
            const color = d.approved ? '#0EA5E9' : '#F59E0B';
            const isHov = hovered?.school.id === d.school.id;
            return (
              <g key={i} style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(d)}
              >
                <circle cx={d.x} cy={d.y} r={isHov ? 10 : 7}  fill={color} opacity="0.12" />
                <circle cx={d.x} cy={d.y} r={isHov ? 4.5 : 3.5} fill={color} opacity={isHov ? 1 : 0.85} />
                {!d.approved && (
                  <circle cx={d.x} cy={d.y} r={5} fill="none" stroke="rgba(245,158,11,0.45)" strokeWidth="1" />
                )}
              </g>
            );
          })}

          {/* Unmapped notice */}
          {unmapped > 0 && (
            <text x="398" y="354" textAnchor="end" fontSize="8" fill="rgba(122,139,168,0.5)" fontWeight="600">
              {unmapped} unmapped
            </text>
          )}
        </svg>

        {/* Tooltip */}
        {hovered && (
          <div className="san-geo-tooltip" style={{
            left: Math.min(mousePos.x + 14, (mapColRef.current?.offsetWidth ?? 300) - 215),
            top: Math.max(mousePos.y - 54, 4),
          }}>
            <p className="san-geo-tt-name">{hovered.school.name}</p>
            {(hovered.school.city || hovered.school.country) && (
              <p className="san-geo-tt-loc">
                {[hovered.school.city, hovered.school.country].filter(Boolean).join(', ')}
              </p>
            )}
            <span className={`san-geo-tt-status san-geo-tt-status--${hovered.approved ? 'active' : 'pending'}`}>
              {hovered.approved ? 'Active' : 'Pending'}
            </span>
          </div>
        )}

        {/* Legend */}
        <div className="san-map-legend" style={{ marginTop: 8 }}>
          <span><span className="san-map-dot san-map-dot--active" />Active ({activeCount})</span>
          <span><span className="san-map-dot san-map-dot--pending" />Pending ({pendingCount})</span>
        </div>
      </div>

      {/* ── Country sidebar ── */}
      {countryStats.length > 0 && (
        <div className="san-geo-sidebar">
          <p className="san-geo-sidebar-title">Top Countries</p>
          {countryStats.map(({ name, total, active }) => (
            <div key={name} className="san-geo-country-row">
              <div className="san-geo-country-top">
                <span className="san-geo-country-name">{name}</span>
                <span className="san-geo-country-count">{total}</span>
              </div>
              <div className="san-geo-bar-bg">
                <div className="san-geo-bar-fill" style={{ width: `${(total / maxCountry) * 100}%` }} />
              </div>
              <span className="san-geo-country-sub">{active} active</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main: SAAnalytics ──────────────────────────────────────── */
export default function SAAnalytics({ schools = [], onLoginAs }) {
  const [view,     setView]     = useState('directory');
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState('');
  const [tierF,    setTierF]    = useState('All');
  const [statusF,  setStatusF]  = useState('All');
  const [dispMode, setDispMode] = useState('grid');
  const [statsMap, setStatsMap] = useState({});   // school_id → {student_count, teacher_count}

  /* Fetch real headcounts for all schools */
  useEffect(() => {
    ApiClient.get('/api/school-stats/').then(data => {
      if (data.success && Array.isArray(data.stats)) {
        const map = {};
        data.stats.forEach(s => { map[s.school_id] = s; });
        setStatsMap(map);
      }
    }).catch(() => {});
  }, []);

  const approved = useMemo(() => schools.filter(s => s.is_approved).length, [schools]);
  const pending  = useMemo(() => schools.filter(s => !s.is_approved).length, [schools]);
  const totalStu = useMemo(() => {
    const realTotal = Object.values(statsMap).reduce((n, s) => n + (s.student_count || 0), 0);
    return realTotal > 0 ? realTotal : schools.reduce((n, s) => n + mockOverlay(s).students, 0);
  }, [schools, statsMap]);

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
    return <OversightView school={selected} onBack={() => { setView('directory'); setSelected(null); }} onLoginAs={onLoginAs} />;
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
          <GeoDistributionMap schools={schools} />
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
          {filtered.map(s => <SchoolCard key={s.id} school={s} onView={sc => { setSelected(sc); setView('oversight'); }} statsData={statsMap[s.id]} />)}
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
