import { useState, useEffect } from 'react';
import { NotificationProvider } from '../../context/NotificationContext';
import { LowDataProvider, useLowData } from '../../context/LowDataContext';
import { I18nProvider } from '../../context/I18nContext';
import { studentApi } from '../../api/studentApi';
import StudentSidebar from './StudentSidebar';
import StudentHeader from './StudentHeader';
import StudentHome from './StudentHome';
import StudentGrades from './StudentGrades';
import StudentReportCards from './StudentReportCards';
import StudentNotifications from './StudentNotifications';
import StudentProfile from './StudentProfile';
import StudentFinancials from './StudentFinancials';
import StudentTimetable from './StudentTimetable';
import StudentAssignments from './StudentAssignments';
import StudentMessages from './StudentMessages';
import StudentResources from './StudentResources';
import StudentAttendance from './StudentAttendance';
import StudentEvents from './StudentEvents';
import Whistleblower from './Whistleblower';
import OfficeHours from './OfficeHours';
import Wellbeing from './Wellbeing';
import StudyGroups from './StudyGroups';
import StudyPlanner from './StudyPlanner';
import DigitalIdCard from './DigitalIdCard';
import DocumentVault from './DocumentVault';
import PrintTermSummary from './PrintTermSummary';
import VerifyPage from './VerifyPage';
import SubjectDeepDive from './SubjectDeepDive';
import StudentLiveClasses from './StudentLiveClasses';
import KeyboardShortcuts from '../common/KeyboardShortcuts';
import LiveNotificationToast from '../common/LiveNotificationToast';
import ErrorBoundary from '../common/ErrorBoundary';
import './StudentDashboard.css';

const SECTION_PATHS = {
  home:           '/student',
  grades:         '/student/grades',
  'report-cards': '/student/report-cards',
  financials:     '/student/financials',
  notifications:  '/student/notifications',
  profile:        '/student/profile',
  timetable:      '/student/timetable',
  assignments:    '/student/assignments',
  messages:       '/student/messages',
  resources:      '/student/resources',
  attendance:     '/student/attendance',
  events:         '/student/events',
  'safe-report':  '/student/safe-report',
  'office-hours': '/student/office-hours',
  wellbeing:      '/student/wellbeing',
  'study-groups': '/student/study-groups',
  'study-planner':'/student/study-planner',
  'id-card':      '/student/id-card',
  documents:      '/student/documents',
  'print-summary':'/student/print-summary',
  verify:         '/student/verify',
  subject:        '/student/subject',
  'live-classes': '/student/live-classes',
};

function getInitialSection() {
  const path = window.location.pathname;
  for (const [section, p] of Object.entries(SECTION_PATHS)) {
    if (section !== 'home' && path.startsWith(p)) return section;
  }
  return 'home';
}

function getSubjectIdFromPath() {
  const m = window.location.pathname.match(/\/student\/subject\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function StudentDashboardInner({ onNavigate }) {
  const [activeSection, setActiveSection] = useState(getInitialSection);
  const [subjectId, setSubjectId] = useState(getSubjectIdFromPath);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [msgUnread, setMsgUnread] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    studentApi.getConversations().then((convs) => {
      setMsgUnread(convs.reduce((s, c) => s + c.unread, 0));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeSection === 'messages') setMsgUnread(0);
  }, [activeSection]);

  const navigateTo = (section, params) => {
    setActiveSection(section);
    if (section === 'subject' && params?.subjectId) {
      setSubjectId(params.subjectId);
      window.history.pushState({}, '', `/student/subject/${encodeURIComponent(params.subjectId)}`);
    } else {
      window.history.pushState({}, '', SECTION_PATHS[section] || '/student');
    }
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    if (onNavigate) onNavigate('login');
    window.history.pushState({}, '', '/login');
  };

  const { lowData } = useLowData();

  const renderSection = () => {
    const props = { navigateTo };
    switch (activeSection) {
      case 'home':           return <StudentHome          {...props} />;
      case 'grades':         return <StudentGrades        {...props} />;
      case 'report-cards':   return <StudentReportCards   {...props} />;
      case 'financials':     return <StudentFinancials    {...props} />;
      case 'notifications':  return <StudentNotifications {...props} />;
      case 'profile':        return <StudentProfile       {...props} />;
      case 'timetable':      return <StudentTimetable     {...props} />;
      case 'assignments':    return <StudentAssignments   {...props} />;
      case 'messages':       return <StudentMessages      {...props} />;
      case 'resources':      return <StudentResources     {...props} />;
      case 'attendance':     return <StudentAttendance    {...props} />;
      case 'events':         return <StudentEvents        {...props} />;
      case 'safe-report':    return <Whistleblower />;
      case 'office-hours':   return <OfficeHours />;
      case 'wellbeing':      return <Wellbeing />;
      case 'study-groups':   return <StudyGroups />;
      case 'study-planner':  return <StudyPlanner />;
      case 'id-card':        return <DigitalIdCard />;
      case 'documents':      return <DocumentVault />;
      case 'print-summary':  return <PrintTermSummary />;
      case 'verify':         return <VerifyPage hash={null} />;
      case 'subject':        return <SubjectDeepDive subjectId={subjectId} navigateTo={navigateTo} />;
      case 'live-classes':   return <StudentLiveClasses />;
      default:               return <StudentHome          {...props} />;
    }
  };

  const showOverlay = isSidebarOpen && window.innerWidth < 768;

  return (
    <div className={`student-dashboard${lowData ? ' low-data' : ''}`}>
      <StudentSidebar
        activeSection={activeSection}
        navigateTo={navigateTo}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((p) => !p)}
        onLogout={handleLogout}
        msgUnread={msgUnread}
      />

      <div className={`student-main ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <StudentHeader
          onMenuToggle={() => setIsSidebarOpen((p) => !p)}
          activeSection={activeSection}
          navigateTo={navigateTo}
          isSidebarOpen={isSidebarOpen}
        />
        <main className="student-content">
          <ErrorBoundary>
            {renderSection()}
          </ErrorBoundary>
        </main>
      </div>

      {showOverlay && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <KeyboardShortcuts onNavigate={navigateTo} />
      <LiveNotificationToast onOpen={() => navigateTo('notifications')} />
    </div>
  );
}

export default function StudentDashboard({ onNavigate }) {
  return (
    <I18nProvider>
      <LowDataProvider>
        <NotificationProvider>
          <StudentDashboardInner onNavigate={onNavigate} />
        </NotificationProvider>
      </LowDataProvider>
    </I18nProvider>
  );
}
