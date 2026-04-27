import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SchoolAdmin.css';
import SECURITY_CONFIG from '../../config/security';
import ApiClient from '../../api/client';
import {
  GradesPage, AttendancePage, FinancePage,
  ReportsPage, MessagesPage, SettingsPage,
  SyllabusPage, BursarLedgerPage, BursarAuditPage,
} from './SchoolAdminPages';
import {
  AnalyticsPage, ExamsPage, NotificationsPage, TimetablePage, ParentsPage,
  FinanceUsersPage, PrincipalUsersPage, TeachersPage,
} from './NewPages';
import { StudentsPage } from './SAstudents';
import {
  ModRequestsPage, GradingSchemePage, AcademicCalendarPage, SecurityPageEnhanced,
  GradeOversightPage, RoomsPage, ExamOfficersPage, TeacherAssignmentsPage, StudentPromotionPage,
} from './SAExtraPages';

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
  { key: 'bursar_ledger',   icon: 'account_balance',  label: 'Bursar Ledger' },
  { key: 'bursar_audit',    icon: 'policy',           label: 'Bursar Audit' },
  { key: 'finance_users',   icon: 'manage_accounts',  label: 'Finance Users' },
  { key: 'principal',       icon: 'school',           label: 'Principal' },
  { key: 'timetable',       icon: 'calendar_today',   label: 'Timetable' },
  { key: 'analytics',     icon: 'insights',         label: 'Analytics' },
  { key: 'parents',       icon: 'family_restroom',  label: 'Parents' },
  { key: 'reports',        icon: 'assessment',       label: 'Reports' },
  { key: 'grade_oversight',icon: 'checklist',        label: 'Grade Oversight' },
  { key: 'mod_requests',   icon: 'rate_review',      label: 'Mod Requests' },
  { key: 'grading_scheme', icon: 'grading',          label: 'Grading Scheme' },
  { key: 'academic_cal',   icon: 'event_note',       label: 'Academic Calendar' },
  { key: 'rooms',          icon: 'meeting_room',     label: 'Rooms' },
  { key: 'exam_officers',  icon: 'verified_user',    label: 'Exam Officers' },
  { key: 'teacher_assign', icon: 'assignment_ind',   label: 'Assignments' },
  { key: 'promotions',     icon: 'move_up',          label: 'Promotions' },
];
const NAV_ITEMS_BOTTOM = [
  { key: 'notifications', icon: 'notifications',    label: 'Notifications' },
  { key: 'messages',      icon: 'mail',             label: 'Messages' },
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
        <button className="ska-topbar-icon-btn" aria-label="Notifications" onClick={() => go('notifications')}>
          <Ic name="notifications" />
          <span className="ska-topbar-notif-dot" />
        </button>
        <button className="ska-topbar-icon-btn" aria-label="Messages" onClick={() => go('messages')}>
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
function OverviewPage({ stats, school, onNav, onAddStudent }) {
  const [classes,       setClasses]       = useState([]);
  const [years,         setYears]         = useState([]);
  const [selectedYear,  setSelectedYear]  = useState('');
  const [chartsLoading, setChartsLoading] = useState(true);

  const {
    totalStudents = 0, totalTeachers = 0, activeClasses = 0,
    attendanceRate = 0, avgPerformance = 0, pendingActions = 0,
    feesCollected = 0, feesOutstanding = 0,
  } = stats;

  useEffect(() => {
    Promise.all([
      ApiClient.get('/api/school/classes/').catch(() => ({ classes: [] })),
      ApiClient.get('/api/school/academic-years/').catch(() => ({ academic_years: [] })),
    ]).then(([classData, yearData]) => {
      setClasses(classData.classes || []);
      const yrs = yearData.academic_years || [];
      setYears(yrs);
      const active = yrs.find(y => y.is_active);
      if (active) setSelectedYear(String(active.id));
    }).finally(() => setChartsLoading(false));
  }, []);

  const metrics = [
    { label: 'Total Students',  value: totalStudents.toLocaleString(),                    icon: 'group',           iconBg: 'var(--ska-primary-dim)',    iconColor: 'var(--ska-primary)',   desc: 'Enrolled this term' },
    { label: 'Total Teachers',  value: totalTeachers.toLocaleString(),                    icon: 'school',          iconBg: 'var(--ska-secondary-dim)', iconColor: 'var(--ska-secondary)', desc: 'Active staff members' },
    { label: 'Active Classes',  value: activeClasses.toLocaleString(),                    icon: 'class',           iconBg: 'var(--ska-tertiary-dim)',  iconColor: 'var(--ska-tertiary)',  desc: 'Running this term' },
    {
      label: 'Attendance Today',
      value: attendanceRate > 0 ? `${attendanceRate}%` : '—',
      icon: 'event_available',
      iconBg:    attendanceRate >= 90 ? 'var(--ska-green-dim)'  : attendanceRate > 0 ? 'var(--ska-error-dim)'  : 'var(--ska-surface-high)',
      iconColor: attendanceRate >= 90 ? 'var(--ska-green)'      : attendanceRate > 0 ? 'var(--ska-error)'      : 'var(--ska-text-3)',
      desc: 'School-wide today',
    },
    { label: 'Avg Performance', value: avgPerformance > 0 ? `${avgPerformance}%` : '—',  icon: 'trending_up',     iconBg: 'var(--ska-primary-dim)',    iconColor: 'var(--ska-primary)',   desc: 'Academic average' },
    {
      label: 'Pending Actions',
      value: pendingActions.toLocaleString(),
      icon: 'pending_actions',
      iconBg:    pendingActions > 0 ? 'var(--ska-tertiary-dim)' : 'var(--ska-green-dim)',
      iconColor: pendingActions > 0 ? 'var(--ska-tertiary)'     : 'var(--ska-green)',
      desc: 'Require your review',
    },
  ];

  /* Real enrollment bars from API */
  const enrollmentBars = chartsLoading
    ? []
    : classes.map(c => ({
        label: c.name.length > 6 ? c.name.slice(0, 6) : c.name,
        pct:   c.capacity > 0 ? Math.min(100, Math.round((c.student_count / c.capacity) * 100)) : 0,
        title: `${c.name}: ${c.student_count} / ${c.capacity} students`,
      }));

  /* Attendance SVG derived from real attendanceRate */
  const attY = attendanceRate > 0 ? Math.max(5, Math.min(95, 100 - attendanceRate)) : 50;
  const ATT_POINTS = [
    { x: 0,   y: attY },
    { x: 50,  y: Math.max(5, attY - 5) },
    { x: 100, y: Math.min(95, attY + 3) },
    { x: 150, y: Math.max(5, attY - 2) },
    { x: 200, y: Math.min(95, attY + 4) },
    { x: 250, y: attY },
  ];
  const pathD = ATT_POINTS.map((p, i) =>
    i === 0 ? `M${p.x},${p.y}` :
    `Q${ATT_POINTS[i-1].x + 25},${ATT_POINTS[i-1].y} ${p.x},${p.y}`
  ).join(' ');

  /* Finance collection rate */
  const totalFees    = feesCollected + feesOutstanding;
  const collectedPct = totalFees > 0 ? Math.round((feesCollected / totalFees) * 100) : 0;

  /* Pending items derived from real pendingActions count */
  const pendingItems = pendingActions > 0 ? [{
    icon: 'pending_actions',
    iconBg: 'var(--ska-tertiary-dim)', iconColor: 'var(--ska-tertiary)',
    title: `${pendingActions} Action${pendingActions !== 1 ? 's' : ''} Pending`,
    sub:   'Review grade approvals, teacher assignments and more',
    navKey: 'grade_oversight',
  }] : [];

  /* Smart insights derived from real stats */
  const insights = [
    attendanceRate > 0 && attendanceRate < 85 && {
      type: 'error', title: 'Attendance Alert',
      desc: `School-wide attendance is at ${attendanceRate}% — below the recommended 85% threshold.`,
    },
    feesOutstanding > 0 && {
      type: 'warn', title: 'Outstanding Fees',
      desc: `SLL ${feesOutstanding.toLocaleString()} in fees remain uncollected. Consider sending payment reminders.`,
    },
    pendingActions > 0 && {
      type: 'info', title: 'Pending Actions',
      desc: `${pendingActions} item${pendingActions !== 1 ? 's' : ''} await your review — check Grade Oversight and Assignments.`,
    },
  ].filter(Boolean);

  /* Quick actions (nav only — no data) */
  const QUICK = [
    { icon: 'person_add',  label: 'Add Student',      variant: '',         action: () => onAddStudent?.() },
    { icon: 'group_add',   label: 'Add Teacher',      variant: '--cyan',   action: () => onNav?.('teachers') },
    { icon: 'add_box',     label: 'Create Class',     variant: '--orange', action: () => onNav?.('classes') },
    { icon: 'book',        label: 'Assign Subject',   variant: '',         action: () => onNav?.('subjects') },
    { icon: 'analytics',   label: 'Generate Report',  variant: '',         action: () => onNav?.('reports') },
    { icon: 'campaign',    label: 'Announcement',     variant: '--cyan',   action: () => onNav?.('notifications') },
  ];

  return (
    <div className="ska-content">
      {/* Page header */}
      <div className="ska-page-head">
        <h1 className="ska-page-title">Dashboard</h1>
        <p className="ska-page-sub">{school?.name ? `${school.name} — operations overview` : 'School operations overview'}</p>
      </div>

      {/* ── Metric cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}
           className="ska-metrics-grid-6">
        {metrics.map((m, i) => (
          <div key={i} className="ska-metric-card">
            <div className="ska-metric-top">
              <div className="ska-metric-icon" style={{ background: m.iconBg }}>
                <Ic name={m.icon} style={{ color: m.iconColor }} />
              </div>
            </div>
            <p className="ska-metric-label">{m.label}</p>
            <p className="ska-metric-value">{m.value}</p>
            <p className="ska-metric-desc">{m.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Analytics row ── */}
      <div className="ska-analytics-grid">
        {/* Enrollment distribution — real class data */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h2 className="ska-card-title">Enrollment Distribution</h2>
            {chartsLoading ? (
              <span style={{ height: 28, width: 120, borderRadius: 20, background: 'var(--ska-surface-high)', display: 'inline-block', animation: 'ska-pulse 1.4s ease-in-out infinite' }} />
            ) : years.length > 0 ? (
              <select className="ska-chart-select"
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                aria-label="Academic year">
                {years.map(y => (
                  <option key={y.id} value={String(y.id)}>
                    {y.name}{y.is_active ? ' ●' : ''}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          {chartsLoading ? (
            <div className="ska-bar-chart">
              {[45, 65, 55, 80, 70, 90].map((h, i) => (
                <div key={i} className="ska-bar-col">
                  <div className="ska-bar" style={{ height: `${h}%`, background: 'var(--ska-surface-high)', animation: 'ska-pulse 1.4s ease-in-out infinite' }} />
                  <span className="ska-bar-label" style={{ background: 'var(--ska-surface-high)', borderRadius: 3, width: 18, height: 8, display: 'inline-block' }} />
                </div>
              ))}
            </div>
          ) : enrollmentBars.length > 0 ? (
            <div className="ska-bar-chart">
              {enrollmentBars.map((b, i) => (
                <div key={i} className="ska-bar-col">
                  <div className="ska-bar" style={{ height: `${Math.max(b.pct, 2)}%` }} title={b.title} />
                  <span className="ska-bar-label">{b.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ska-text-3)', gap: 8 }}>
              <Ic name="class" style={{ fontSize: 28 }} />
              <p style={{ margin: 0, fontSize: '0.8125rem' }}>No classes set up yet</p>
              <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onNav?.('classes')}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Ic name="add" size="sm" /> Create First Class
              </button>
            </div>
          )}
        </div>

        {/* Attendance — derived from real attendanceRate */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h2 className="ska-card-title">Attendance Today</h2>
            {attendanceRate > 0 && (
              <span className={`ska-badge ${attendanceRate >= 90 ? 'ska-badge--green' : attendanceRate >= 75 ? 'ska-badge--cyan' : 'ska-badge--error'}`}>
                {attendanceRate}%
              </span>
            )}
          </div>
          {attendanceRate > 0 ? (
            <>
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
                  <path d={`${pathD} L250,100 L0,100 Z`} fill="url(#ska-grad-fill)" />
                  <path d={pathD} fill="none" stroke="url(#ska-grad-att)" strokeWidth="2.5" strokeLinecap="round" />
                  {ATT_POINTS.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#4cd7f6"
                      style={{ filter: 'drop-shadow(0 0 4px #4cd7f6)' }} />
                  ))}
                </svg>
              </div>
              <div className="ska-chart-x-labels">
                {['MON','TUE','WED','THU','FRI','SAT'].map(d => <span key={d}>{d}</span>)}
              </div>
            </>
          ) : (
            <div style={{ height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ska-text-3)', gap: 8 }}>
              <Ic name="event_available" style={{ fontSize: 28 }} />
              <p style={{ margin: 0, fontSize: '0.8125rem' }}>No attendance recorded today</p>
              <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onNav?.('attendance')}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Ic name="add" size="sm" /> Record Attendance
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Class enrollment + Overall performance + Finance ── */}
      <div className="ska-academic-grid">
        {/* Class enrollment — real data */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h2 className="ska-card-title">Class Enrollment</h2>
            {!chartsLoading && <span className="ska-badge ska-badge--cyan">{classes.length} Classes</span>}
          </div>
          {chartsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 34, borderRadius: 6, background: 'var(--ska-surface-high)', animation: 'ska-pulse 1.4s ease-in-out infinite' }} />)}
            </div>
          ) : classes.length > 0 ? (
            <div className="ska-progress-list">
              {classes.slice(0, 6).map((c, i) => {
                const pct = c.capacity > 0 ? Math.min(100, Math.round((c.student_count / c.capacity) * 100)) : 0;
                const clr = ['var(--ska-primary)','var(--ska-secondary)','var(--ska-tertiary)','var(--ska-green)','#f59e0b','#ec4899'];
                return (
                  <div key={c.id}>
                    <div className="ska-progress-item-labels">
                      <span>{c.name}</span>
                      <span style={{ color: 'var(--ska-text-3)', fontSize: '0.75rem' }}>{c.student_count}/{c.capacity}</span>
                    </div>
                    <div className="ska-progress-track">
                      <div className="ska-progress-fill" style={{ width: `${Math.max(pct, 1)}%`, background: clr[i % clr.length] }} />
                    </div>
                  </div>
                );
              })}
              {classes.length > 6 && (
                <button className="ska-btn ska-btn--ghost ska-btn--sm"
                  onClick={() => onNav?.('classes')}
                  style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                  View all {classes.length} classes
                </button>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--ska-text-3)' }}>
              <Ic name="class" style={{ fontSize: 28, display: 'block', margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: '0.8125rem' }}>No classes created yet</p>
            </div>
          )}
        </div>

        {/* Overall performance — real avgPerformance */}
        <div className="ska-card ska-card-pad" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="ska-card-head">
            <h2 className="ska-card-title">Overall Performance</h2>
          </div>
          <div className="ska-donut-wrap" style={{ flex: 1, justifyContent: 'center' }}>
            <div className="ska-donut-svg-wrap">
              <svg viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="transparent"
                  stroke="var(--ska-surface-low)" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="transparent"
                  stroke="var(--ska-primary)" strokeWidth="3"
                  strokeDasharray={`${avgPerformance > 0 ? avgPerformance : 0} 100`}
                  strokeLinecap="round" />
              </svg>
              <div className="ska-donut-center">
                <span className="ska-donut-value">{avgPerformance > 0 ? avgPerformance : '—'}</span>
                <span className="ska-donut-sub">{avgPerformance > 0 ? 'Avg Score' : 'No data'}</span>
              </div>
            </div>
            <div className="ska-donut-legend">
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)', textAlign: 'center' }}>
                {avgPerformance > 0
                  ? 'School average across all subjects this term'
                  : 'Enter grades in Grade Management to see performance data'}
              </p>
            </div>
          </div>
        </div>

        {/* Financial overview — real data */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h2 className="ska-card-title">Financial Overview</h2>
          </div>
          <div className="ska-finance-row">
            <div>
              <p className="ska-finance-stat-label">Fees Collected</p>
              <p className="ska-finance-stat-value" style={{ color: 'var(--ska-green)' }}>
                {feesCollected > 0 ? `SLL ${feesCollected.toLocaleString()}` : '—'}
              </p>
            </div>
            <div>
              <p className="ska-finance-stat-label">Outstanding</p>
              <p className="ska-finance-stat-value" style={{ color: 'var(--ska-error)' }}>
                {feesOutstanding > 0 ? `SLL ${feesOutstanding.toLocaleString()}` : '—'}
              </p>
            </div>
            <div>
              <p className="ska-finance-stat-label">Collection Rate</p>
              {totalFees > 0 ? (
                <div style={{ marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>Progress</span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--ska-text)' }}>{collectedPct}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--ska-surface-high)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${collectedPct}%`, background: 'var(--ska-green)', borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ) : (
                <p className="ska-finance-stat-value" style={{ color: 'var(--ska-text-3)' }}>—</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: Activities / Pending / Quick Actions / Insights ── */}
      <div className="ska-bottom-grid">
        <div className="ska-bottom-left">
          {/* Recent Activities — empty state until activity log API is built */}
          <div className="ska-card ska-card-pad">
            <div className="ska-card-head">
              <h2 className="ska-card-title">Recent Activities</h2>
              <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onNav?.('analytics')}>View All</button>
            </div>
            <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--ska-text-3)' }}>
              <Ic name="history" style={{ fontSize: 32, display: 'block', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>No recent activities</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
                Activity history will appear here as staff use the system.
              </p>
            </div>
          </div>
          {/* Pending Actions — from real pendingActions stat */}
          <div className="ska-card ska-card-pad" style={{ marginTop: 16 }}>
            <div className="ska-card-head">
              <h2 className="ska-card-title">Pending Actions</h2>
              {pendingActions > 0 && (
                <span className="ska-badge ska-badge--pending">{pendingActions} pending</span>
              )}
            </div>
            {pendingItems.length > 0 ? (
              <div className="ska-pending-list">
                {pendingItems.map((p, i) => (
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
                      <button className="ska-btn ska-btn--primary ska-btn--sm" onClick={() => onNav?.(p.navKey)}>Review</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--ska-text-3)' }}>
                <Ic name="check_circle" style={{ fontSize: 28, display: 'block', margin: '0 auto 8px', color: 'var(--ska-green)' }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--ska-green)' }}>All clear!</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>No pending actions require your attention.</p>
              </div>
            )}
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
                <button key={i} className={`ska-quick-btn${q.variant}`} onClick={q.action}>
                  <Ic name={q.icon} className="ska-quick-icon" />
                  <span className="ska-quick-label">{q.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Smart Insights — derived from real stats */}
          <div className="ska-insights-card">
            <span className="ska-insights-bg-icon ska-icon" aria-hidden="true">lightbulb</span>
            <h2 className="ska-insights-title">
              <Ic name="auto_awesome" />
              Smart Insights
            </h2>
            {insights.length > 0 ? insights.map((ins, i) => (
              <div key={i} className={`ska-insight-alert ska-insight-alert--${ins.type}`}>
                <p className="ska-insight-alert-title">{ins.title}</p>
                <p className="ska-insight-alert-desc">{ins.desc}</p>
              </div>
            )) : (
              <div className="ska-insight-alert ska-insight-alert--info">
                <p className="ska-insight-alert-title">All Systems Go</p>
                <p className="ska-insight-alert-desc">
                  Attendance and finances are on track. Keep up the great work!
                </p>
              </div>
            )}
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
  if (activePage === 'overview')        pageContent = <OverviewPage stats={stats} school={school} onNav={setActivePage} onAddStudent={() => { setActivePage('students'); setStudentAddSignal(s => s + 1); }} />;
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
  else if (activePage === 'bursar_ledger')  pageContent = <BursarLedgerPage school={school} />;
  else if (activePage === 'bursar_audit')   pageContent = <BursarAuditPage school={school} />;
  else if (activePage === 'finance_users')  pageContent = <FinanceUsersPage school={school} admin={admin} />;
  else if (activePage === 'principal')      pageContent = <PrincipalUsersPage school={school} admin={admin} />;
  else if (activePage === 'timetable')     pageContent = <TimetablePage school={school} />;
  else if (activePage === 'analytics')     pageContent = <AnalyticsPage school={school} />;
  else if (activePage === 'parents')       pageContent = <ParentsPage school={school} />;
  else if (activePage === 'reports')       pageContent = <ReportsPage school={school} />;
  else if (activePage === 'notifications') pageContent = <NotificationsPage school={school} />;
  else if (activePage === 'messages')      pageContent = <MessagesPage school={school} admin={admin} />;
  else if (activePage === 'security')       pageContent = <SecurityPageEnhanced />;
  else if (activePage === 'mod_requests')   pageContent = <ModRequestsPage />;
  else if (activePage === 'grading_scheme') pageContent = <GradingSchemePage />;
  else if (activePage === 'academic_cal')   pageContent = <AcademicCalendarPage />;
  else if (activePage === 'grade_oversight')pageContent = <GradeOversightPage />;
  else if (activePage === 'rooms')          pageContent = <RoomsPage />;
  else if (activePage === 'exam_officers')  pageContent = <ExamOfficersPage />;
  else if (activePage === 'teacher_assign') pageContent = <TeacherAssignmentsPage />;
  else if (activePage === 'promotions')     pageContent = <StudentPromotionPage />;
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
