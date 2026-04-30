import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TeacherProvider, useTeacher } from '../../context/TeacherContext';
import { TeacherNotificationProvider, useTeacherNotifyCtx } from '../../context/TeacherNotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { I18nProvider } from '../../context/I18nContext';
import { useTeacherClasses } from '../../hooks/useTeacherClasses';
import { useTeacherProfile } from '../../hooks/useTeacherProfile';

// Existing sections
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
import AssignmentsScreen from './AssignmentsScreen';
import ModificationsPage from './ModificationsPage';
import MessagesScreen from './MessagesScreen';
import GradeCompletionScreen from './GradeCompletionScreen';
import ExamResultsScreen from './ExamResultsScreen';
import ReportCardsScreen from './ReportCardsScreen';
import TeacherResources from './TeacherResources';
import FeedbackScreen from './FeedbackScreen';

// New sections
import TeacherParentMessages from './TeacherParentMessages';
import TeacherStudentThreads from './TeacherStudentThreads';
import TeacherOfficeHours from './TeacherOfficeHours';
import TeacherWhistleblower from './TeacherWhistleblower';
import TeacherChannelPreferences from './TeacherChannelPreferences';
import BehaviourIncidents from './BehaviourIncidents';
import SubstituteMode from './SubstituteMode';
import LessonPlans from './LessonPlans';
import PrintClassRoster from './PrintClassRoster';
import WorkloadCalendar from './WorkloadCalendar';
import PersonalPerformance from './PersonalPerformance';
import PeerReview from './PeerReview';
import ExamDuties from './ExamDuties';
import WhereIveBeen from './WhereIveBeen';
import LiveTeacherToast from './LiveTeacherToast';
import TamperCounter from './TamperCounter';
import AutoSaveIndicator from './AutoSaveIndicator';

import KeyboardShortcuts from '../common/KeyboardShortcuts';
import AccessibilityControls from '../common/AccessibilityControls';
import ErrorBoundary from '../common/ErrorBoundary';
import VerifyPage from '../student/VerifyPage';

import './TeacherDashboard.css';

const SECTION_PATHS = {
  home:               '/dashboard/teacher',
  classes:            '/teacher/classes',
  'grade-entry':      '/teacher/grade-entry',
  'grade-history':    '/teacher/grade-history',
  'grade-completion': '/teacher/grade-completion',
  students:           '/teacher/students',
  timetable:          '/teacher/timetable',
  notifications:      '/teacher/notifications',
  profile:            '/teacher/profile',
  attendance:         '/teacher/attendance',
  analytics:          '/teacher/analytics',
  assignments:        '/teacher/assignments',
  'exam-results':     '/teacher/exam-results',
  'exam-duties':      '/teacher/exam-duties',
  'report-cards':     '/teacher/report-cards',
  modifications:      '/teacher/modifications',
  messages:           '/teacher/messages',
  resources:          '/teacher/resources',
  feedback:           '/teacher/feedback',
  settings:           '/teacher/settings',
  // New
  'parent-messages':  '/teacher/parent-messages',
  'student-threads':  '/teacher/student-threads',
  'office-hours':     '/teacher/office-hours',
  behaviour:          '/teacher/behaviour',
  substitute:         '/teacher/substitute',
  'lesson-plans':     '/teacher/lesson-plans',
  'print-roster':     '/teacher/print-roster',
  workload:           '/teacher/workload',
  performance:        '/teacher/performance',
  'peer-review':      '/teacher/peer-review',
  'safe-report':      '/teacher/safe-report',
  verify:             '/teacher/verify',
  'where-ive-been':   '/teacher/where-ive-been',
};

