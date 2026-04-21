import { useState, useEffect } from 'react';
import { useParentChildren } from '../../hooks/useParentChildren';
import { useParentNotifications } from '../../hooks/useParentNotifications';
import { useTheme } from '../../context/ThemeContext';
import ParentHome from './ParentHome';
import ParentChildren from './ParentChildren';
import ParentGrades from './ParentGrades';
import ParentReportCards from './ParentReportCards';
import ParentNotifications from './ParentNotifications';
import ParentProfile from './ParentProfile';
import ParentAttendance from './ParentAttendance';
import ParentBehavior from './ParentBehavior';
import ParentFees from './ParentFees';
import ParentVerification from './ParentVerification';
import './ParentDashboard.css';

const SECTION_PATHS = {
  home:           '/parent',
  children:       '/parent/children',
  grades:         '/parent/grades',
  'report-cards': '/parent/report-cards',
  notifications:  '/parent/notifications',
  profile:        '/parent/profile',
  attendance:     '/parent/attendance',
  behavior:       '/parent/behavior',
  fees:           '/parent/fees',
  verification:   '/parent/verification',
};

function getInitialSection() {
  const p = window.location.pathname;
  if (p.includes('/parent/children'))     return 'children';
  if (p.includes('/parent/grades'))       return 'grades';
  if (p.includes('/parent/report-cards')) return 'report-cards';
  if (p.includes('/parent/notifications'))return 'notifications';
  if (p.includes('/parent/profile'))      return 'profile';
  if (p.includes('/parent/attendance'))   return 'attendance';
  if (p.includes('/parent/behavior'))     return 'behavior';
  if (p.includes('/parent/fees'))         return 'fees';
  if (p.includes('/parent/verification')) return 'verification';
  return 'home';
}

const NAV_ITEMS = [
  { key: 'home',         icon: 'dashboard',          label: 'Dashboard' },
  { key: 'children',     icon: 'family_restroom',     label: 'My Children' },
  { key: 'grades',       icon: 'grade',               label: 'Grades' },
  { key: 'report-cards', icon: 'description',         label: 'Report Cards' },
  { key: 'attendance',   icon: 'fact_check',          label: 'Attendance' },
  { key: 'behavior',     icon: 'gavel',               label: 'Behaviour' },
  { key: 'fees',         icon: 'payments',            label: 'Fees' },
  { key: 'verification', icon: 'verified_user',       label: 'Verification' },
  { key: 'notifications',icon: 'notifications',       label: 'Notifications' },
  { key: 'profile',      icon: 'person',              label: 'Profile' },
];

export default function ParentDashboard({ onNavigate }) {
  const [activeSection, setActiveSection] = useState(getInitialSection);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const { children, parent } = useParentChildren();
  const { unreadCount } = useParentNotifications();
  const { theme, toggleTheme } = useTheme();

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
    window.history.pushState({}, '', SECTION_PATHS[section] || '/parent');
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    if (onNavigate) onNavigate('login');
    window.history.pushState({}, '', '/login');
  };

  const parentInitials = parent?.initials ||
    (parent?.fullName ? parent.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : 'P');

  const renderSection = () => {
    const props = { navigateTo, children };
    switch (activeSection) {
      case 'home':          return <ParentHome          {...props} parent={parent} />;
      case 'children':      return <ParentChildren      {...props} />;
      case 'grades':        return <ParentGrades        {...props} />;
      case 'report-cards':  return <ParentReportCards   {...props} />;
      case 'notifications': return <ParentNotifications {...props} />;
      case 'profile':       return <ParentProfile       {...props} parent={parent} />;
      case 'attendance':    return <ParentAttendance    {...props} />;
      case 'behavior':      return <ParentBehavior      {...props} />;
      case 'fees':          return <ParentFees          {...props} />;
      case 'verification':  return <ParentVerification  {...props} />;
      default:              return <ParentHome          {...props} parent={parent} />;
    }
  };

  const showOverlay = sidebarOpen && window.innerWidth < 768;

  return (
    <div className="par-shell">
      {/* Sidebar */}
      <aside className={`par-sidebar ${sidebarOpen ? 'par-sidebar--open' : ''}`}>
        <div className="par-sidebar__brand">
          <span className="par-sidebar__logo">EK-SMS</span>
          <p className="par-sidebar__tagline">The Digital Archive</p>
        </div>

        <div className="par-sidebar__user">
          <div className="par-sidebar__avatar">{parentInitials}</div>
          <div>
            <p className="par-sidebar__name">{parent?.fullName || 'Parent'}</p>
            <p className="par-sidebar__role">Parent / Guardian</p>
          </div>
        </div>

        <div className="par-sidebar__term-chip">
          {parent?.currentTerm || 'First Term'} · {parent?.academicYear || '2025-2026'}
        </div>

        <nav className="par-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`par-nav-item ${activeSection === item.key ? 'par-nav-item--active' : ''}`}
              onClick={() => navigateTo(item.key)}
            >
              <span className="material-symbols-outlined par-nav-item__icon">{item.icon}</span>
              <span className="par-nav-item__label">{item.label}</span>
              {item.key === 'notifications' && unreadCount > 0 && (
                <span className="par-nav-item__badge">{unreadCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="par-sidebar__footer">
          <button className="par-sidebar__logout" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {showOverlay && (
        <div className="par-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className={`par-main ${sidebarOpen ? 'par-main--shifted' : ''}`}>
        {/* Header */}
        <header className="par-header">
          <div className="par-header__left">
            <button className="par-header__menu-btn" onClick={() => setSidebarOpen((p) => !p)}>
              <span className="material-symbols-outlined">{sidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>
            <h2 className="par-header__title">The Digital Archive</h2>
            <span className="par-header__divider" />
            <p className="par-header__sub">{parent?.academicYear || '2025-2026'} · {parent?.currentTerm || 'First Term'}</p>
          </div>
          <div className="par-header__right">
            <button className="par-header__theme-btn" onClick={toggleTheme} title="Toggle theme">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button className="par-header__notif-btn" onClick={() => navigateTo('notifications')}>
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && <span className="par-header__notif-dot" />}
            </button>
            <div className="par-header__avatar" onClick={() => navigateTo('profile')}>
              {parentInitials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="par-content">
          {renderSection()}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="par-bottom-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`par-bottom-nav__item ${activeSection === item.key ? 'par-bottom-nav__item--active' : ''}`}
            onClick={() => navigateTo(item.key)}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label === 'My Children' ? 'Children' : item.label === 'Report Cards' ? 'Reports' : item.label}</span>
            {item.key === 'notifications' && unreadCount > 0 && (
              <span className="par-bottom-nav__dot" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
