import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TeacherProvider, useTeacher } from '../../context/TeacherContext';
import { useTheme } from '../../context/ThemeContext';
import { useTeacherNotifications } from '../../hooks/useTeacherNotifications';
import { useTeacherClasses } from '../../hooks/useTeacherClasses';
import { useTeacherProfile } from '../../hooks/useTeacherProfile';
import TeacherHome from './TeacherHome';
import MyClasses from './MyClasses';
import GradeEntry from './GradeEntry';
import GradeHistoryScreen from './GradeHistoryScreen';
import MyStudents from './MyStudents';
import TimetableScreen from './TimetableScreen';
import TeacherNotifications from './TeacherNotifications';
import TeacherProfile from './TeacherProfile';
import TeacherAttendance from './TeacherAttendance';
import ClassAnalytics from './ClassAnalytics';
import TeacherSettings from './TeacherSettings';
import './TeacherDashboard.css';

const SECTION_PATHS = {
  home:            '/dashboard/teacher',
  classes:         '/teacher/classes',
  'grade-entry':   '/teacher/grade-entry',
  'grade-history': '/teacher/grade-history',
  students:        '/teacher/students',
  timetable:       '/teacher/timetable',
  notifications:   '/teacher/notifications',
  profile:         '/teacher/profile',
  attendance:      '/teacher/attendance',
  analytics:       '/teacher/analytics',
  settings:        '/teacher/settings',
};

function getInitialSection() {
  const p = window.location.pathname;
  if (p.includes('/teacher/classes'))       return 'classes';
  if (p.includes('/teacher/grade-entry'))   return 'grade-entry';
  if (p.includes('/teacher/grade-history')) return 'grade-history';
  if (p.includes('/teacher/students'))      return 'students';
  if (p.includes('/teacher/timetable'))     return 'timetable';
  if (p.includes('/teacher/notifications')) return 'notifications';
  if (p.includes('/teacher/profile'))       return 'profile';
  if (p.includes('/teacher/attendance'))    return 'attendance';
  if (p.includes('/teacher/analytics'))     return 'analytics';
  if (p.includes('/teacher/settings'))      return 'settings';
  return 'home';
}

const NAV_ITEMS = [
  { key: 'home',           icon: 'dashboard',      label: 'Dashboard' },
  { key: 'classes',        icon: 'school',          label: 'My Classes' },
  { key: 'grade-entry',    icon: 'edit_note',       label: 'Grade Entry' },
  { key: 'grade-history',  icon: 'history_edu',     label: 'Grade History' },
  { key: 'attendance',     icon: 'how_to_reg',      label: 'Attendance' },
  { key: 'analytics',      icon: 'analytics',       label: 'Class Analytics' },
  { key: 'students',       icon: 'groups',          label: 'My Students' },
  { key: 'timetable',      icon: 'calendar_today',  label: 'Timetable' },
  { key: 'notifications',  icon: 'notifications',   label: 'Notifications' },
  { key: 'profile',        icon: 'person',          label: 'Profile' },
  { key: 'settings',       icon: 'settings',        label: 'Settings' },
];

const MOBILE_NAV_KEYS = ['home', 'classes', 'grade-entry', 'students', 'notifications'];