function getInitialSection() {
  const p = window.location.pathname;
  // Sort longest paths first so /teacher/grade-history beats /teacher/grade
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
    label: 'Teaching',
    items: [
      { key: 'home',              icon: 'dashboard',        label: 'Dashboard' },
      { key: 'classes',           icon: 'school',           label: 'My Classes' },
      { key: 'students',          icon: 'groups',           label: 'My Students' },
      { key: 'grade-entry',       icon: 'edit_note',        label: 'Grade Entry' },
      { key: 'grade-history',     icon: 'history_edu',      label: 'Grade History' },
      { key: 'grade-completion',  icon: 'task_alt',         label: 'Grade Completion' },
      { key: 'lesson-plans',      icon: 'menu_book',        label: 'Lesson Plans' },
    ],
  },
  {
    label: 'Assessments',
    items: [
      { key: 'assignments',       icon: 'assignment',       label: 'Assignments' },
      { key: 'exam-results',      icon: 'fact_check',       label: 'Exam Results' },
      { key: 'exam-duties',       icon: 'how_to_reg',       label: 'Exam Duties' },
      { key: 'modifications',     icon: 'rate_review',      label: 'Mod. Requests' },
      { key: 'report-cards',      icon: 'description',      label: 'Report Cards' },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { key: 'attendance',        icon: 'how_to_reg',       label: 'Attendance' },
      { key: 'behaviour',         icon: 'report',           label: 'Behaviour log' },
      { key: 'resources',         icon: 'folder_open',      label: 'Resources' },
      { key: 'analytics',         icon: 'analytics',        label: 'Class Analytics' },
    ],
  },
  {
    label: 'Community',
    items: [
      { key: 'feedback',          icon: 'forum',            label: 'Old feedback' },
      { key: 'student-threads',   icon: 'chat',             label: 'Student threads' },
      { key: 'parent-messages',   icon: 'family_restroom',  label: 'Parent messages' },
      { key: 'office-hours',      icon: 'co_present',       label: 'Office hours' },
      { key: 'messages',          icon: 'campaign',         label: 'Announcements' },
      { key: 'notifications',     icon: 'notifications',    label: 'Notifications' },
    ],
  },
  {
    label: 'Me',
    items: [
      { key: 'workload',          icon: 'view_week',        label: 'My workload' },
      { key: 'performance',       icon: 'leaderboard',      label: 'My performance' },
      { key: 'peer-review',       icon: 'group',            label: 'Peer review' },
      { key: 'where-ive-been',    icon: 'history',          label: 'Where I\'ve been' },
      { key: 'substitute',        icon: 'key',              label: 'Substitute mode' },
      { key: 'print-roster',      icon: 'print',            label: 'Print roster' },
      { key: 'timetable',         icon: 'calendar_today',   label: 'Timetable' },
      { key: 'profile',           icon: 'person',           label: 'Profile' },
      { key: 'settings',          icon: 'settings',         label: 'Settings' },
      { key: 'verify',            icon: 'verified_user',    label: 'Verify a doc' },
      { key: 'safe-report',       icon: 'privacy_tip',      label: 'Safe Report' },
    ],
  },
];

const MOBILE_NAV_KEYS = ['home', 'classes', 'grade-entry', 'workload', 'notifications'];

