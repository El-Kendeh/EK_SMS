import { useEffect, useState } from 'react';
import { useParentChildren } from '../../hooks/useParentChildren';
import { useTheme } from '../../context/ThemeContext';
import { I18nProvider } from '../../context/I18nContext';
import { ChildProvider, useActiveChild } from '../../context/ChildContext';
import { ParentNotificationProvider, useParentNotifyCtx } from '../../context/ParentNotificationContext';

import ParentHome from './ParentHome';
import ParentChildren from './ParentChildren';
import ParentGrades from './ParentGrades';
import ParentReportCards from './ParentReportCards';
import ParentNotifications from './ParentNotifications';
import ParentProfile from './ParentProfile';
import ParentAttendance from './ParentAttendance';
import ParentBehavior from './ParentBehavior';
import ParentFees from './ParentFees';

import ParentMessages from './ParentMessages';
import ParentTeacherConferences from './ParentTeacherConferences';
import ParentWellbeing from './ParentWellbeing';
import ParentWhistleblower from './ParentWhistleblower';
import CompareChildren from './CompareChildren';
import CoGuardians from './CoGuardians';
import PickupList from './PickupList';
import PermissionSlips from './PermissionSlips';
import Donations from './Donations';
import EndOfTermPack from './EndOfTermPack';
import WeeklyDigest from './WeeklyDigest';
import PrintFamilySummary from './PrintFamilySummary';
import ChildSwitcher from './ChildSwitcher';
import LiveParentToast from './LiveParentToast';

import KeyboardShortcuts from '../common/KeyboardShortcuts';
import AccessibilityControls from '../common/AccessibilityControls';
import ErrorBoundary from '../common/ErrorBoundary';
import VerifyPage from '../student/VerifyPage';

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
  messages:       '/parent/messages',
  conferences:    '/parent/conferences',
  wellbeing:      '/parent/wellbeing',
  'safe-report':  '/parent/safe-report',
  compare:        '/parent/compare',
  'co-guardians': '/parent/co-guardians',
  pickup:         '/parent/pickup',
  'permission-slips': '/parent/permission-slips',
  donations:      '/parent/donations',
  'end-of-term-pack': '/parent/end-of-term-pack',
  digest:         '/parent/digest',
  'print-summary':'/parent/print-summary',
};

function getInitialSection() {
  const p = window.location.pathname;
  // Sort longer prefixes first to avoid '/parent' matching everything
  const order = Object.entries(SECTION_PATHS)
    .filter(([k]) => k !== 'home')
    .sort((a, b) => b[1].length - a[1].length);
  for (const [key, path] of order) {
    if (p.startsWith(path)) return key;
  }
  return 'home';
}

const NAV_GROUPS = [
  {
    label: 'Academic',
    items: [
      { key: 'home',         icon: 'dashboard',          label: 'Dashboard' },
      { key: 'children',     icon: 'family_restroom',    label: 'My Children' },
      { key: 'grades',       icon: 'grade',              label: 'Grades' },
      { key: 'report-cards', icon: 'description',        label: 'Report Cards' },
      { key: 'attendance',   icon: 'fact_check',         label: 'Attendance' },
      { key: 'behavior',     icon: 'gavel',              label: 'Behaviour' },
      { key: 'compare',      icon: 'compare',            label: 'Compare' },
      { key: 'digest',       icon: 'auto_awesome',       label: 'Weekly digest' },
    ],
  },
  {
    label: 'Community',
    items: [
      { key: 'messages',      icon: 'forum',             label: 'Messages' },
      { key: 'conferences',   icon: 'co_present',        label: 'Conferences' },
      { key: 'wellbeing',     icon: 'favorite',          label: 'Wellbeing' },
      { key: 'donations',     icon: 'volunteer_activism',label: 'Sponsor' },
      { key: 'notifications', icon: 'notifications',     label: 'Notifications' },
    ],
  },
  {
    label: 'Family',
    items: [
      { key: 'fees',              icon: 'payments',         label: 'Fees' },
      { key: 'co-guardians',      icon: 'group',            label: 'Co-guardians' },
      { key: 'pickup',            icon: 'directions_walk',  label: 'Pickup list' },
      { key: 'permission-slips',  icon: 'task',             label: 'Permission slips' },
      { key: 'end-of-term-pack',  icon: 'archive',          label: 'End-of-term pack' },
      { key: 'print-summary',     icon: 'print',            label: 'Print summary' },
      { key: 'profile',           icon: 'person',           label: 'Profile' },
      { key: 'verification',      icon: 'verified_user',    label: 'Verify a doc' },
      { key: 'safe-report',       icon: 'privacy_tip',      label: 'Safe Report' },
    ],
  },
];

