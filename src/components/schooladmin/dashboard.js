import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SchoolAdmin.css';
import SECURITY_CONFIG from '../../config/security';
import ApiClient from '../../api/client';
import {
  GradesPage, AttendancePage, FinancePage,
  ReportsPage, MessagesPage, SecurityPage, SettingsPage,
  SyllabusPage,
} from './SchoolAdminPages';
import {
  AnalyticsPage, ExamsPage, NotificationsPage, TimetablePage, ParentsPage,
  FinanceUsersPage, PrincipalUsersPage, StudentsPage,
} from './NewPages';

/* ============================================================
   HELPERS
   ============================================================ */
/* Material Symbol icon shorthand */
const Ic = ({ name, size, className = '' }) => (
  <span
    className={`ska-icon${size ? ` ska-icon--${size}` : ''} ${className}`}
    aria-hidden="true"
  >
    {name}
  </span>
);

/* Initials avatar */
function InitialsAvatar({ name, size = 36, style = {} }) {
  const colors = ['#4d8eff','#4cd7f6','#ffb786','#4ade80','#8b5cf6','#f43f5e'];
  const color  = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const initial = name?.trim().charAt(0).toUpperCase() || 'S';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 800,
      fontSize: size * 0.38, color: '#fff', flexShrink: 0, ...style,
    }}>
      {initial}
    </div>
  );
}

/* ============================================================
   SIDEBAR NAV ITEMS
   ============================================================ */
const NAV_ITEMS = [
  { key: 'overview',      icon: 'dashboard',        label: 'Dashboard' },
  { key: 'students',      icon: 'group',            label: 'Students' },
  { key: 'teachers',      icon: 'school',           label: 'Teachers' },
  { key: 'classes',       icon: 'class',            label: 'Classes' },
  { key: 'subjects',      icon: 'menu_book',        label: 'Subjects' },
  { key: 'syllabus',      icon: 'import_contacts',  label: 'Syllabus' },
  { key: 'grades',        icon: 'grade',            label: 'Grade Management' },
  { key: 'attendance',    icon: 'event_available',  label: 'Attendance' },
  { key: 'exams',         icon: 'quiz',             label: 'Exams & Results' },
  { key: 'finance',         icon: 'payments',         label: 'Finance' },
  { key: 'finance_users',   icon: 'manage_accounts',  label: 'Finance Users' },
  { key: 'principal',       icon: 'school',           label: 'Principal' },
  { key: 'timetable',       icon: 'calendar_today',   label: 'Timetable' },
  { key: 'analytics',     icon: 'insights',         label: 'Analytics' },
  { key: 'parents',       icon: 'family_restroom',  label: 'Parents' },
  { key: 'reports',       icon: 'assessment',       label: 'Reports' },
];
const NAV_ITEMS_BOTTOM = [
  { key: 'notifications', icon: 'notifications',    label: 'Notifications' },
  { key: 'messages',      icon: 'mail',             label: 'Messages',      badge: 3 },
  { key: 'security',      icon: 'security',         label: 'Security Logs' },
  { key: 'settings',      icon: 'settings',         label: 'Settings' },
  { key: 'profile',       icon: 'account_circle',   label: 'My Profile' },
];

const MOB_NAV = [
  { key: 'overview',   icon: 'dashboard',       label: 'Home' },
  { key: 'students',   icon: 'group',           label: 'Students' },
  { key: 'grades',     icon: 'grade',           label: 'Grades' },
  { key: 'attendance', icon: 'event_available', label: 'Attend.' },
  { key: 'settings',   icon: 'settings',        label: 'More' },
];

/* ============================================================
   SIDEBAR
   ============================================================ */
function SchoolLogo({ badge, name, size = 36 }) {
  const [failed, setFailed] = useState(false);
  const initial = name?.trim().charAt(0).toUpperCase() || 'S';
  const colors  = ['#4d8eff','#4cd7f6','#ffb786','#4ade80','#8b5cf6'];
  const bg      = colors[(name?.charCodeAt(0) || 0) % colors.length];
  const url     = badge
    ? (badge.startsWith('http') ? badge : `${SECURITY_CONFIG.API_URL.replace(/\/$/, '')}${badge.startsWith('/') ? '' : '/'}${badge}`)
    : null;

  if (!url || failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 8,
        background: bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontWeight: 800,
        fontSize: size * 0.42, color: '#fff', flexShrink: 0,
      }}>{initial}</div>
    );
  }
  return (
    <img
      src={url} alt={name}
      style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  );
}