function TeacherDashboardInner({ onNavigate }) {
  const [activeSection, setActiveSection] = useState(getInitialSection);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useTeacherNotifyCtx();
  const { pendingCounts, selectedClass, currentTerm } = useTeacher();
  const { profile } = useTeacherProfile();

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
    const u = new URL(window.location.href);
    u.pathname = SECTION_PATHS[section] || '/dashboard/teacher';
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

  const initials = profile?.initials ||
    (profile?.fullName ? profile.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'T');

  const gradeBadgeCount = pendingCounts.totalPending + pendingCounts.totalDraft;
  const showOverlay = sidebarOpen && window.innerWidth < 768;

  const renderSection = () => {
    const props = { navigateTo };
    switch (activeSection) {
      case 'home':              return <TeacherHome          {...props} />;
      case 'classes':           return <MyClasses            {...props} />;
      case 'grade-entry':       return <GradeEntry           {...props} />;
      case 'grade-history':     return <GradeHistoryScreen   {...props} />;
      case 'grade-completion':  return <GradeCompletionScreen {...props} />;
      case 'attendance':        return <TeacherAttendance    {...props} />;
      case 'analytics':         return <ClassAnalytics       {...props} />;
      case 'students':          return <MyStudents           {...props} />;
      case 'timetable':         return <TimetableScreen      {...props} />;
      case 'notifications':     return <TeacherNotifications {...props} />;
      case 'profile':           return <TeacherProfile       {...props} />;
      case 'assignments':       return <AssignmentsScreen    {...props} />;
      case 'exam-results':      return <ExamResultsScreen    {...props} />;
      case 'exam-duties':       return <ExamDuties />;
      case 'report-cards':      return <ReportCardsScreen    {...props} />;
      case 'modifications':     return <ModificationsPage    {...props} />;
      case 'resources':         return <TeacherResources     {...props} />;
      case 'feedback':          return <FeedbackScreen       {...props} />;
      case 'messages':          return <MessagesScreen       {...props} />;
      case 'settings':          return <TeacherSettings      {...props} onLogout={handleLogout} />;
      // New sections
      case 'parent-messages':   return <TeacherParentMessages />;
      case 'student-threads':   return <TeacherStudentThreads />;
      case 'office-hours':      return <TeacherOfficeHours />;
      case 'behaviour':         return <BehaviourIncidents />;
      case 'substitute':        return <SubstituteMode />;
      case 'lesson-plans':      return <LessonPlans />;
      case 'print-roster':      return <PrintClassRoster />;
      case 'workload':          return <WorkloadCalendar />;
      case 'performance':       return <PersonalPerformance />;
      case 'peer-review':       return <PeerReview />;
      case 'safe-report':       return <TeacherWhistleblower />;
      case 'verify':            return <VerifyPage hash={null} />;
      case 'where-ive-been':    return (
        <div style={{ padding: 22 }}>
          <WhereIveBeen />
          <div style={{ marginTop: 22 }}>
            <TeacherChannelPreferences />
          </div>
        </div>
      );
      default:                  return <TeacherHome          {...props} />;
    }
  };

  if (!profile) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontWeight: 700 }}>
        <p>Loading teacher profile…</p>
      </div>
    );
  }

  return (
    <div className="tch-shell">
      <aside className={`tch-sidebar ${sidebarOpen ? 'tch-sidebar--open' : ''}`}>
        <div className="tch-sidebar__brand">
          <span className="tch-sidebar__logo">EK-SMS</span>
          <p className="tch-sidebar__tagline">Teacher Portal</p>
        </div>

        <div className="tch-sidebar__user">
          <div className="tch-sidebar__avatar">{initials}</div>
          <div className="tch-sidebar__user-info">
            <p className="tch-sidebar__name">{profile?.fullName || 'Teacher'}</p>
            <p className="tch-sidebar__role">
              {profile?.qualification || (profile?.subjects?.length ? profile.subjects.slice(0, 2).join(', ') + ' Teacher' : 'Teacher')}
            </p>
          </div>
        </div>

        <nav className="tch-sidebar__nav">
          {NAV_GROUPS.map((g) => {
            const collapsed = collapsedGroups[g.label];
            return (
              <div key={g.label} className="tch-sidebar__group">
                <button type="button" className="tch-sidebar__group-label" onClick={() => toggleGroup(g.label)}>
                  <span>{g.label}</span>
                  <span className="material-symbols-outlined">{collapsed ? 'expand_more' : 'expand_less'}</span>
                </button>
                {!collapsed && g.items.map((item) => (
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
                      <span className="tch-nav-item__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="tch-sidebar__footer">
          <div className="tch-sidebar__a11y">
            <AccessibilityControls compact={false} />
          </div>
          <button className="tch-sidebar__logout" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {showOverlay && <div className="tch-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`tch-main ${sidebarOpen ? 'tch-main--shifted' : ''}`}>
        <header className="tch-header">
          <div className="tch-header__left">
            <button className="tch-header__menu-btn" onClick={() => setSidebarOpen(p => !p)}>
              <span className="material-symbols-outlined">{sidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>
            <h2 className="tch-header__title">EK-SMS</h2>
            <span className="tch-header__divider" />
            <p className="tch-header__sub">Welcome, {profile?.fullName || 'Teacher'}</p>
          </div>

          <div className="tch-header__right">
            <AutoSaveIndicator />
            <button className="tch-header__theme-btn" onClick={toggleTheme} title="Toggle theme">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button className="tch-header__notif-btn" onClick={() => navigateTo('notifications')}>
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && <span className="tch-header__notif-dot" />}
            </button>
            <div className="tch-header__avatar" onClick={() => navigateTo('profile')}>{initials}</div>
          </div>
        </header>

        {/* Persistent context strip — active class + term + tamper status */}
        <div className="tch-context-strip">
          <div className="tch-context-strip__left">
            {selectedClass && (
              <>
                <span className="tch-context-strip__pill tch-context-strip__pill--class">
                  <span className="material-symbols-outlined">school</span>
                  {selectedClass.name || selectedClass.id}
                </span>
                <span className="tch-context-strip__pill">
                  <span className="material-symbols-outlined">calendar_month</span>
                  {currentTerm?.name || 'Term'}
                </span>
              </>
            )}
            {gradeBadgeCount > 0 && (
              <span className="tch-context-strip__pill tch-context-strip__pill--warn">
                <span className="material-symbols-outlined">grading</span>
                {gradeBadgeCount} grades pending
              </span>
            )}
          </div>
          {selectedClass && (
            <div className="tch-context-strip__right">
              <TamperCounter classId={selectedClass.id} label={selectedClass.name} compact onClickDetails={() => navigateTo('grade-history')} />
            </div>
          )}
        </div>

        <main className="tch-content">
          <ErrorBoundary>
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
          </ErrorBoundary>
        </main>

        {/* Trust footer pinned everywhere */}
        <footer className="tch-trust-footer">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <span>Grade integrity protocol active · every grade you lock is cryptographically signed</span>
        </footer>
      </div>

      <nav className="tch-bottom-nav">
        {MOBILE_NAV_KEYS.map(key => {
          const item = NAV_GROUPS.flatMap((g) => g.items).find(n => n.key === key);
          if (!item) return null;
          return (
            <button
              key={key}
              className={`tch-bottom-nav__item ${activeSection === key ? 'tch-bottom-nav__item--active' : ''}`}
              onClick={() => navigateTo(key)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label === 'My Classes' ? 'Classes' : item.label === 'Grade Entry' ? 'Grades' : item.label === 'My workload' ? 'Work' : item.label}</span>
              {key === 'grade-entry' && gradeBadgeCount > 0 && <span className="tch-bottom-nav__dot tch-bottom-nav__dot--amber" />}
              {key === 'notifications' && unreadCount > 0 && <span className="tch-bottom-nav__dot" />}
            </button>
          );
        })}
      </nav>

      <KeyboardShortcuts onNavigate={navigateTo} />
      <LiveTeacherToast onOpen={() => navigateTo('notifications')} />
    </div>
  );
}

export default function TeacherDashboard({ onNavigate }) {
  return (
    <I18nProvider>
      <TeacherProvider>
        <TeacherNotificationProvider>
          <TeacherDashboardInner onNavigate={onNavigate} />
        </TeacherNotificationProvider>
      </TeacherProvider>
    </I18nProvider>
  );
}