function TeacherDashboardInner({ onNavigate }) {
  const [activeSection, setActiveSection] = useState(getInitialSection);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const { theme, toggleTheme } = useTheme();
  const { unreadCount, securityAlertCount } = useTeacherNotifications();
  const { pendingCounts } = useTeacher();
  const { profile } = useTeacherProfile();

  // Load classes on mount
  useTeacherClasses();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigateTo = (section) => {
    setActiveSection(section);
    window.history.pushState({}, '', SECTION_PATHS[section] || '/dashboard/teacher');
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    if (onNavigate) onNavigate('login');
    window.history.pushState({}, '', '/login');
  };

  const initials = profile?.initials ||
    (profile?.fullName ? profile.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'T');

  const gradeBadgeCount = pendingCounts.totalPending + pendingCounts.totalDraft;
  const showOverlay = sidebarOpen && window.innerWidth < 768;

  const renderSection = () => {
    const props = { navigateTo };
    switch (activeSection) {
      case 'home':           return <TeacherHome          {...props} />;
      case 'classes':        return <MyClasses            {...props} />;
      case 'grade-entry':    return <GradeEntry           {...props} />;
      case 'grade-history':  return <GradeHistoryScreen   {...props} />;
      case 'attendance':     return <TeacherAttendance    {...props} />;
      case 'analytics':      return <ClassAnalytics       {...props} />;
      case 'students':       return <MyStudents           {...props} />;
      case 'timetable':      return <TimetableScreen      {...props} />;
      case 'notifications':  return <TeacherNotifications {...props} />;
      case 'profile':        return <TeacherProfile       {...props} />;
      case 'settings':       return <TeacherSettings      {...props} onLogout={handleLogout} />;
      default:               return <TeacherHome          {...props} />;
    }
  };

  return (
    <div className="tch-shell">
      {/* Sidebar */}
      <aside className={`tch-sidebar ${sidebarOpen ? 'tch-sidebar--open' : ''}`}>
        <div className="tch-sidebar__brand">
          <span className="tch-sidebar__logo">EK-SMS</span>
          <p className="tch-sidebar__tagline">Teacher Portal</p>
        </div>

        <div className="tch-sidebar__user">
          <div className="tch-sidebar__avatar">{initials}</div>
          <div className="tch-sidebar__user-info">
            <p className="tch-sidebar__name">{profile?.fullName || 'Teacher'}</p>
            <p className="tch-sidebar__role">Mathematics Teacher</p>
          </div>
        </div>

        <nav className="tch-sidebar__nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`tch-nav-item ${activeSection === item.key ? 'tch-nav-item--active' : ''}`}
              onClick={() => navigateTo(item.key)}
            >
              <span className="material-symbols-outlined tch-nav-item__icon">{item.icon}</span>
              <span className="tch-nav-item__label">{item.label}</span>
              {item.key === 'grade-entry' && gradeBadgeCount > 0 && (
                <span className="tch-nav-item__badge tch-nav-item__badge--amber">{gradeBadgeCount}</span>
              )}
              {item.key === 'notifications' && unreadCount > 0 && (
                <span className={`tch-nav-item__badge ${securityAlertCount > 0 ? 'tch-nav-item__badge--red' : ''}`}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="tch-sidebar__footer">
          <button className="tch-sidebar__logout" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {showOverlay && (
        <div className="tch-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className={`tch-main ${sidebarOpen ? 'tch-main--shifted' : ''}`}>
        {/* Header */}
        <header className="tch-header">
          <div className="tch-header__left">
            <button className="tch-header__menu-btn" onClick={() => setSidebarOpen(p => !p)}>
              <span className="material-symbols-outlined">{sidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>
            <h2 className="tch-header__title">EK-SMS</h2>
            <span className="tch-header__divider" />
            <p className="tch-header__sub">Teacher Portal</p>
          </div>
          <div className="tch-header__right">
            <button className="tch-header__theme-btn" onClick={toggleTheme} title="Toggle theme">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button className="tch-header__notif-btn" onClick={() => navigateTo('notifications')}>
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className={`tch-header__notif-dot ${securityAlertCount > 0 ? 'tch-header__notif-dot--red' : ''}`} />
              )}
            </button>
            <div className="tch-header__avatar" onClick={() => navigateTo('profile')}>
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="tch-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="tch-bottom-nav">
        {MOBILE_NAV_KEYS.map(key => {
          const item = NAV_ITEMS.find(n => n.key === key);
          if (!item) return null;
          return (
            <button
              key={key}
              className={`tch-bottom-nav__item ${activeSection === key ? 'tch-bottom-nav__item--active' : ''}`}
              onClick={() => navigateTo(key)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label === 'My Classes' ? 'Classes' : item.label === 'Grade Entry' ? 'Grades' : item.label}</span>
              {key === 'grade-entry' && gradeBadgeCount > 0 && (
                <span className="tch-bottom-nav__dot tch-bottom-nav__dot--amber" />
              )}
              {key === 'notifications' && unreadCount > 0 && (
                <span className="tch-bottom-nav__dot" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function TeacherDashboard({ onNavigate }) {
  return (
    <TeacherProvider>
      <TeacherDashboardInner onNavigate={onNavigate} />
    </TeacherProvider>
  );
}