function Sidebar({ active, onNav, school, admin, isOpen, onClose, onLogout }) {
  const schoolName = school?.name || 'Your School';
  const adminName  = admin?.full_name || admin?.username || 'Administrator';

  return (
    <>
      <div
        className={`ska-sidebar-overlay${isOpen ? ' open' : ''}`}
        onClick={onClose}
      />
      <aside className={`ska-sidebar${isOpen ? ' open' : ''}`}>
        {/* Brand */}
        <div className="ska-sidebar-head">
          <div className="ska-brand">
            <SchoolLogo badge={school?.badge} name={schoolName} size={36} />
            <div>
              <div className="ska-brand-text" title={schoolName}>{schoolName}</div>
              
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="ska-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`ska-nav-btn${active === item.key ? ' active' : ''}`}
              onClick={() => { onNav(item.key); onClose(); }}
            >
              <Ic name={item.icon} />
              {item.label}
            </button>
          ))}

          <div className="ska-nav-section">
            <div className="ska-nav-section-label">System</div>
            {NAV_ITEMS_BOTTOM.map(item => (
              <button
                key={item.key}
                className={`ska-nav-btn${active === item.key ? ' active' : ''}`}
                onClick={() => { onNav(item.key); onClose(); }}
              >
                <Ic name={item.icon} />
                {item.label}
                {item.badge && (
                  <span className="ska-nav-badge">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="ska-sidebar-footer">
          <div
            className="ska-sidebar-footer-avatar"
            style={{ cursor: 'pointer' }}
            onClick={() => { onNav('profile'); onClose(); }}
            title="My Profile"
          >
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div
            className="ska-sidebar-footer-info"
            style={{ cursor: 'pointer' }}
            onClick={() => { onNav('profile'); onClose(); }}
          >
            <div className="ska-sidebar-footer-name">{adminName}</div>
            <div className="ska-sidebar-footer-role">School Admin</div>
          </div>
          <button
            className="ska-logout-btn"
            onClick={e => { e.stopPropagation(); onLogout(); }}
            title="Sign out"
            aria-label="Sign out"
          >
            <Ic name="logout" size="sm" />
            Out
          </button>
        </div>
      </aside>
    </>
  );
}

/* ============================================================
   TOPBAR
   ============================================================ */
function Topbar({ school, admin, onMenuToggle, onLogout, onNav }) {
  const adminName  = admin?.full_name || admin?.username || 'Admin';
  const adminEmail = admin?.email || '';
  const schoolName = school?.name || 'School';

  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    if (!dropOpen) return;
    function handleOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [dropOpen]);

  const go = (page) => { setDropOpen(false); onNav && onNav(page); };
  const handleLogout = () => { setDropOpen(false); onLogout(); };

  return (
    <header className="ska-topbar">
      <div className="ska-topbar-left">
        <button
          className="ska-topbar-icon-btn"
          id="ska-hamburger"
          onClick={onMenuToggle}
          aria-label="Open menu"
        >
          <Ic name="menu" />
        </button>

        <div className="ska-search">
          <Ic name="search" />
          <input
            className="ska-search-input"
            type="text"
            placeholder="Search students, teachers…"
          />
        </div>
      </div>

      <div className="ska-topbar-right">
        <button className="ska-topbar-icon-btn" aria-label="Notifications">
          <Ic name="notifications" />
          <span className="ska-topbar-notif-dot" />
        </button>
        <button className="ska-topbar-icon-btn" aria-label="Messages">
          <Ic name="mail" />
        </button>

        <div className="ska-topbar-divider" />

        {/* School logo + name */}
        <div className="ska-topbar-school" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SchoolLogo badge={school?.badge} name={schoolName} size={28} />
          <span className="ska-topbar-school-name" style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-secondary)', fontFamily: 'var(--ska-font-headline)' }}>
            {schoolName}
          </span>
        </div>

        <div className="ska-topbar-divider" />

        {/* Profile dropdown trigger */}
        <div className="ska-profile-dropdown" ref={dropRef}>
          <button
            className={`ska-topbar-profile${dropOpen ? ' active' : ''}`}
            onClick={() => setDropOpen(o => !o)}
            aria-haspopup="true"
            aria-expanded={dropOpen}
            title="Account menu"
          >
            <div className="ska-topbar-avatar">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <span className="ska-topbar-profile-name">{adminName}</span>
            <Ic name={dropOpen ? 'expand_less' : 'expand_more'} size="sm"
              style={{ color: 'var(--ska-text-3)', fontSize: 18, marginLeft: 2 }} />
          </button>

          {/* Dropdown panel */}
          {dropOpen && (
            <div className="ska-profile-drop-panel" role="menu">
              {/* Identity header */}
              <div className="ska-profile-drop-head">
                <div className="ska-profile-drop-avatar">
                  {adminName.charAt(0).toUpperCase()}
                </div>
                <div className="ska-profile-drop-info">
                  <div className="ska-profile-drop-name">{adminName}</div>
                  {adminEmail && (
                    <div className="ska-profile-drop-email">{adminEmail}</div>
                  )}
                  <span className="ska-badge" style={{ marginTop: 4, fontSize: '0.6rem', padding: '2px 7px', background: 'var(--ska-primary-dim)', color: 'var(--ska-primary)' }}>
                    School Admin
                  </span>
                </div>
              </div>

              <div className="ska-profile-drop-divider" />

              {/* Menu items */}
              <button className="ska-profile-drop-item" role="menuitem" onClick={() => go('profile')}>
                <Ic name="account_circle" size="sm" />
                View Profile
              </button>
              <button className="ska-profile-drop-item" role="menuitem" onClick={() => go('settings')}>
                <Ic name="settings" size="sm" />
                Settings
              </button>
              <button className="ska-profile-drop-item" role="menuitem" onClick={() => go('security')}>
                <Ic name="security" size="sm" />
                Security Logs
              </button>

              <div className="ska-profile-drop-divider" />

              <button className="ska-profile-drop-item ska-profile-drop-item--danger" role="menuitem" onClick={handleLogout}>
                <Ic name="logout" size="sm" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   OVERVIEW PAGE — Main Dashboard Content
   ============================================================ */
function OverviewPage({ stats, school }) {
  const {
    totalStudents = 0, totalTeachers = 0, activeClasses = 0,
    attendanceRate = 0, avgPerformance = 0, pendingActions = 0,
    feesCollected = 0, feesOutstanding = 0,
  } = stats;

  const metrics = [
    {
      label: 'Total Students', value: totalStudents.toLocaleString(),
      icon: 'group', iconBg: 'var(--ska-primary-dim)', iconColor: 'var(--ska-primary)',
      trend: '+5%', trendDir: 'up', desc: 'Enrolled this term',
    },
    {
      label: 'Total Teachers', value: totalTeachers.toLocaleString(),
      icon: 'school', iconBg: 'var(--ska-secondary-dim)', iconColor: 'var(--ska-secondary)',
      trend: '+2%', trendDir: 'up', desc: 'Active staff members',
    },
    {
      label: 'Active Classes', value: activeClasses.toLocaleString(),
      icon: 'class', iconBg: 'var(--ska-tertiary-dim)', iconColor: 'var(--ska-tertiary)',
      trend: null, trendDir: 'flat', desc: 'Running this term',
    },
    {
      label: 'Attendance Today', value: `${attendanceRate}%`,
      icon: 'event_available', iconBg: attendanceRate >= 90 ? 'var(--ska-green-dim)' : 'var(--ska-error-dim)',
      iconColor: attendanceRate >= 90 ? 'var(--ska-green)' : 'var(--ska-error)',
      trend: attendanceRate >= 90 ? '+1%' : '-2%',
      trendDir: attendanceRate >= 90 ? 'up' : 'down',
      desc: 'School-wide today',
    },
    {
      label: 'Avg Performance', value: avgPerformance ? `${avgPerformance}%` : '—',
      icon: 'trending_up', iconBg: 'var(--ska-primary-dim)', iconColor: 'var(--ska-primary)',
      trend: '+3%', trendDir: 'up', desc: 'Academic average',
    },
    {
      label: 'Pending Actions', value: pendingActions.toLocaleString(),
      icon: 'pending_actions', iconBg: pendingActions > 0 ? 'var(--ska-tertiary-dim)' : 'var(--ska-green-dim)',
      iconColor: pendingActions > 0 ? 'var(--ska-tertiary)' : 'var(--ska-green)',
      trend: null, trendDir: 'flat', desc: 'Require your review',
    },
  ];

  /* Enrollment bar chart data (placeholder — 12 classes) */
  const ENROLLMENT_BARS = [
    { label: 'C1', pct: 40 }, { label: 'C2', pct: 55 }, { label: 'C3', pct: 65 },
    { label: 'C4', pct: 85 }, { label: 'C5', pct: 75 }, { label: 'C6', pct: 95 },
    { label: 'C7', pct: 60 }, { label: 'C8', pct: 50 }, { label: 'C9', pct: 70 },
    { label: 'C10', pct: 80 }, { label: 'C11', pct: 90 }, { label: 'C12', pct: 100 },
  ];

  /* Weekly attendance SVG line */
  const ATT_POINTS = [
    { x: 0,   y: 80 }, { x: 50,  y: 70 }, { x: 100, y: 75 },
    { x: 150, y: 40 }, { x: 200, y: 55 }, { x: 250, y: 20 },
  ];
  const pathD = ATT_POINTS.map((p, i) =>
    i === 0 ? `M${p.x},${p.y}` :
    `Q${ATT_POINTS[i-1].x + 25},${ATT_POINTS[i-1].y} ${p.x},${p.y}`
  ).join(' ');

  /* Class performance */
  const CLASS_PERF = [
    { label: '10-A (Science)',    pct: 92, color: 'var(--ska-primary)' },
    { label: '10-B (Commerce)',   pct: 78, color: 'var(--ska-secondary)' },
    { label: '11-A (Humanities)', pct: 85, color: 'var(--ska-tertiary)' },
    { label: '9-C (General)',     pct: 71, color: 'var(--ska-green)' },
  ];

  /* Finance mini bars */
  const FIN_BARS = [
    { pct: 40 }, { pct: 60 }, { pct: 80, active: true }, { pct: 55 }, { pct: 90, active: true },
  ];

  /* Recent activities */
  const ACTIVITIES = [
    {
      icon: 'grade', iconBg: 'var(--ska-primary-dim)', iconColor: 'var(--ska-primary)',
      text: <>Teacher <strong>Sarah Connor</strong> submitted final grades for <span className="ska-activity-link">Math — Class 10B</span></>,
      time: '2 hours ago',
    },
    {
      icon: 'person_add', iconBg: 'var(--ska-secondary-dim)', iconColor: 'var(--ska-secondary)',
      text: <>New student registration: <strong>James Wilson</strong> joined Class 7A</>,
      time: '5 hours ago',
    },
    {
      icon: 'playlist_add_check', iconBg: 'var(--ska-tertiary-dim)', iconColor: 'var(--ska-tertiary)',
      text: <>Daily attendance report submitted for all <strong>Primary sections</strong></>,
      time: '09:15 AM',
    },
    {
      icon: 'mail', iconBg: 'var(--ska-green-dim)', iconColor: 'var(--ska-green)',
      text: <>Parent <strong>Mrs. Kamara</strong> sent a message about student <span className="ska-activity-link">Aisha Kamara</span></>,
      time: 'Yesterday',
    },
  ];

  /* Pending actions */
  const PENDING = [
    {
      icon: 'rule', iconBg: 'var(--ska-error-dim)', iconColor: 'var(--ska-error)',
      title: 'Grade Approval Required', sub: 'Mid-term Results: Class 12C',
    },
    {
      icon: 'assignment_ind', iconBg: 'var(--ska-primary-dim)', iconColor: 'var(--ska-primary)',
      title: 'Teacher Assignment', sub: 'Substitution: Physics Lab',
    },
    {
      icon: 'person_add', iconBg: 'var(--ska-secondary-dim)', iconColor: 'var(--ska-secondary)',
      title: 'New Student Registration', sub: 'Review: 3 pending applications',
    },
  ];

  /* Quick actions */
  const QUICK = [
    { icon: 'person_add',  label: 'Add Student',      variant: '' },
    { icon: 'group_add',   label: 'Add Teacher',      variant: '--cyan' },
    { icon: 'add_box',     label: 'Create Class',     variant: '--orange' },
    { icon: 'book',        label: 'Assign Subject',   variant: '' },
    { icon: 'analytics',   label: 'Generate Report',  variant: '' },
    { icon: 'campaign',    label: 'Announcement',     variant: '--cyan' },
  ];

  return (
    <div className="ska-content">
      {/* Page header */}
      <div className="ska-page-head">
        <h1 className="ska-page-title">Dashboard</h1>
        <p className="ska-page-sub">{school?.name ? `${school.name} — operations overview` : 'School operations overview'}</p>
      </div>

      {/* ── Metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}
           className="ska-metrics-grid-6">
        {metrics.map((m, i) => (
          <div key={i} className="ska-metric-card">
            <div className="ska-metric-top">
              <div className="ska-metric-icon" style={{ background: m.iconBg }}>
                <Ic name={m.icon} style={{ color: m.iconColor }} />
              </div>
              {m.trend && (
                <span className={`ska-metric-trend ska-metric-trend--${m.trendDir}`}>
                  {m.trendDir === 'up' ? '↑' : '↓'} {m.trend}
                </span>
              )}
            </div>
            <p className="ska-metric-label">{m.label}</p>
            <p className="ska-metric-value">{m.value}</p>
            <p className="ska-metric-desc">{m.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Analytics row ── */}
      <div className="ska-analytics-grid">
        {/* Enrollment distribution */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h2 className="ska-card-title">Enrollment Distribution</h2>
            <select className="ska-chart-select" aria-label="Academic year">
              <option>Academic Year 2024–25</option>
            </select>
          </div>
          <div className="ska-bar-chart">
            {ENROLLMENT_BARS.map((b, i) => (
              <div key={i} className="ska-bar-col">
                <div className="ska-bar" style={{ height: `${b.pct}%` }} title={b.label} />
                <span className="ska-bar-label">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly attendance trend */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h2 className="ska-card-title">Weekly Attendance</h2>
          </div>
          <div className="ska-line-chart-wrap">
            <svg viewBox="0 0 250 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="ska-grad-att" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#4cd7f6" />
                  <stop offset="100%" stopColor="#03b5d3" />
                </linearGradient>
                <linearGradient id="ska-grad-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%"   stopColor="#4cd7f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#4cd7f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* fill area */}
              <path
                d={`${pathD} L250,100 L0,100 Z`}
                fill="url(#ska-grad-fill)"
              />
              {/* line */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#ska-grad-att)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* dots */}
              {ATT_POINTS.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill="#4cd7f6"
                  style={{ filter: 'drop-shadow(0 0 4px #4cd7f6)' }} />
              ))}
            </svg>
          </div>
          <div className="ska-chart-x-labels">
            {['MON','TUE','WED','THU','FRI','SAT'].map(d => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Academic performance + Finance ── */}
      <div className="ska-academic-grid">
        {/* Class comparison */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h2 className="ska-card-title">Class Performance</h2>
            <span className="ska-badge ska-badge--cyan">This Term</span>
          </div>
          <div className="ska-progress-list">
            {CLASS_PERF.map((c, i) => (
              <div key={i}>
                <div className="ska-progress-item-labels">
                  <span>{c.label}</span>
                  <span>{c.pct}%</span>
                </div>
                <div className="ska-progress-track">
                  <div
                    className="ska-progress-fill"
                    style={{ width: `${c.pct}%`, background: c.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject performance donut */}
        <div className="ska-card ska-card-pad" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="ska-card-head">
            <h2 className="ska-card-title">Subject Performance</h2>
          </div>
          <div className="ska-donut-wrap" style={{ flex: 1, justifyContent: 'center' }}>
            <div className="ska-donut-svg-wrap">
              <svg viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="transparent"
                  stroke="var(--ska-surface-low)" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="transparent"
                  stroke="var(--ska-primary)" strokeWidth="3"
                  strokeDasharray="88 100" strokeLinecap="round" />
              </svg>
              <div className="ska-donut-center">
                <span className="ska-donut-value">88</span>
                <span className="ska-donut-sub">Avg Score</span>
              </div>
            </div>
            <div className="ska-donut-legend">
              {[
                { label: 'Mathematics', color: 'var(--ska-primary)' },
                { label: 'Science',     color: 'var(--ska-secondary)' },
                { label: 'English',     color: 'var(--ska-tertiary)' },
                { label: 'History',     color: 'var(--ska-green)' },
              ].map((s, i) => (
                <div key={i} className="ska-donut-legend-item">
                  <span className="ska-donut-dot" style={{ background: s.color }} />
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Financial overview */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h2 className="ska-card-title">Financial Overview</h2>
          </div>
          <div className="ska-finance-row">
            <div>
              <p className="ska-finance-stat-label">Fees Collected</p>
              <p className="ska-finance-stat-value" style={{ color: 'var(--ska-green)' }}>
                {feesCollected > 0 ? `$${feesCollected.toLocaleString()}` : '—'}
              </p>
            </div>
            <div>
              <p className="ska-finance-stat-label">Outstanding</p>
              <p className="ska-finance-stat-value" style={{ color: 'var(--ska-error)' }}>
                {feesOutstanding > 0 ? `$${feesOutstanding.toLocaleString()}` : '—'}
              </p>
            </div>
            <div>
              <p className="ska-finance-stat-label">Revenue Growth</p>
              <div className="ska-mini-bars">
                {FIN_BARS.map((b, i) => (
                  <div
                    key={i}
                    className={`ska-mini-bar${b.active ? ' ska-mini-bar--active' : ''}`}
                    style={{ height: `${b.pct}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: Activities / Pending / Quick Actions / Insights ── */}
      <div className="ska-bottom-grid">
        <div className="ska-bottom-left">
          {/* Recent Activities */}
          <div className="ska-card ska-card-pad">
            <div className="ska-card-head">
              <h2 className="ska-card-title">Recent Activities</h2>
              <button className="ska-btn ska-btn--ghost ska-btn--sm">View All</button>
            </div>
            <div className="ska-activity-list">
              {ACTIVITIES.map((a, i) => (
                <div key={i} className="ska-activity-item">
                  <div
                    className="ska-activity-icon"
                    style={{ background: a.iconBg }}
                  >
                    <Ic name={a.icon} size="sm" style={{ color: a.iconColor }} />
                  </div>
                  <div>
                    <p className="ska-activity-text">{a.text}</p>
                    <span className="ska-activity-time">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Actions */}
          <div className="ska-card ska-card-pad">
            <div className="ska-card-head">
              <h2 className="ska-card-title">Pending Actions</h2>
              {pendingActions > 0 && (
                <span className="ska-badge ska-badge--pending">{pendingActions} pending</span>
              )}
            </div>
            <div className="ska-pending-list">
              {PENDING.map((p, i) => (
                <div key={i} className="ska-pending-item">
                  <div className="ska-pending-item-left">
                    <div className="ska-pending-icon" style={{ background: p.iconBg }}>
                      <Ic name={p.icon} style={{ color: p.iconColor }} />
                    </div>
                    <div>
                      <p className="ska-pending-title">{p.title}</p>
                      <p className="ska-pending-sub">{p.sub}</p>
                    </div>
                  </div>
                  <div className="ska-pending-actions">
                    <button className="ska-btn ska-btn--ghost ska-btn--sm">Reject</button>
                    <button className="ska-btn ska-btn--primary ska-btn--sm">Approve</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Actions */}
          <div className="ska-card ska-card-pad">
            <div className="ska-card-head">
              <h2 className="ska-card-title">Quick Actions</h2>
            </div>
            <div className="ska-quick-grid">
              {QUICK.map((q, i) => (
                <button key={i} className={`ska-quick-btn${q.variant}`}>
                  <Ic name={q.icon} className="ska-quick-icon" />
                  <span className="ska-quick-label">{q.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Smart Insights */}
          <div className="ska-insights-card">
            <span className="ska-insights-bg-icon ska-icon" aria-hidden="true">lightbulb</span>
            <h2 className="ska-insights-title">
              <Ic name="auto_awesome" />
              Smart Insights
            </h2>
            <div className="ska-insight-alert ska-insight-alert--error">
              <p className="ska-insight-alert-title">Academic Risk Alert</p>
              <p className="ska-insight-alert-desc">
                3 students in Class 10B are performing 25% below the class average. Immediate review recommended.
              </p>
            </div>
            <div className="ska-insight-alert ska-insight-alert--warn">
              <p className="ska-insight-alert-title">Attendance Drop</p>
              <p className="ska-insight-alert-desc">
                Attendance in Class 9B dropped 12% this week. Correlated with reported illness cases.
              </p>
            </div>
            <div className="ska-insight-alert ska-insight-alert--info">
              <p className="ska-insight-alert-title">Fee Collection</p>
              <p className="ska-insight-alert-desc">
                15 students have outstanding fees past the due date. Send reminder notifications.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="ska-footer">
        <span>© {new Date().getFullYear()} {school?.name || 'School'} — Powered by EK-SMS</span>
        <div className="ska-footer-links">
          <a href="#privacy">Privacy</a>
          <a href="#support">Support</a>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
   MODAL — generic slide-in form dialog
   ============================================================ */
function Modal({ title, onClose, children }) {
  return (
    <div className="ska-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ska-modal">
        <div className="ska-modal-head">
          <h2 className="ska-modal-title">{title}</h2>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>
        <div className="ska-modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ============================================================
   TEACHERS PAGE
   ============================================================ */
function TeachersPage({ school }) {
  const [teachers,    setTeachers]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [modal,       setModal]       = useState(null);
  const [form,        setForm]        = useState({});
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [viewTeacher, setViewTeacher] = useState(null); // null | teacher-object (profile view)

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const data   = await ApiClient.get(`/api/school/teachers/${params}`);
      setTeachers(data.teachers || []);
    } catch { setTeachers([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm({ first_name: '', last_name: '', email: '', employee_id: '', phone_number: '', qualification: '' });
    setError(''); setModal('add');
  };
  const openEdit = t => {
    setForm({ first_name: t.first_name, last_name: t.last_name, email: t.email,
      employee_id: t.employee_id, phone_number: t.phone_number || '', qualification: t.qualification || '' });
    setError(''); setModal(t);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (modal === 'add') {
        await ApiClient.post('/api/school/teachers/', form);
      } else {
        await ApiClient.put(`/api/school/teachers/${modal.id}/`, form);
      }
      setModal(null); load(search);
    } catch (e) { setError(e.message || 'Failed to save.'); }
    setSaving(false);
  };

  const handleDelete = async id => {
    if (!window.confirm('Remove this teacher?')) return;
    try { await ApiClient.delete(`/api/school/teachers/${id}/`); load(search); }
    catch (e) { alert(e.message || 'Failed to remove.'); }
  };

  /* ── Teacher Profile View ── */
  if (viewTeacher) {
    const t = viewTeacher;
    const infoRows = [
      { icon: 'badge',          label: 'Employee ID',  value: t.employee_id || '—' },
      { icon: 'school',         label: 'Qualification', value: t.qualification || '—' },
      { icon: 'mail',           label: 'Email',         value: t.email || '—' },
      { icon: 'phone',          label: 'Phone',         value: t.phone_number || '—' },
      { icon: 'calendar_today', label: 'Hire Date',     value: t.hire_date ? new Date(t.hire_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
    ];
    return (
      <div className="ska-content">
        <div className="ska-page-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="ska-btn ska-btn--ghost" onClick={() => setViewTeacher(null)}>
              <Ic name="arrow_back" size="sm" /> Back
            </button>
            <div>
              <h1 className="ska-page-title">Teacher Profile</h1>
              <p className="ska-page-sub">{school?.name}</p>
            </div>
          </div>
          <button className="ska-btn ska-btn--ghost" onClick={() => { setViewTeacher(null); openEdit(t); }}>
            <Ic name="edit" size="sm" /> Edit
          </button>
        </div>

        {/* Profile header */}
        <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: 'var(--ska-secondary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: '1.75rem', color: 'var(--ska-secondary)',
            }}>
              {t.first_name?.[0]?.toUpperCase() || '?'}{t.last_name?.[0]?.toUpperCase() || ''}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--ska-text)' }}>{t.full_name}</h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span className="ska-badge ska-badge--cyan">{t.employee_id}</span>
                {t.qualification && <span className="ska-badge ska-badge--primary">{t.qualification}</span>}
                <span className="ska-badge ska-badge--green">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="ska-split-grid">
          <div className="ska-card ska-card-pad">
            <h2 className="ska-card-title" style={{ marginBottom: 16 }}>Staff Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {infoRows.map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, background: 'var(--ska-secondary-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Ic name={row.icon} size="sm" style={{ color: 'var(--ska-secondary)' }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.label}</p>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--ska-text)' }}>{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="ska-card ska-card-pad">
              <h2 className="ska-card-title" style={{ marginBottom: 16 }}>Teaching Assignment</h2>
              <div className="ska-empty" style={{ padding: '20px 0' }}>
                <Ic name="class" size="lg" style={{ color: 'var(--ska-text-3)', marginBottom: 8 }} />
                <p className="ska-empty-desc">Class and subject assignments coming soon.</p>
              </div>
            </div>
            <div className="ska-card ska-card-pad">
              <h2 className="ska-card-title" style={{ marginBottom: 12 }}>Quick Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="ska-btn ska-btn--ghost" style={{ justifyContent: 'flex-start', gap: 10 }}
                  onClick={() => { setViewTeacher(null); openEdit(t); }}>
                  <Ic name="edit" size="sm" /> Edit Teacher Details
                </button>
                <button className="ska-btn ska-btn--ghost" style={{ justifyContent: 'flex-start', gap: 10 }}
                  onClick={() => setViewTeacher(null)}>
                  <Ic name="arrow_back" size="sm" /> Back to Teachers List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Teachers</h1>
          <p className="ska-page-sub">{school?.name} — {teachers.length} staff members</p>
        </div>
        <button className="ska-btn ska-btn--primary" onClick={openAdd}>
          <Ic name="group_add" size="sm" /> Add Teacher
        </button>
      </div>

      <div className="ska-search ska-toolbar-search" style={{ marginBottom: 16 }}>
        <Ic name="search" />
        <input className="ska-search-input" placeholder="Search by name or employee ID…"
          value={search}
          onChange={e => { setSearch(e.target.value); load(e.target.value); }} />
      </div>

      <div className="ska-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
        ) : teachers.length === 0 ? (
          <div className="ska-empty">
            <Ic name="school" size="xl" style={{ color: 'var(--ska-secondary)', marginBottom: 12 }} />
            <p className="ska-empty-title">No teachers yet</p>
            <p className="ska-empty-desc">Add your first teacher to get started.</p>
          </div>
        ) : (
          <table className="ska-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Employee ID</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Qualification</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <InitialsAvatar name={t.full_name} size={32} />
                      <span>{t.full_name}</span>
                    </div>
                  </td>
                  <td><span className="ska-badge ska-badge--cyan">{t.employee_id}</span></td>
                  <td style={{ fontSize: '0.8125rem' }}>{t.email || '—'}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{t.phone_number || '—'}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{t.qualification || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => setViewTeacher(t)} title="View Profile">
                        <Ic name="person" size="sm" />
                      </button>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => openEdit(t)}>
                        <Ic name="edit" size="sm" />
                      </button>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm ska-btn--danger" onClick={() => handleDelete(t.id)}>
                        <Ic name="delete" size="sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Teacher' : 'Edit Teacher'} onClose={() => setModal(null)}>
          {error && <p className="ska-form-error">{error}</p>}
          <div className="ska-form-grid">
            <label className="ska-form-group">
              <span>First Name *</span>
              <input className="ska-input" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Last Name *</span>
              <input className="ska-input" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Employee ID *</span>
              <input className="ska-input" value={form.employee_id} disabled={modal !== 'add'}
                onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Email</span>
              <input className="ska-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Phone</span>
              <input className="ska-input" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} />
            </label>
            <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
              <span>Qualification</span>
              <input className="ska-input" value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))} />
            </label>
          </div>
          <div className="ska-modal-actions">
            <button className="ska-btn ska-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="ska-btn ska-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : modal === 'add' ? 'Add Teacher' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   CLASSES PAGE
   ============================================================ */
function ClassesPage({ school }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await ApiClient.get('/api/school/classes/'); setClasses(d.classes || []); }
    catch { setClasses([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm({ name: '', code: '', form_number: 1, capacity: 50 }); setError(''); setModal('add'); };
  const openEdit = c => { setForm({ name: c.name, code: c.code, form_number: c.form_number, capacity: c.capacity }); setError(''); setModal(c); };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (modal === 'add') {
        await ApiClient.post('/api/school/classes/', form);
      } else {
        await ApiClient.put(`/api/school/classes/${modal.id}/`, form);
      }
      setModal(null); load();
    } catch (e) { setError(e.message || 'Failed to save.'); }
    setSaving(false);
  };

  const handleDelete = async id => {
    if (!window.confirm('Remove this class?')) return;
    try { await ApiClient.delete(`/api/school/classes/${id}/`); load(); }
    catch (e) { alert(e.message || 'Failed to remove.'); }
  };

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Classes</h1>
          <p className="ska-page-sub">{school?.name} — {classes.length} classes</p>
        </div>
        <button className="ska-btn ska-btn--primary" onClick={openAdd}>
          <Ic name="add_box" size="sm" /> Add Class
        </button>
      </div>

      <div className="ska-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
        ) : classes.length === 0 ? (
          <div className="ska-empty">
            <Ic name="class" size="xl" style={{ color: 'var(--ska-tertiary)', marginBottom: 12 }} />
            <p className="ska-empty-title">No classes yet</p>
            <p className="ska-empty-desc">Add your first class to get started.</p>
          </div>
        ) : (
          <table className="ska-table">
            <thead>
              <tr><th>Name</th><th>Code</th><th>Form</th><th>Capacity</th><th>Students</th><th></th></tr>
            </thead>
            <tbody>
              {classes.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td><span className="ska-badge ska-badge--cyan">{c.code}</span></td>
                  <td>Form {c.form_number}</td>
                  <td>{c.capacity}</td>
                  <td>
                    <span className={`ska-badge ${c.student_count >= c.capacity ? 'ska-badge--red' : 'ska-badge--green'}`}>
                      {c.student_count} / {c.capacity}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => openEdit(c)}>
                        <Ic name="edit" size="sm" />
                      </button>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm ska-btn--danger" onClick={() => handleDelete(c.id)}>
                        <Ic name="delete" size="sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Class' : 'Edit Class'} onClose={() => setModal(null)}>
          {error && <p className="ska-form-error">{error}</p>}
          <div className="ska-form-grid">
            <label className="ska-form-group">
              <span>Class Name *</span>
              <input className="ska-input" placeholder="e.g. Grade 10A" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Code *</span>
              <input className="ska-input" placeholder="e.g. G10A" value={form.code}
                disabled={modal !== 'add'}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Form / Grade Number</span>
              <input className="ska-input" type="number" min="1" value={form.form_number}
                onChange={e => setForm(f => ({ ...f, form_number: parseInt(e.target.value) || 1 }))} />
            </label>
            <label className="ska-form-group">
              <span>Capacity</span>
              <input className="ska-input" type="number" min="1" value={form.capacity}
                onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) || 50 }))} />
            </label>
          </div>
          <div className="ska-modal-actions">
            <button className="ska-btn ska-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="ska-btn ska-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : modal === 'add' ? 'Add Class' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   SUBJECTS PAGE
   ============================================================ */
function SubjectsPage({ school }) {
  const [subjects, setSubjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState({});
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await ApiClient.get('/api/school/subjects/'); setSubjects(d.subjects || []); }
    catch { setSubjects([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm({ name: '', code: '', description: '' }); setError(''); setModal('add'); };
  const openEdit = s => { setForm({ name: s.name, code: s.code, description: s.description || '' }); setError(''); setModal(s); };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (modal === 'add') {
        await ApiClient.post('/api/school/subjects/', form);
      } else {
        await ApiClient.put(`/api/school/subjects/${modal.id}/`, form);
      }
      setModal(null); load();
    } catch (e) { setError(e.message || 'Failed to save.'); }
    setSaving(false);
  };

  const handleDelete = async id => {
    if (!window.confirm('Remove this subject?')) return;
    try { await ApiClient.delete(`/api/school/subjects/${id}/`); load(); }
    catch (e) { alert(e.message || 'Failed to remove.'); }
  };

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Subjects</h1>
          <p className="ska-page-sub">{school?.name} — {subjects.length} subjects</p>
        </div>
        <button className="ska-btn ska-btn--primary" onClick={openAdd}>
          <Ic name="add" size="sm" /> Add Subject
        </button>
      </div>

      <div className="ska-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
        ) : subjects.length === 0 ? (
          <div className="ska-empty">
            <Ic name="menu_book" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
            <p className="ska-empty-title">No subjects yet</p>
            <p className="ska-empty-desc">Add your first subject to get started.</p>
          </div>
        ) : (
          <table className="ska-table">
            <thead>
              <tr><th>Subject</th><th>Code</th><th>Description</th><th></th></tr>
            </thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--ska-primary-dim)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Ic name="menu_book" size="sm" style={{ color: 'var(--ska-primary)' }} />
                      </div>
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                    </div>
                  </td>
                  <td><span className="ska-badge ska-badge--cyan">{s.code}</span></td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--ska-text-2)' }}>{s.description || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => openEdit(s)}>
                        <Ic name="edit" size="sm" />
                      </button>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm ska-btn--danger" onClick={() => handleDelete(s.id)}>
                        <Ic name="delete" size="sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Subject' : 'Edit Subject'} onClose={() => setModal(null)}>
          {error && <p className="ska-form-error">{error}</p>}
          <div className="ska-form-grid">
            <label className="ska-form-group">
              <span>Subject Name *</span>
              <input className="ska-input" placeholder="e.g. Mathematics" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Subject Code *</span>
              <input className="ska-input" placeholder="e.g. MATH101" value={form.code}
                disabled={modal !== 'add'}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            </label>
            <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
              <span>Description</span>
              <textarea className="ska-input" rows={3} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </label>
          </div>
          <div className="ska-modal-actions">
            <button className="ska-btn ska-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="ska-btn ska-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : modal === 'add' ? 'Add Subject' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   STUB PAGE — placeholder for sections not yet built
   ============================================================ */
function StubPage({ title, icon, description }) {
  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <h1 className="ska-page-title">{title}</h1>
      </div>
      <div className="ska-card" style={{ padding: 0 }}>
        <div className="ska-empty">
          <Ic name={icon} size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
          <p className="ska-empty-title">{title}</p>
          <p className="ska-empty-desc">{description || 'This section is coming soon.'}</p>
        </div>
      </div>
    </div>
  );
}

const SECTION_META = {
  grades:        { title: 'Grade Management',   icon: 'grade',            description: 'Enter, review, and lock student grades.' },
  syllabus:      { title: 'Syllabus',           icon: 'import_contacts',  description: 'Manage curriculum topics and learning objectives.' },
  attendance:    { title: 'Attendance',         icon: 'event_available',  description: 'Daily attendance tracking and reports.' },
  exams:         { title: 'Exams & Results',    icon: 'quiz',             description: 'Schedule exams and record student results.' },
  finance:        { title: 'Finance',            icon: 'payments',         description: 'Fee management and financial reports.' },
  finance_users:  { title: 'Finance Users',      icon: 'manage_accounts',  description: 'Create and manage finance staff accounts.' },
  principal:      { title: 'Principal',          icon: 'school',           description: 'Create and manage principal accounts.' },
  timetable:     { title: 'Timetable',          icon: 'calendar_today',   description: 'Auto-generate weekly class schedules.' },
  analytics:     { title: 'Smart Analytics',    icon: 'insights',         description: 'Performance insights and at-risk detection.' },
  parents:       { title: 'Parents',            icon: 'family_restroom',  description: 'Parent accounts and student links.' },
  reports:       { title: 'Reports',            icon: 'assessment',       description: 'Generate academic and administrative reports.' },
  notifications: { title: 'Notifications',      icon: 'notifications',    description: 'Send announcements to staff, students, and parents.' },
  messages:      { title: 'Messages',           icon: 'mail',             description: 'Communication centre and announcements.' },
  security:      { title: 'Security Logs',      icon: 'security',         description: 'Audit trail and system security events.' },
  settings:      { title: 'Settings',           icon: 'settings',         description: 'School configuration and preferences.' },
  profile:       { title: 'My Profile',         icon: 'account_circle',   description: 'Manage your account details and password.' },
};

/* ============================================================
   PROFILE PAGE
   ============================================================ */
function ProfilePage({ admin, school, onProfileUpdate }) {
  const [profile,   setProfile]   = useState(null);
  const [form,      setForm]      = useState({ first_name: '', last_name: '', email: '' });
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState({ type: '', text: '' }); // type: 'ok'|'err'

  const [pwForm,    setPwForm]    = useState({ current: '', next: '', confirm: '' });
  const [showPw,    setShowPw]    = useState({ current: false, next: false, confirm: false });
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwMsg,     setPwMsg]     = useState({ type: '', text: '' });

  /* Load live profile */
  useEffect(() => {
    ApiClient.get('/api/profile/')
      .then(d => {
        setProfile(d.profile);
        setForm({ first_name: d.profile.first_name, last_name: d.profile.last_name, email: d.profile.email });
      })
      .catch(() => {
        if (admin) setForm({ first_name: admin.first_name || '', last_name: admin.last_name || '', email: admin.email || '' });
      });
  }, [admin]);

  const startEdit  = () => { setMsg({ type: '', text: '' }); setEditing(true); };
  const cancelEdit = () => {
    setEditing(false);
    if (profile) setForm({ first_name: profile.first_name, last_name: profile.last_name, email: profile.email });
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setMsg({ type: 'err', text: 'First and last name are required.' }); return;
    }
    setSaving(true); setMsg({ type: '', text: '' });
    try {
      await ApiClient.patch('/api/profile/', {
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        email:      form.email.trim(),
      });
      const updated = { ...profile, ...form, full_name: `${form.first_name.trim()} ${form.last_name.trim()}` };
      setProfile(updated);
      setEditing(false);
      setMsg({ type: 'ok', text: 'Profile updated successfully.' });
      if (onProfileUpdate) onProfileUpdate(updated);
    } catch (e) { setMsg({ type: 'err', text: e.message || 'Failed to update profile.' }); }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    setPwMsg({ type: '', text: '' });
    if (!pwForm.current) { setPwMsg({ type: 'err', text: 'Enter your current password.' }); return; }
    if (pwForm.next.length < 8) { setPwMsg({ type: 'err', text: 'New password must be at least 8 characters.' }); return; }
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type: 'err', text: 'New passwords do not match.' }); return; }
    setPwSaving(true);
    try {
      await ApiClient.post('/api/change-password/', { current_password: pwForm.current, new_password: pwForm.next });
      setPwMsg({ type: 'ok', text: 'Password changed successfully.' });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (e) { setPwMsg({ type: 'err', text: e.message || 'Failed to change password.' }); }
    setPwSaving(false);
  };

  const displayName = profile?.full_name || `${form.first_name} ${form.last_name}`.trim() || admin?.username || 'Admin';
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const avatarColors = ['#4d8eff','#4cd7f6','#ffb786','#4ade80','#8b5cf6'];
  const avatarBg    = avatarColors[(displayName.charCodeAt(0) || 0) % avatarColors.length];

  const PwInput = ({ field, label }) => (
    <label className="ska-form-group">
      <span>{label}</span>
      <div style={{ position: 'relative' }}>
        <input
          className="ska-input"
          type={showPw[field] ? 'text' : 'password'}
          value={pwForm[field]}
          onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
          style={{ paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={() => setShowPw(s => ({ ...s, [field]: !s[field] }))}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 0 }}
          aria-label={showPw[field] ? 'Hide' : 'Show'}
        >
          <Ic name={showPw[field] ? 'visibility_off' : 'visibility'} size="sm" />
        </button>
      </div>
    </label>
  );

  return (
    <div className="ska-content">
      {/* Page header */}
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">My Profile</h1>
          <p className="ska-page-sub">Manage your account information and security settings</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left column: Profile Info ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Profile Header Card */}
          <div className="ska-card ska-card-pad" style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: avatarBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 28, color: '#fff', margin: '0 auto 16px',
            }}>
              {initials}
            </div>
            <h2 style={{ fontFamily: 'var(--ska-font-headline)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--ska-text)', margin: '0 0 4px' }}>
              {displayName}
            </h2>
            <p style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem', margin: '0 0 8px' }}>
              {profile?.username || admin?.username}
            </p>
            <span className="ska-badge ska-badge--cyan" style={{ fontSize: '0.75rem' }}>School Admin</span>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {school && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ska-text-2)', fontSize: '0.8125rem' }}>
                  <Ic name="school" size="sm" style={{ color: 'var(--ska-secondary)' }} />
                  {school.name}
                </div>
              )}
              {profile?.date_joined && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>
                  <Ic name="calendar_today" size="sm" />
                  Joined {new Date(profile.date_joined).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
              {profile?.last_login && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>
                  <Ic name="login" size="sm" />
                  Last login {new Date(profile.last_login).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>

          {/* School Info Card */}
          {school && (
            <div className="ska-card ska-card-pad">
              <div className="ska-card-head" style={{ marginBottom: 16 }}>
                <h2 className="ska-card-title">School Information</h2>
                <span className={`ska-badge ${school.is_approved ? 'ska-badge--green' : 'ska-badge--pending'}`}>
                  {school.is_approved ? 'Approved' : 'Pending'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: 'business',       label: 'Name',    value: school.name },
                  { icon: 'tag',            label: 'Code',    value: school.code },
                  { icon: 'mail',           label: 'Email',   value: school.email },
                  { icon: 'phone',          label: 'Phone',   value: school.phone || '—' },
                  { icon: 'location_on',    label: 'City',    value: school.city || '—' },
                  { icon: 'public',         label: 'Country', value: school.country || '—' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: 'var(--ska-surface-high)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Ic name={row.icon} size="sm" style={{ color: 'var(--ska-primary)' }} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.label}</p>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ska-text)', fontWeight: 600 }}>{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: Edit Info + Password ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Personal Information Card */}
          <div className="ska-card ska-card-pad">
            <div className="ska-card-head" style={{ marginBottom: 20 }}>
              <h2 className="ska-card-title">Personal Information</h2>
              {!editing ? (
                <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={startEdit}>
                  <Ic name="edit" size="sm" /> Edit
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={cancelEdit}>Cancel</button>
                  <button className="ska-btn ska-btn--primary ska-btn--sm" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {msg.text && (
              <div style={{
                marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: '0.8125rem',
                background: msg.type === 'ok' ? 'var(--ska-green-dim)' : 'var(--ska-error-dim)',
                color: msg.type === 'ok' ? 'var(--ska-green)' : 'var(--ska-error)',
                border: `1px solid ${msg.type === 'ok' ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Ic name={msg.type === 'ok' ? 'check_circle' : 'error'} size="sm" />
                {msg.text}
              </div>
            )}

            <div className="ska-form-grid">
              <label className="ska-form-group">
                <span>First Name</span>
                <input className="ska-input" value={form.first_name} disabled={!editing}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Last Name</span>
                <input className="ska-input" value={form.last_name} disabled={!editing}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </label>
              <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
                <span>Email Address</span>
                <input className="ska-input" type="email" value={form.email} disabled={!editing}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </label>
              <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
                <span>Username <span style={{ color: 'var(--ska-text-3)', fontSize: '0.75rem' }}>(cannot be changed)</span></span>
                <input className="ska-input" value={profile?.username || admin?.username || ''} disabled style={{ opacity: 0.5 }} readOnly />
              </label>
              <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
                <span>Role</span>
                <input className="ska-input" value="School Administrator" disabled style={{ opacity: 0.5 }} readOnly />
              </label>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="ska-card ska-card-pad">
            <div className="ska-card-head" style={{ marginBottom: 20 }}>
              <h2 className="ska-card-title">Change Password</h2>
              <Ic name="lock" size="sm" style={{ color: 'var(--ska-text-3)' }} />
            </div>

            {pwMsg.text && (
              <div style={{
                marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: '0.8125rem',
                background: pwMsg.type === 'ok' ? 'var(--ska-green-dim)' : 'var(--ska-error-dim)',
                color: pwMsg.type === 'ok' ? 'var(--ska-green)' : 'var(--ska-error)',
                border: `1px solid ${pwMsg.type === 'ok' ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Ic name={pwMsg.type === 'ok' ? 'check_circle' : 'error'} size="sm" />
                {pwMsg.text}
              </div>
            )}

            <div className="ska-form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <PwInput field="current" label="Current Password" />
              <PwInput field="next"    label="New Password" />
              <PwInput field="confirm" label="Confirm New Password" />
            </div>

            <div style={{ marginTop: 4 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', margin: '0 0 16px' }}>
                Minimum 8 characters required.
              </p>
              <button className="ska-btn ska-btn--primary" onClick={handlePasswordChange} disabled={pwSaving}
                style={{ width: '100%' }}>
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile responsive override */}
      <style>{`
        @media (max-width: 700px) {
          .ska-profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   PENDING APPROVAL STATE (school not yet approved)
   ============================================================ */
function PendingApprovalPage({ school, onLogout }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--ska-surface)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--ska-font-body)', padding: 24,
    }}>
      <div style={{
        background: 'var(--ska-surface-card)', border: '1px solid var(--ska-border)',
        borderRadius: 16, padding: '40px 32px', maxWidth: 480, width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--ska-tertiary-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Ic name="pending" size="xl" style={{ color: 'var(--ska-tertiary)' }} />
        </div>
        <h1 style={{ fontFamily: 'var(--ska-font-headline)', fontSize: '1.375rem', fontWeight: 800, color: 'var(--ska-text)', margin: '0 0 8px' }}>
          Registration Under Review
        </h1>
        <p style={{ color: 'var(--ska-text-3)', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 24px' }}>
          <strong style={{ color: 'var(--ska-text)' }}>{school?.name || 'Your school'}</strong> registration is
          pending approval from the system administrator. You'll receive access once approved.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {[
            { icon: 'check_circle', label: 'Registration submitted', done: true },
            { icon: 'hourglass_empty', label: 'Awaiting admin approval', done: false },
            { icon: 'lock_open', label: 'Dashboard access granted', done: false },
          ].map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 8,
              background: step.done ? 'var(--ska-green-dim)' : 'var(--ska-surface-low)',
              border: `1px solid ${step.done ? 'rgba(74,222,128,0.2)' : 'var(--ska-border)'}`,
            }}>
              <Ic name={step.icon} size="sm" style={{ color: step.done ? 'var(--ska-green)' : 'var(--ska-text-3)' }} />
              <span style={{ fontSize: '0.8125rem', color: step.done ? 'var(--ska-green)' : 'var(--ska-text-3)', fontWeight: 600 }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onLogout}
          className="ska-btn ska-btn--ghost"
          style={{ width: '100%' }}
        >
          <Ic name="logout" size="sm" /> Sign Out
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN SHELL — SchoolAdminDashboard
   ============================================================ */
export default function SchoolAdminDashboard({ onNavigate }) {
  const [activePage, setActivePage]   = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [school, setSchool]           = useState(null);
  const [admin, setAdmin]             = useState(null);
  const [stats, setStats]             = useState({});
  const [studentAddSignal, setStudentAddSignal] = useState(0);
  const [isApproved, setIsApproved]   = useState(null); // null = loading

  /* ── Read user + school from localStorage (set by login) ── */
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setAdmin(u);
      if (u.school) {
        setSchool(u.school);
        setIsApproved(u.school.is_approved === true);
      }
    } catch { /* ignore */ }
  }, []);

  /* ── Fetch live school info (enriches localStorage data) ── */
  const fetchSchool = useCallback(async () => {
    try {
      const data = await ApiClient.get('/api/school/info/');
      setSchool(data);
      setIsApproved(data.is_approved === true);
      /* Keep localStorage in sync so next load skips the pending-page flash */
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        if (stored.school) {
          stored.school.is_approved = data.is_approved;
          localStorage.setItem('user', JSON.stringify(stored));
        }
      } catch { /* ignore storage errors */ }
      setStats({
        totalStudents:   data.total_students   ?? 0,
        totalTeachers:   data.total_teachers   ?? 0,
        activeClasses:   data.active_classes   ?? 0,
        attendanceRate:  data.attendance_rate  ?? 0,
        avgPerformance:  data.avg_performance  ?? 0,
        pendingActions:  data.pending_actions  ?? 0,
        feesCollected:   data.fees_collected   ?? 0,
        feesOutstanding: data.fees_outstanding ?? 0,
      });
    } catch {
      /* API not yet available — localStorage data is already set above */
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u.school) {
        setSchool(u.school);
        setIsApproved(u.school.is_approved === true);
      } else if (isApproved === null) {
        setIsApproved(true);
      }
    }
  }, [isApproved]);

  useEffect(() => { fetchSchool(); }, [fetchSchool]);
  
  /* ── Apply brand colors to CSS variables ── */
  useEffect(() => {
    if (school?.brand_colors) {
      const colors = school.brand_colors.split(',').map(c => c.trim()).filter(c => c.startsWith('#'));
      if (colors.length > 0) {
        const root = document.documentElement;
        // Primary
        root.style.setProperty('--ska-primary', colors[0]);
        root.style.setProperty('--ska-primary-container', colors[0]);
        root.style.setProperty('--ska-primary-dim', `${colors[0]}1f`); // 12% opacity (0.12 * 255 = ~31 = 0x1f)
        
        // Secondary (optional)
        if (colors.length > 1) {
          root.style.setProperty('--ska-secondary', colors[1]);
          root.style.setProperty('--ska-secondary-dim', `${colors[1]}1f`);
        }
        
        // Tertiary (optional)
        if (colors.length > 2) {
          root.style.setProperty('--ska-tertiary', colors[2]);
          root.style.setProperty('--ska-tertiary-dim', `${colors[2]}1f`);
        }
      }
    }
  }, [school?.brand_colors]);

  /* ── Logout ── */
  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    if (onNavigate) onNavigate('login');
  }

  /* Show pending page if not approved */
  if (isApproved === false) {
    return <PendingApprovalPage school={school} onLogout={handleLogout} />;
  }

  /* Loading state — only shown briefly before localStorage resolves */
  if (isApproved === null) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--ska-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--ska-font-body)',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--ska-text-3)' }}>
          <Ic name="sync" size="xl" style={{ color: 'var(--ska-secondary)', display: 'block', margin: '0 auto 12px', fontSize: 40 }} />
          <p style={{ fontSize: '0.875rem' }}>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  /* Render current page content */
  const meta = SECTION_META[activePage];
  let pageContent;
  if (activePage === 'overview')        pageContent = <OverviewPage stats={stats} school={school} />;
  else if (activePage === 'students')   pageContent = <StudentsPage school={school} openAddSignal={studentAddSignal} />;
  else if (activePage === 'teachers')   pageContent = <TeachersPage school={school} />;
  else if (activePage === 'classes')    pageContent = <ClassesPage  school={school} />;
  else if (activePage === 'subjects')   pageContent = <SubjectsPage school={school} />;
  else if (activePage === 'profile')    pageContent = (
    <ProfilePage
      admin={admin}
      school={school}
      onProfileUpdate={updated => setAdmin(a => ({ ...a, ...updated }))}
    />
  );
  else if (activePage === 'syllabus')   pageContent = <SyllabusPage school={school} />;
  else if (activePage === 'grades')        pageContent = <GradesPage school={school} />;
  else if (activePage === 'attendance')    pageContent = <AttendancePage school={school} />;
  else if (activePage === 'exams')         pageContent = <ExamsPage school={school} />;
  else if (activePage === 'finance')        pageContent = <FinancePage school={school} />;
  else if (activePage === 'finance_users')  pageContent = <FinanceUsersPage school={school} admin={admin} />;
  else if (activePage === 'principal')      pageContent = <PrincipalUsersPage school={school} admin={admin} />;
  else if (activePage === 'timetable')     pageContent = <TimetablePage school={school} />;
  else if (activePage === 'analytics')     pageContent = <AnalyticsPage school={school} />;
  else if (activePage === 'parents')       pageContent = <ParentsPage school={school} />;
  else if (activePage === 'reports')       pageContent = <ReportsPage school={school} />;
  else if (activePage === 'notifications') pageContent = <NotificationsPage school={school} />;
  else if (activePage === 'messages')      pageContent = <MessagesPage school={school} admin={admin} />;
  else if (activePage === 'security')      pageContent = <SecurityPage />;
  else if (activePage === 'settings')   pageContent = (
    <SettingsPage
      school={school}
      onSchoolUpdate={updated => setSchool(s => ({ ...s, ...updated }))}
    />
  );
  else pageContent = <StubPage title={meta?.title || activePage} icon={meta?.icon || 'info'} description={meta?.description} />;

  return (
    <div className="ska-wrap">
      {/* Sidebar */}
      <Sidebar
        active={activePage}
        onNav={setActivePage}
        school={school}
        admin={admin}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main */}
      <div className="ska-main">
        {/* Topbar */}
        <Topbar
          school={school}
          admin={admin}
          onMenuToggle={() => setSidebarOpen(o => !o)}
          onLogout={handleLogout}
          onNav={setActivePage}
        />

        {/* Page content */}
        {pageContent}
      </div>

      {/* Mobile bottom nav */}
      <nav className="ska-mob-nav">
        {MOB_NAV.map(item => (
          <button
            key={item.key}
            className={`ska-mob-nav-btn${activePage === item.key ? ' active' : ''}`}
            onClick={() => setActivePage(item.key)}
          >
            <Ic name={item.icon} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* FAB */}
      {activePage === 'students' && (
        <button className="ska-fab" aria-label="Add student" onClick={() => setStudentAddSignal(signal => signal + 1)}>
          <Ic name="add" />
        </button>
      )}
    </div>
  );
}
