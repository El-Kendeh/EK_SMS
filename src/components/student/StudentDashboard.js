import { useState, useEffect } from 'react';
import { NotificationProvider } from '../../context/NotificationContext';
import { LowDataProvider, useLowData } from '../../context/LowDataContext';
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
};

function getInitialSection() {
  const path = window.location.pathname;
  if (path.includes('/student/grades'))         return 'grades';
  if (path.includes('/student/report-cards'))   return 'report-cards';
  if (path.includes('/student/financials'))     return 'financials';
  if (path.includes('/student/notifications'))  return 'notifications';
  if (path.includes('/student/profile'))        return 'profile';
  if (path.includes('/student/timetable'))      return 'timetable';
  if (path.includes('/student/assignments'))    return 'assignments';
  if (path.includes('/student/messages'))       return 'messages';
  if (path.includes('/student/resources'))      return 'resources';
  if (path.includes('/student/attendance'))     return 'attendance';
  if (path.includes('/student/events'))         return 'events';
  return 'home';
}

function StudentDashboardInner({ onNavigate }) {
  const [activeSection, setActiveSection] = useState(getInitialSection);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [msgUnread, setMsgUnread] = useState(0);

  // Close sidebar on resize below mobile threshold
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load message unread count for sidebar badge
  useEffect(() => {
    studentApi.getConversations().then((convs) => {
      setMsgUnread(convs.reduce((s, c) => s + c.unread, 0));
    }).catch(() => {});
  }, []);

  // Clear messages badge when user enters the messages section
  useEffect(() => {
    if (activeSection === 'messages') setMsgUnread(0);
  }, [activeSection]);

  const navigateTo = (section) => {
    setActiveSection(section);
    window.history.pushState({}, '', SECTION_PATHS[section] || '/student');
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
      case 'home':          return <StudentHome          {...props} />;
      case 'grades':        return <StudentGrades        {...props} />;
      case 'report-cards':  return <StudentReportCards   {...props} />;
      case 'financials':    return <StudentFinancials    {...props} />;
      case 'notifications': return <StudentNotifications {...props} />;
      case 'profile':       return <StudentProfile       {...props} />;
      case 'timetable':     return <StudentTimetable     {...props} />;
      case 'assignments':   return <StudentAssignments   {...props} />;
      case 'messages':      return <StudentMessages      {...props} />;
      case 'resources':     return <StudentResources     {...props} />;
      case 'attendance':    return <StudentAttendance    {...props} />;
      case 'events':        return <StudentEvents        {...props} />;
      default:              return <StudentHome          {...props} />;
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
          {renderSection()}
        </main>
      </div>

      {showOverlay && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default function StudentDashboard({ onNavigate }) {
  return (
    <LowDataProvider>
      <NotificationProvider>
        <StudentDashboardInner onNavigate={onNavigate} />
      </NotificationProvider>
    </LowDataProvider>
  );
}