function ParentInner({ onNavigate }) {
  const [activeSection, setActiveSection] = useState(getInitialSection);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useParentNotifyCtx();
  const { children = [], activeChild } = useActiveChild();

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navigateTo = (section) => {
    setActiveSection(section);
    const u = new URL(window.location.href);
    u.pathname = SECTION_PATHS[section] || '/parent';
    window.history.pushState({}, '', u.toString());
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    if (onNavigate) onNavigate('login');
    window.history.pushState({}, '', '/login');
  };

  const toggleGroup = (label) => setCollapsedGroups((s) => ({ ...s, [label]: !s[label] }));

  const renderSection = () => {
    switch (activeSection) {
      case 'home':              return <ParentHome navigateTo={navigateTo} />;
      case 'children':          return <ParentChildren navigateTo={navigateTo} children={children} />;
      case 'grades':            return <ParentGrades navigateTo={navigateTo} children={children} />;
      case 'report-cards':      return <ParentReportCards />;
      case 'notifications':     return <ParentNotifications navigateTo={navigateTo} children={children} />;
      case 'profile':           return <ParentProfile />;
      case 'attendance':        return <ParentAttendance navigateTo={navigateTo} children={children} />;
      case 'behavior':          return <ParentBehavior navigateTo={navigateTo} children={children} />;
      case 'fees':              return <ParentFees />;
      case 'verification':      return <VerifyPage hash={null} />;
      case 'messages':          return <ParentMessages />;
      case 'conferences':       return <ParentTeacherConferences />;
      case 'wellbeing':         return <ParentWellbeing />;
      case 'safe-report':       return <ParentWhistleblower />;
      case 'compare':           return <CompareChildren />;
      case 'co-guardians':      return <CoGuardians />;
      case 'pickup':            return <PickupList />;
      case 'permission-slips':  return <PermissionSlips />;
      case 'donations':         return <Donations />;
      case 'end-of-term-pack':  return <EndOfTermPack />;
      case 'digest':            return <WeeklyDigest />;
      case 'print-summary':     return <PrintFamilySummary />;
      default:                  return <ParentHome navigateTo={navigateTo} />;
    }
  };

  const showOverlay = sidebarOpen && window.innerWidth < 768;

  return (
    <div className="par-shell">
      {/* Sidebar */}
      <aside className={`par-sidebar ${sidebarOpen ? 'par-sidebar--open' : ''}`}>
        <div className="par-sidebar__brand">
          <span className="par-sidebar__logo">EK-SMS</span>
          <p className="par-sidebar__tagline">Parent Portal</p>
        </div>

        <nav className="par-sidebar__nav">
          {NAV_GROUPS.map((g) => {
            const collapsed = collapsedGroups[g.label];
            return (
              <div key={g.label} className="par-sidebar__group">
                <button type="button" className="par-sidebar__group-label" onClick={() => toggleGroup(g.label)}>
                  <span>{g.label}</span>
                  <span className="material-symbols-outlined">{collapsed ? 'expand_more' : 'expand_less'}</span>
                </button>
                {!collapsed && g.items.map((item) => (
                  <button
                    key={item.key}
                    className={`par-nav-item ${activeSection === item.key ? 'par-nav-item--active' : ''}`}
                    onClick={() => navigateTo(item.key)}
                  >
                    <span className="material-symbols-outlined par-nav-item__icon">{item.icon}</span>
                    <span className="par-nav-item__label">{item.label}</span>
                    {item.key === 'notifications' && unreadCount > 0 && (
                      <span className="par-nav-item__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="par-sidebar__footer">
          <div className="par-sidebar__a11y">
            <AccessibilityControls compact={false} />
          </div>
          <button className="par-sidebar__logout" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span> Sign Out
          </button>
        </div>
      </aside>

      {showOverlay && <div className="par-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`par-main ${sidebarOpen ? 'par-main--shifted' : ''}`}>
        <header className="par-header">
          <div className="par-header__left">
            <button className="par-header__menu-btn" onClick={() => setSidebarOpen((p) => !p)}>
              <span className="material-symbols-outlined">{sidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>
            <h2 className="par-header__title">Parent Portal</h2>
          </div>

          <div className="par-header__center">
            <ChildSwitcher compact />
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
          </div>
        </header>

        <main className="par-content">
          <ErrorBoundary>
            {renderSection()}
          </ErrorBoundary>
        </main>

        {/* Trust footer — brand promise pinned everywhere */}
        <footer className="par-trust-footer">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <span>Records verified · viewing as <strong>{activeChild?.fullName?.split(' ')[0] || '—'}</strong>'s guardian</span>
        </footer>
      </div>

      <KeyboardShortcuts onNavigate={navigateTo} />
      <LiveParentToast onOpen={() => navigateTo('notifications')} />
    </div>
  );
}

export default function ParentDashboard({ onNavigate }) {
  // Outer wrapper loads children once and feeds the ChildProvider
  const { children = [], parent } = useParentChildren();
  return (
    <I18nProvider>
      <ChildProvider initialChildren={children}>
        <ParentNotificationProvider>
          <ParentInner onNavigate={onNavigate} />
          {/* Hidden: makes sure parent name is reachable for header — kept for compat */}
          <div style={{ display: 'none' }}>{parent?.fullName}</div>
        </ParentNotificationProvider>
      </ChildProvider>
    </I18nProvider>
  );
}
