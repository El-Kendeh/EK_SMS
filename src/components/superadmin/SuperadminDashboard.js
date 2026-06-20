import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import './SA.css';
import './SuperadminDashboard.css';
import ApiClient from '../../api/client';
import { canAccess, ROLE_LABELS } from '../../config/permissions';
import PruhLogo from '../PruhLogo';
import SASchoolScope      from './SASchoolScope';

/* ── Page components are code-split (React.lazy) so each role downloads only the
   screens it uses, not the whole product. Every lazy component renders inside a
   <Suspense> boundary — the page <main> below and the role-portal early returns.
   `named` adapts a module's named export into a default for lazy(). ── */
const named = (loader, key) => lazy(() => loader().then(m => ({ default: m[key] })));

const SAOverview        = lazy(() => import('./SAOverview'));
const SAApplications    = lazy(() => import('./SAApplications'));
const SAReview          = lazy(() => import('./SAReview'));
const SASchools         = lazy(() => import('./SASchools'));
const SAAppHistory      = lazy(() => import('./SAAppHistory'));
const SAVersionCompare  = lazy(() => import('./SAVersionCompare'));
const SARejected        = lazy(() => import('./SARejected'));
const SARejectionAudit  = lazy(() => import('./SARejectionAudit'));
const SASecurityLogs    = lazy(() => import('./SASecurityLogs'));
const SAForensics       = lazy(() => import('./SAForensics'));
const SAAlertBroadcast  = lazy(() => import('./SAAlertBroadcast'));
const SASystemHealth    = lazy(() => import('./SASystemHealth'));
const SAGradeReport     = lazy(() => import('./SAGradeReport'));
const SAGradeIntegrity  = lazy(() => import('./SAGradeIntegrity'));
const SAGradeAuditDetail = lazy(() => import('./SAGradeAuditDetail'));
const SAGovernance      = lazy(() => import('./SAGovernance'));
const SASettings        = lazy(() => import('./SASettings'));
const SAAnalytics       = lazy(() => import('./SAAnalytics'));
const SABenchmarks      = lazy(() => import('./SABenchmarks'));
const SAOnboarding      = lazy(() => import('./SAOnboarding'));
const SAUsers           = lazy(() => import('./SAUsers'));
const SANotifications   = lazy(() => import('./SANotifications'));
const SAProfile         = lazy(() => import('./SAProfile'));
const SAChangeAlerts    = lazy(() => import('./SAChangeAlerts'));
const SACreateTerm      = lazy(() => import('./SACreateTerm'));
const SARefDataManager  = lazy(() => import('./SARefDataManager'));
const SASchoolCapacity  = lazy(() => import('./SASchoolCapacity'));
const SAPrincipal       = lazy(() => import('./SAPrincipal'));
const SABursar          = lazy(() => import('./SABursar'));
const SATeachers        = lazy(() => import('./SATeachers'));
const SAStudents        = lazy(() => import('./SAStudents'));
const SAParents         = lazy(() => import('./SAParents'));
const SAClasses         = lazy(() => import('./SAClasses'));
const SASubjects        = lazy(() => import('./SASubjects'));
const SAAcademicSystem  = lazy(() => import('./SAAcademicSystem'));
const SAGradingSystem   = lazy(() => import('./SAGradingSystem'));
const SAGradesAccumulation = lazy(() => import('./SAGradesAccumulation'));
const SABatchTransfer   = lazy(() => import('./SABatchTransfer'));
const SAReportsHub      = lazy(() => import('./SAReportsHub'));
const SAVirtualMeeting  = lazy(() => import('./SAVirtualMeeting'));

/* ═══ Role-specific page components (rendered in the SA shell for superadmin) ═══ */
const GradeEntry         = lazy(() => import('../teacher/GradeEntry'));
const MyClasses          = lazy(() => import('../teacher/MyClasses'));
const StudentGrades      = lazy(() => import('../student/StudentGrades'));
const StudentAttendance  = lazy(() => import('../student/StudentAttendance'));
const StudentTimetable   = lazy(() => import('../student/StudentTimetable'));
const StudentHome        = lazy(() => import('../student/StudentHome'));
const StudentReportCards = lazy(() => import('../student/StudentReportCards'));
const StudentFinancials  = lazy(() => import('../student/StudentFinancials'));
const StudentAssignments = lazy(() => import('../student/StudentAssignments'));
const StudentLiveClasses = lazy(() => import('../student/StudentLiveClasses'));
const StudentProfile     = lazy(() => import('../student/StudentProfile'));
const StudentNotifications = lazy(() => import('../student/StudentNotifications'));
const ParentGrades       = lazy(() => import('../parent/ParentGrades'));
const ParentAttendance   = lazy(() => import('../parent/ParentAttendance'));
const BursarOverview     = lazy(() => import('../bursar/BursarOverview'));
const BursarHome         = lazy(() => import('../bursar/BursarHome'));
const StudentFees        = lazy(() => import('../bursar/StudentFees'));
const FeeCategories      = lazy(() => import('../bursar/FeeCategories'));
const Payments           = lazy(() => import('../bursar/Payments'));
const Expenses           = lazy(() => import('../bursar/Expenses'));
const FinanceTeam        = lazy(() => import('../bursar/FinanceTeam'));
const FinanceReports     = lazy(() => import('../bursar/Reports'));
const GradeApprovals     = lazy(() => import('../principal/GradeApprovals'));
const ReportCardApproval = lazy(() => import('../principal/ReportCardApproval'));
const PrincipalHome      = lazy(() => import('../principal/PrincipalHome'));
const PrincipalUsers     = lazy(() => import('../principal/PrincipalUsers'));
const SyllabusProgress   = lazy(() => import('../principal/SyllabusProgress'));
const AttendanceReport   = lazy(() => import('../principal/AttendanceReport'));
const PublishedReportCards = lazy(() => import('../principal/PublishedReportCards'));

/* Self-contained role portals — own providers, nav, router and design system.
   Teachers, parents and students render their full dedicated dashboard instead
   of the SA shell (each is its own code-split chunk). */
const TeacherDashboard   = lazy(() => import('../teacher/TeacherDashboard'));
const ParentDashboard    = lazy(() => import('../parent/ParentDashboard'));
const StudentDashboard   = lazy(() => import('../student/StudentDashboard'));

/* School-admin suite pages (named exports) — fill the previously-blank admin
   nav items. Token-scoped fetches; superadmin scopes via SASchoolScope. */
const ExamsPage              = named(() => import('../schooladmin/NewPages'), 'ExamsPage');
const TimetablePage          = named(() => import('../schooladmin/NewPages'), 'TimetablePage');
const FinanceUsersPage       = named(() => import('../schooladmin/NewPages'), 'FinanceUsersPage');
const RoomsPage              = named(() => import('../schooladmin/SAExtraPages'), 'RoomsPage');
const GradingSchemePage      = named(() => import('../schooladmin/SAExtraPages'), 'GradingSchemePage');
const AcademicCalendarPage   = named(() => import('../schooladmin/SAExtraPages'), 'AcademicCalendarPage');
const StudentPromotionPage   = named(() => import('../schooladmin/SAExtraPages'), 'StudentPromotionPage');
const TeacherAssignmentsPage = named(() => import('../schooladmin/SAExtraPages'), 'TeacherAssignmentsPage');
const ExamOfficersPage       = named(() => import('../schooladmin/SAExtraPages'), 'ExamOfficersPage');
const AIDocumentCapture      = lazy(() => import('../schooladmin/AIDocumentCapture'));




/* ================================================================
   SVG Icons — inline, no external deps
   ================================================================ */
const IcHome = () => (
  <svg viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const IcApplications = () => (
  <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="9" y="3" width="6" height="4" rx="1" strokeWidth="1.8"/>
    <line x1="9" y1="12" x2="15" y2="12" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="9" y1="16" x2="13" y2="16" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IcRejected = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);
const IcSchools = () => (
  <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V10.6M19 21V10.6M12 3L2 8h20L12 3z"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="9" y="13" width="6" height="8" strokeWidth="1.8" rx="1"/>
  </svg>
);
const IcGen = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const IcBell = () => (
  <svg viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const IcLogout = () => (
  <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcMenu = () => (
  <svg viewBox="0 0 24 24"><line x1="3" y1="6"  x2="21" y2="6"  strokeWidth="2" strokeLinecap="round"/>
    <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2" strokeLinecap="round"/>
    <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);


/* ================================================================
   Global Search Modal (⌘K / Ctrl+K)
   ================================================================ */
function GlobalSearch({ pages, schools, onSelect, onClose }) {
  const [q,         setQ]         = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const qLower = q.toLowerCase().trim();
  const pageResults   = qLower
    ? pages.filter(p => p.label.toLowerCase().includes(qLower) || (p.section || '').toLowerCase().includes(qLower))
    : pages.slice(0, 10);
  const schoolResults = qLower
    ? schools.filter(s => (s.name || '').toLowerCase().includes(qLower) || (s.email || '').toLowerCase().includes(qLower)).slice(0, 5)
    : [];

  const allResults = [
    ...pageResults.map(p => ({ type: 'page',   key: p.key, label: p.label, sub: p.section || '', icon: p.icon })),
    ...schoolResults.map(s => ({ type: 'school', key: 'schools', label: s.name, sub: s.email, icon: null })),
  ];

  const clamp = v => Math.max(0, Math.min(v, allResults.length - 1));
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => clamp(i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => clamp(i - 1)); }
    else if (e.key === 'Enter' && allResults[activeIdx]) { onSelect(allResults[activeIdx].key); }
    else if (e.key === 'Escape') { onClose(); }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="sa-search-modal"
        style={{ background: 'var(--sa-card-bg)', border: '1px solid var(--sa-border)', borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--sa-border)' }}>
          <span style={{ color: 'var(--sa-text-2)', flexShrink: 0, display: 'flex' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages or schools…"
            value={q}
            onChange={e => { setQ(e.target.value); setActiveIdx(0); }}
            onKeyDown={handleKeyDown}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '0.9375rem', color: 'var(--sa-text)', fontFamily: 'var(--sa-font)' }}
          />
          <kbd style={{ fontSize: '0.7rem', color: 'var(--sa-text-3)', background: 'var(--sa-card-bg2)', padding: '2px 7px', borderRadius: 4, border: '1px solid var(--sa-border)', flexShrink: 0 }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {allResults.length === 0 && q.trim() ? (
            <p style={{ textAlign: 'center', color: 'var(--sa-text-3)', fontSize: '0.875rem', padding: '28px 0', margin: 0 }}>No results for "{q}"</p>
          ) : (
            <>
              {pageResults.length > 0 && (
                <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--sa-text-3)', padding: '10px 16px 4px', margin: 0 }}>
                  {q.trim() ? 'Pages' : 'All Pages'}
                </p>
              )}
              {allResults.map((item, i) => (
                <React.Fragment key={i}>
                  {item.type === 'school' && i === pageResults.length && (
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--sa-text-3)', padding: '8px 16px 4px', margin: 0, borderTop: pageResults.length > 0 ? '1px solid var(--sa-border)' : 'none' }}>
                      Schools
                    </p>
                  )}
                  <button
                    onClick={() => onSelect(item.key)}
                    onMouseEnter={() => setActiveIdx(i)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', background: i === activeIdx ? 'var(--sa-accent-dim)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--sa-text)', fontFamily: 'var(--sa-font)', transition: 'background 0.1s' }}
                  >
                    {item.type === 'page'
                      ? <span style={{ width: 20, height: 20, color: 'var(--sa-accent)', flexShrink: 0, display: 'flex' }}>{item.icon}</span>
                      : <span style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--sa-card-bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'var(--sa-accent)', flexShrink: 0 }}>{(item.label || 'S')[0].toUpperCase()}</span>
                    }
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    {item.sub && <span style={{ fontSize: '0.72rem', color: 'var(--sa-text-3)', flexShrink: 0 }}>{item.sub}</span>}
                  </button>
                </React.Fragment>
              ))}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--sa-border)', display: 'flex', gap: 16 }}>
          {[['↵', 'Select'], ['↑↓', 'Navigate'], ['ESC', 'Close']].map(([key, label]) => (
            <span key={key} style={{ fontSize: '0.72rem', color: 'var(--sa-text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <kbd style={{ background: 'var(--sa-card-bg2)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--sa-border)', fontFamily: 'monospace' }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Page title helper
   ================================================================ */
function getTitle(page, school) {
  if ((page === 'review' || page === 'app-history' || page === 'version-compare') && school) return school.name;
  if (page === 'rejection-audit' && school) return school.name;
  const map = {
    overview:              'Dashboard',
    applications:          'Applications',
    rejected:              'Rejected',
    schools:               'Schools',
    'academic-year':       'Year',
    'academic-terms':      'Terms',
    'institution-type':    'Institution Type',
    'school-capacity':     'School Capacity',
    countries:             'Countries',
    regions:               'Regions',
    cities:                'Cities',
    'school-type':         'School Type',
    'syllabus-type':       'Syllabus Type',
    'class-subtype':       'Class Subtype',
    'academic-system':     'Academic System',
    'grading-system':      'Grading System',
    'classes':             'Classes',
    'subjects':            'Subjects',
    'principal':           'Principal',
    'bursar':              'Bursar',
    'account-teachers':    'Teachers',
    'account-students':    'Students',
    'account-parents':     'Parent',
    'grade-integrity':     'Grade Integrity',
    'grades-accumulation': 'Grades Accumulation',
    test:                  'Test',
    assignment:            'Assignment',
    examination:           'Examination',
    'attendance-teachers': 'Record Attendance',
    'attendance-students': 'Attendance View',
    'attendance-report':   'Attendance Report',
    'lesson-plan-type':    'Lesson Plan Type',
    'lesson-plan-generation': 'Lesson Plan Generation',
    'grade-entry':            'Grade Entry',
    'my-classes':             'My Classes',
    'my-grades':              'My Grades',
    'my-attendance':          'My Attendance',
    'my-timetable':           'My Timetable',
    'children-grades':        "Children's Grades",
    'children-attendance':    "Children's Attendance",
    'fee-dashboard':          'Fee Dashboard',
    'fee-categories':         'Fee Categories',
    'student-fees':           'Student Fees',
    'payments':               'Payments',
    'expenses':               'Expenses',
    'finance-team':           'Finance Team',
    'finance-reports':        'Reports & Analytics',
    'grade-approvals':        'Grade Approvals',
    'batch-grades':        'Grades',
    'batch-students':      'Students',
    'batch-image-data':    'Image Data Transfer',
    'lesson-plans':        'Lesson Plans',
    'timetable':           'Timetable',
    'timetable-mgr':       'Timetable Manager',
    'my-fees':             'My Fees',
    'my-report-cards':     'My Report Cards',
    'children-report-cards': "Children's Report Cards",
    'fees-structure':      'Fees Structure',
    'fees-payment':        'Fees Payment',
    'receipt-generator':   'Receipt Generator',
    'school-financial-report': 'School Financial Report',
    'grades-approval':     'Grades Approval',
    'report-card-generator': 'Report Card Generator',
    'report-card-approval':  'Report Card Approval',
    'report-cards-published': 'Published Report Cards',
    'syllabus-progress':    'Syllabus Progress',
    'exam-schedule':        'Exam Schedule',
    rooms:                  'Rooms',
    'grading-scheme':       'Grading Scheme',
    'academic-calendar':    'Academic Calendar',
    promotions:             'Promotions',
    'teacher-assignments':  'Teacher Assignments',
    'exam-officers':        'Exam Officers',
    'ai-capture':           'AI Capture',
    'finance-users':        'Finance Users',
    'live-class':          'Live Class',
    'vm-parents':          'Parents',
    'vm-staffs':           'Staffs',
    'vm-students':         'Students',
    notifications:         'Notifications',
    'system-audits':       'System Audits',
    reports:               'Reports',
    settings:              'System Settings',
    profile:               'My Profile',
  };
  return map[page] || page.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* Page keys that have a real render block above the StubPage fallback.
   Anything not in this Set falls through to StubPage. Keep in sync with the
   render blocks in <main>. */
const HANDLED_PAGES = new Set([
  'overview', 'applications', 'review', 'app-history', 'version-compare', 'rejected',
  'rejection-audit', 'grade-report', 'grade-requests', 'grade-audit', 'security-logs',
  'forensics', 'alert-broadcast', 'change-alerts', 'system-health', 'schools', 'analytics',
  'benchmarks', 'onboarding', 'governance', 'users', 'notifications', 'settings', 'profile',
  'academic-terms', 'academic-year', 'institution-type', 'school-capacity', 'countries',
  'regions', 'cities', 'school-type', 'syllabus-type', 'class-subtype', 'academic-system',
  'grading-system', 'classes', 'subjects', 'principal', 'bursar', 'account-teachers',
  'account-students', 'account-parents', 'grade-entry', 'my-classes', 'my-grades',
  'my-attendance', 'my-timetable', 'children-grades', 'children-attendance', 'fee-dashboard',
  'fee-categories', 'student-fees', 'payments', 'expenses', 'finance-team', 'finance-reports',
  'grade-approvals', 'report-card-approval', 'principal-users', 'lesson-plans', 'timetable',
  'timetable-mgr', 'my-fees', 'my-report-cards', 'children-report-cards', 'attendance-teachers',
  'attendance-students', 'report-cards-published', 'syllabus-progress', 'attendance-report',
  'finance-users', 'exam-schedule', 'rooms', 'grading-scheme', 'academic-calendar', 'promotions',
  'teacher-assignments', 'exam-officers', 'ai-capture',
  /* Newly wired pages */
  'lesson-plan-type', 'grade-integrity', 'grades-accumulation',
  'batch-students', 'batch-grades', 'batch-image-data',
  'reports', 'school-financial-report', 'system-audits',
  'vm-parents', 'vm-staffs', 'vm-students',
  /* Student pages */
  'assignment', 'live-class',
]);

/* StudentHome emits its own short nav keys; map them to this shell's
   activePage keys so a student's home links land on the right pages. */
const STUDENT_NAV_MAP = {
  grades: 'my-grades',
  'report-cards': 'my-report-cards',
  timetable: 'my-timetable',
  attendance: 'my-attendance',
  assignments: 'assignment',
  fees: 'my-fees',
  notifications: 'notifications',
};

function StubPage({ title }) {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📄</div>
      <h2 style={{ margin: '0 0 8px', color: 'var(--sa-text-1)' }}>{title}</h2>
      <p style={{ margin: 0, color: 'var(--sa-text-3)' }}>This section is under development.</p>
    </div>
  );
}

/* Suspense fallbacks for the lazy-loaded chunks. */
function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div className="sa-loader-ring" />
    </div>
  );
}
function FullFallback() {
  return (
    <div className="sa-fullscreen-loader">
      <div className="sa-loader-ring" />
      <p className="sa-loader-text">Loading EK-SMS…</p>
    </div>
  );
}

/* ================================================================
   Main Dashboard Component
   ================================================================ */
export default function Dashboard({ onNavigate }) {
  const [user,            setUser]            = useState(null);
  const schoolId   = user?.school_id;
  const teacherId  = user?.id;
  const studentId  = user?.id;
  const parentId   = user?.id;
  const [activePage,      setActivePage]      = useState('overview');
  const [selectedSchool,  setSelectedSchool]  = useState(null);
  const [forensicEvent,   setForensicEvent]   = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [schools,         setSchools]         = useState([]);
  const [gradeAlerts,    setGradeAlerts]     = useState([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [toast,           setToast]           = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [searchOpen,       setSearchOpen]       = useState(false);
  const [secLogFilter,     setSecLogFilter]     = useState('');
  const [profileAvatar,    setProfileAvatar]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('ek-sms-profile') || '{}').avatarSrc || null; } catch { return null; }
  });

  /* ---- Data ---- */
  const fetchGradeAlerts = useCallback(async () => {
    try {
      const data = await ApiClient.get('/api/grade-alerts/');
      if (data.success) setGradeAlerts(data.alerts);
    } catch { /* silently ignore */ }
  }, []);

  const fetchSchools = useCallback(async () => {
    try {
      const data = await ApiClient.get('/api/schools/');
      if (data.success) setSchools(data.schools);
    } catch { /* network error — silently ignore */ }
    finally { setIsLoading(false); }
  }, []);

  const fetchMySchool = useCallback(async (schoolId) => {
    try {
      const data = await ApiClient.get(`/api/schools/${schoolId}/`);
      if (data.success) setSchools([data.school]);
    } catch { /* silently ignore */ }
    finally { setIsLoading(false); }
  }, []);

  /* ---- Auth guard ---- */
  useEffect(() => {
    const token   = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) { onNavigate && onNavigate('home'); return; }
    try {
      const parsed = JSON.parse(userStr);
      if (!parsed.role) { onNavigate && onNavigate('home'); return; }
      setUser(parsed);
      if (parsed.role === 'superadmin') {
        fetchSchools();
      } else if (parsed.school_id) {
        fetchMySchool(parsed.school_id);
      } else {
        setIsLoading(false);
      }
      fetchGradeAlerts();
    } catch { onNavigate && onNavigate('home'); }
  }, [onNavigate, fetchSchools, fetchMySchool, fetchGradeAlerts]);

  /* ---- Global search keyboard shortcut ---- */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(s => !s); }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ---- Actions ---- */
  const handleAction = useCallback(async (schoolId, action, note = '') => {
    setIsActionLoading(true);
    try {
      const data = await ApiClient.post('/api/schools/approve/', { 
        school_id: schoolId, action, note 
      });
      if (data.success) {
        showToast(data.message, 'success');
        await fetchSchools();
        setActivePage('applications');
        setSelectedSchool(null);
      } else {
        showToast(data.message || 'Action failed', 'error');
      }
    } catch { showToast('Connection error. Please try again.', 'error'); }
    finally   { setIsActionLoading(false); }
  }, [fetchSchools]);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* ---- Navigation helpers ---- */
  const handleReview = (school) => {
    setSelectedSchool(school);
    setActivePage('review');
  };

  const handleHistory = (school) => {
    setSelectedSchool(school);
    setActivePage('app-history');
  };

  const handleCompare = (school) => {
    setSelectedSchool(school);
    setActivePage('version-compare');
  };

  const handleRejectionAudit = (school) => {
    setSelectedSchool(school);
    setActivePage('rejection-audit');
  };

  const handleReconsider = (school) => {
    handleAction(school.id, 'request_changes', 'Reconsidering rejected application');
  };

  const handleForensic = (event) => {
    setForensicEvent(event);
    setActivePage('forensics');
  };

  const handleGradeDetail = (req) => {
    setSelectedRequest(req);
    setActivePage('grade-audit');
  };

  const handleBatchAction = useCallback(async (ids, action) => {
    if (!ids.length) return;
    setIsActionLoading(true);
    try {
      for (const id of ids) {
        await ApiClient.post('/api/schools/approve/', { 
          school_id: id, action 
        }).catch(() => {});
      }
      showToast(`${ids.length} school${ids.length !== 1 ? 's' : ''} ${action === 'approve' ? 'approved' : 'rejected'}`, 'success');
      await fetchSchools();
    } catch { showToast('Batch action partially failed', 'error'); }
    finally { setIsActionLoading(false); }
  }, [fetchSchools]);

  const handleGradeRequests = () => {
    setActivePage('grade-requests');
  };

  const handleGradeBack = () => {
    setActivePage('grade-requests');
    setSelectedRequest(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onNavigate && onNavigate('home');
  };

  const SEC_PAGES   = ['security-logs', 'forensics', 'alert-broadcast', 'system-health', 'change-alerts'];
  const GRADE_PAGES = ['grade-report', 'grade-requests', 'grade-audit'];

  const goTo = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
    if (!['review', 'app-history', 'version-compare', 'rejection-audit'].includes(page)) {
      setSelectedSchool(null);
    }
    if (page !== 'forensics') {
      setForensicEvent(null);
    }
    if (!GRADE_PAGES.includes(page)) {
      setSelectedRequest(null);
    }
  };

  /* ---- Loading screen ---- */
  if (isLoading) {
    return (
      <div className="sa-fullscreen-loader">
        <div className="sa-loader-ring" />
        <p className="sa-loader-text">Loading EK-SMS Console…</p>
      </div>
    );
  }

  /* ---- Dedicated role portals (teacher / parent / student) ----
     These ship their own providers, sidebar, routing and design system, so they
     replace the SA shell entirely rather than rendering inside <main>. Each is a
     lazy chunk, so it loads only for that role. */
  if (user?.role === 'teacher') return <Suspense fallback={<FullFallback />}><TeacherDashboard onNavigate={onNavigate} /></Suspense>;
  if (user?.role === 'parent')  return <Suspense fallback={<FullFallback />}><ParentDashboard  onNavigate={onNavigate} /></Suspense>;
  if (user?.role === 'student') return <Suspense fallback={<FullFallback />}><StudentDashboard onNavigate={onNavigate} /></Suspense>;

  const pendingCount      = schools.filter(s => !s.is_approved && !s.changes_requested).length;
  const rejectedCount     = schools.filter(s => !s.is_approved && !s.is_active).length;

  /* School-scoped pages (finance / approvals / attendance / report cards)
     resolve their tenant from the token's school_id. Superadmins carry none,
     so wrap those pages in the SASchoolScope picker; school staff render
     directly against their own school. */
  const scoped = (node, hint) => (
    user?.role === 'superadmin'
      ? <SASchoolScope schools={schools} hint={hint}>{node}</SASchoolScope>
      : node
  );

  const isAppRelated   = ['applications', 'review', 'app-history', 'version-compare'].includes(activePage);
  const isRejRelated   = ['rejected', 'rejection-audit'].includes(activePage);
  const isSecRelated   = SEC_PAGES.includes(activePage);
  const isGradeRelated = GRADE_PAGES.includes(activePage);

  const ALL_NAV_ITEMS = [
    { key: 'overview',        label: 'Dashboard',    icon: <IcHome />,         badge: 0,            section: null },
    { key: 'applications',    label: 'Applications', icon: <IcApplications />, badge: pendingCount, section: null },
    { key: 'rejected',        label: 'Rejected',     icon: <IcRejected />,     badge: rejectedCount,section: null },
    { key: 'schools',         label: 'Schools',      icon: <IcSchools />,      badge: 0,            section: null },

    /* Academics */
    { key: 'academic-year',       label: 'Year',              icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'academic-terms',      label: 'Terms',             icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'institution-type',    label: 'Institution Type',  icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'school-capacity',     label: 'School Capacity',   icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'countries',           label: 'Countries',         icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'regions',             label: 'Regions',           icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'cities',              label: 'Cities',            icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'school-type',         label: 'School Type',       icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'syllabus-type',       label: 'Syllabus Type',     icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'class-subtype',       label: 'Class Subtype',     icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'academic-system',     label: 'Academic System',   icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'grading-system',      label: 'Grading System',    icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'classes',             label: 'Classes',           icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'subjects',            label: 'Subjects',          icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'principal',           label: 'Principal',         icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'bursar',              label: 'Bursar',            icon: <IcGen />, badge: 0, section: 'Academics' },

    /* Accounts (under Academics) */
    { key: 'account-teachers',  label: 'Teachers', icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'account-students',  label: 'Students', icon: <IcGen />, badge: 0, section: 'Academics' },
    { key: 'account-parents',   label: 'Parent',   icon: <IcGen />, badge: 0, section: 'Academics' },

    /* Grades */
    { key: 'grade-integrity',     label: 'Grade Integrity',    icon: <IcGen />, badge: 0, section: 'Grades' },
    { key: 'grades-accumulation', label: 'Grades Accumulation',icon: <IcGen />, badge: 0, section: 'Grades' },
    { key: 'test',                label: 'Test',               icon: <IcGen />, badge: 0, section: 'Grades' },
    { key: 'assignment',          label: 'Assignment',         icon: <IcGen />, badge: 0, section: 'Grades' },
    { key: 'examination',         label: 'Examination',        icon: <IcGen />, badge: 0, section: 'Grades' },

    /* Attendance */
    { key: 'attendance-record',  label: 'Record',   icon: <IcGen />, badge: 0, section: 'Attendance' },
    { key: 'attendance-report',  label: 'Report',    icon: <IcGen />, badge: 0, section: 'Attendance' },
    { key: 'attendance-teachers', label: 'Teachers', icon: <IcGen />, badge: 0, section: 'Attendance' },
    { key: 'attendance-students', label: 'Students', icon: <IcGen />, badge: 0, section: 'Attendance' },

    /* Lessons */
    { key: 'lesson-plans',           label: 'Lesson Plans',           icon: <IcGen />, badge: 0, section: 'Lessons' },
    { key: 'lesson-plan-type',       label: 'Lesson Plan Type',       icon: <IcGen />, badge: 0, section: 'Lessons' },
    { key: 'lesson-plan-generation', label: 'Lesson Plan Generation', icon: <IcGen />, badge: 0, section: 'Lessons' },
    { key: 'timetable',              label: 'Timetable',              icon: <IcGen />, badge: 0, section: 'Lessons' },
    { key: 'timetable-mgr',          label: 'Timetable Manager',      icon: <IcGen />, badge: 0, section: 'Lessons' },

    /* Teacher */
    { key: 'grade-entry',  label: 'Grade Entry',  icon: <IcGen />, badge: 0, section: 'Teacher' },
    { key: 'my-classes',   label: 'My Classes',   icon: <IcGen />, badge: 0, section: 'Teacher' },

    /* Student */
    { key: 'my-grades',      label: 'My Grades',      icon: <IcGen />, badge: 0, section: 'Student' },
    { key: 'my-attendance',  label: 'My Attendance',  icon: <IcGen />, badge: 0, section: 'Student' },
    { key: 'my-timetable',   label: 'My Timetable',   icon: <IcGen />, badge: 0, section: 'Student' },
    { key: 'my-fees',        label: 'My Fees',        icon: <IcGen />, badge: 0, section: 'Student' },
    { key: 'my-report-cards',label: 'My Report Cards',icon: <IcGen />, badge: 0, section: 'Student' },

    /* Parent */
    { key: 'children-grades',      label: "Children's Grades",      icon: <IcGen />, badge: 0, section: 'Parent' },
    { key: 'children-attendance',  label: "Children's Attendance",  icon: <IcGen />, badge: 0, section: 'Parent' },
    { key: 'children-report-cards',label: "Children's Report Cards",icon: <IcGen />, badge: 0, section: 'Parent' },

    /* Batch Transfer */
    { key: 'batch-grades',      label: 'Grades',             icon: <IcGen />, badge: 0, section: 'Batch Transfer' },
    { key: 'batch-students',    label: 'Students',           icon: <IcGen />, badge: 0, section: 'Batch Transfer' },
    { key: 'batch-image-data',  label: 'Image Data Transfer',icon: <IcGen />, badge: 0, section: 'Batch Transfer' },

    /* Fees */
    { key: 'fee-dashboard',     label: 'Fee Dashboard',     icon: <IcGen />, badge: 0, section: 'Fees' },
    { key: 'fee-categories',    label: 'Fee Categories',    icon: <IcGen />, badge: 0, section: 'Fees' },
    { key: 'fees-structure',    label: 'Fees Structure',  icon: <IcGen />, badge: 0, section: 'Fees' },
    { key: 'fees-payment',      label: 'Fees Payment',    icon: <IcGen />, badge: 0, section: 'Fees' },
    { key: 'payments',          label: 'Payments',         icon: <IcGen />, badge: 0, section: 'Fees' },
    { key: 'expenses',          label: 'Expenses',         icon: <IcGen />, badge: 0, section: 'Fees' },
    { key: 'receipt-generator', label: 'Receipt Generator',icon: <IcGen />, badge: 0, section: 'Fees' },
    { key: 'school-financial-report', label: 'School Financial Report', icon: <IcGen />, badge: 0, section: 'Fees' },

    /* Grades Approval (no section) */
    { key: 'grade-approvals',   label: 'Grade Approvals', icon: <IcGen />, badge: 0, section: null },

    /* Leadership Team (Principal users) */
    { key: 'principal-users',   label: 'Leadership Team', icon: <IcGen />, badge: 0, section: null },

    /* Report Cards */
    { key: 'report-card-generator', label: 'Report Card Generator', icon: <IcGen />, badge: 0, section: 'Report Cards' },
    { key: 'report-card-approval',  label: 'Report Card Approval',  icon: <IcGen />, badge: 0, section: 'Report Cards' },
    { key: 'report-cards-published',label: 'Published Report Cards',icon: <IcGen />, badge: 0, section: 'Report Cards' },

    /* School Admin */
    { key: 'syllabus-progress', label: 'Syllabus Progress', icon: <IcGen />, badge: 0, section: 'School Admin' },
    { key: 'exam-schedule',     label: 'Exam Schedule',     icon: <IcGen />, badge: 0, section: 'School Admin' },
    { key: 'rooms',             label: 'Rooms',             icon: <IcGen />, badge: 0, section: 'School Admin' },
    { key: 'grading-scheme',    label: 'Grading Scheme',    icon: <IcGen />, badge: 0, section: 'School Admin' },
    { key: 'academic-calendar', label: 'Academic Calendar', icon: <IcGen />, badge: 0, section: 'School Admin' },
    { key: 'promotions',        label: 'Promotions',        icon: <IcGen />, badge: 0, section: 'School Admin' },
    { key: 'teacher-assignments', label: 'Teacher Assignments', icon: <IcGen />, badge: 0, section: 'School Admin' },
    { key: 'exam-officers',     label: 'Exam Officers',     icon: <IcGen />, badge: 0, section: 'School Admin' },
    { key: 'ai-capture',        label: 'AI Capture',        icon: <IcGen />, badge: 0, section: 'School Admin' },
    { key: 'finance-users',     label: 'Finance Users',     icon: <IcGen />, badge: 0, section: 'School Admin' },

    /* Virtual Class */
    { key: 'live-class', label: 'Live Class', icon: <IcGen />, badge: 0, section: 'Virtual Class' },

    /* Virtual Meeting */
    { key: 'vm-parents',  label: 'Parents',  icon: <IcGen />, badge: 0, section: 'Virtual Meeting' },
    { key: 'vm-staffs',   label: 'Staffs',   icon: <IcGen />, badge: 0, section: 'Virtual Meeting' },
    { key: 'vm-students', label: 'Students', icon: <IcGen />, badge: 0, section: 'Virtual Meeting' },

    /* Notifications, System Audits, Reports, System Settings */
    { key: 'notifications',   label: 'Notifications', icon: <IcBell />, badge: 0, section: null },
    { key: 'system-audits',   label: 'System Audits', icon: <IcGen />, badge: 0, section: null },
    { key: 'reports',         label: 'Reports',       icon: <IcGen />, badge: 0, section: null },
    { key: 'settings', label: 'System Settings',icon: <IcGen />, badge: 0, section: null },
  ];
  /* Principal gets a purpose-built, ordered sidebar instead of the
     superadmin item order (which would scatter their pages across
     unrelated section headers). Keys must stay valid in permissions.js. */
  const PRINCIPAL_NAV_ITEMS = [
    { key: 'overview',               label: 'Command Center',         icon: <IcHome />, badge: 0, section: null },
    { key: 'grade-approvals',        label: 'Grade Approvals',        icon: <IcGen />,  badge: 0, section: 'Approvals' },
    { key: 'report-card-approval',   label: 'Report Card Approval',   icon: <IcGen />,  badge: 0, section: 'Approvals' },
    { key: 'report-cards-published', label: 'Published Report Cards', icon: <IcGen />,  badge: 0, section: 'Approvals' },
    { key: 'syllabus-progress',      label: 'Syllabus Progress',      icon: <IcGen />,  badge: 0, section: 'Academics' },
    { key: 'attendance-report',      label: 'Attendance Report',      icon: <IcGen />,  badge: 0, section: 'Academics' },
    { key: 'principal-users',        label: 'Leadership Team',        icon: <IcGen />,  badge: 0, section: 'Team' },
    { key: 'notifications',          label: 'Notifications',          icon: <IcBell />, badge: 0, section: null },
  ];

  /* Bursar gets a purpose-built, ordered sidebar too — only real,
     fully-functional finance pages (no stub keys, no duplicates). */
  const BURSAR_NAV_ITEMS = [
    { key: 'overview',       label: 'Finance Center', icon: <IcHome />, badge: 0, section: null },
    { key: 'student-fees',   label: 'Student Fees',   icon: <IcGen />,  badge: 0, section: 'Fees' },
    { key: 'fee-categories', label: 'Fee Categories', icon: <IcGen />,  badge: 0, section: 'Fees' },
    { key: 'payments',        label: 'Payments',            icon: <IcGen />,  badge: 0, section: 'Money' },
    { key: 'expenses',        label: 'Expenses',            icon: <IcGen />,  badge: 0, section: 'Money' },
    { key: 'finance-reports', label: 'Reports & Analytics', icon: <IcGen />,  badge: 0, section: 'Insights' },
    { key: 'finance-team',    label: 'Finance Team',        icon: <IcGen />,  badge: 0, section: 'Team' },
    { key: 'notifications',  label: 'Notifications',  icon: <IcBell />, badge: 0, section: null },
  ];

  const navItems = (user?.role === 'principal' ? PRINCIPAL_NAV_ITEMS
    : user?.role === 'bursar' ? BURSAR_NAV_ITEMS
    : ALL_NAV_ITEMS)
    .filter(item => canAccess(item.key, user?.role));

  return (
    <div className={`sa-wrap${sidebarOpen ? ' sidebar-open' : ''}`}>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="sa-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ===== Sidebar ===== */}
      <aside className="sa-sidebar">
        <div className="sa-sidebar-head">
          <div className="sa-brand">
            <PruhLogo size={38} variant="white" />
            <div>
              <p className="sa-brand-name">EK-SMS</p>
              <p className="sa-brand-role">{ROLE_LABELS[user?.role] || 'Super Admin'}</p>
            </div>
          </div>
        </div>

        <nav className="sa-nav">
          {navItems.map((item, idx) => {
            const isActive =
              activePage === item.key ||
              (item.key === 'applications'  && isAppRelated) ||
              (item.key === 'rejected'      && isRejRelated) ||
              (item.key === 'security-logs' && isSecRelated && activePage === 'security-logs') ||
              (item.key === 'forensics'     && activePage === 'forensics') ||
              (item.key === 'alert-broadcast' && activePage === 'alert-broadcast') ||
              (item.key === 'system-health' && activePage === 'system-health') ||
              (item.key === 'grade-report'   && activePage === 'grade-report') ||
              (item.key === 'grade-requests' && (activePage === 'grade-requests' || activePage === 'grade-audit')) ||
              (item.key === 'governance'     && activePage === 'governance');
            const prevItem = navItems[idx - 1];
            const showHeader = item.section && (!prevItem || prevItem.section !== item.section);
            return (
              <React.Fragment key={item.key}>
                {showHeader && (
                  <p style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sa-text-3)', padding: '14px 16px 6px', margin: 0 }}>
                    {item.section}
                  </p>
                )}
                <button
                  className={`sa-nav-btn${isActive ? ' active' : ''}`}
                  onClick={() => goTo(item.key)}
                >
                  <span className="sa-nav-icon">{item.icon}</span>
                  <span className="sa-nav-label">{item.label}</span>
                  {item.badge > 0 && <span className="sa-nav-badge">{item.badge}</span>}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        <div className="sa-sidebar-foot">
          <div className="sa-user-chip" onClick={() => goTo('profile')} style={{ cursor: 'pointer' }} title="My profile">
            <div className="sa-user-avatar" style={profileAvatar ? { padding: 0, overflow: 'hidden' } : {}}>
              {profileAvatar
                ? <img src={profileAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                : (user?.full_name || user?.email || 'A')[0].toUpperCase()
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <p className="sa-user-name">{user?.full_name || user?.username || 'Admin'}</p>
              <p className="sa-user-role">{ROLE_LABELS[user?.role] || 'Super Admin'}</p>
            </div>
          </div>
          <button className="sa-logout-btn" onClick={handleLogout}>
            <IcLogout /> Logout
          </button>
        </div>
      </aside>

      {/* ===== Main area ===== */}
      <div className="sa-main">

        {/* TopBar */}
        <header className="sa-topbar">
          <button className="sa-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <IcMenu />
          </button>
          <div className="sa-breadcrumb">
            <span className="sa-bc-parent">Admin</span>
            <span className="sa-bc-sep">›</span>
            <span className="sa-bc-current">{getTitle(activePage, selectedSchool)}</span>
          </div>
          <div className="sa-topbar-actions">
            <button
              className="sa-notif-btn"
              onClick={() => setSearchOpen(true)}
              title="Search (Ctrl+K)"
              aria-label="Open global search"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button className="sa-notif-btn" onClick={() => goTo('notifications')}>
              <IcBell />
              {(pendingCount > 0 || unreadNotifCount > 0) && <span className="sa-notif-dot" />}
            </button>
            <div className="sa-avatar-sm" onClick={() => goTo('profile')} title="My profile" style={{ cursor: 'pointer', padding: profileAvatar ? 0 : undefined, overflow: profileAvatar ? 'hidden' : undefined }}>
              {profileAvatar
                ? <img src={profileAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                : (user?.full_name || user?.email || 'A')[0].toUpperCase()
              }
            </div>
          </div>
        </header>

        {/* Toast */}
        {toast && <div className={`sa-toast sa-toast--${toast.type}`}>{toast.msg}</div>}

        {/* Page content */}
        <main className="sa-content">
          <Suspense fallback={<PageFallback />}>

          {activePage === 'overview' && (
            user?.role === 'principal'
              ? <PrincipalHome navigateTo={goTo} schoolId={schoolId} />
              : user?.role === 'bursar'
              ? <BursarHome navigateTo={goTo} schoolId={schoolId} />
              : user?.role === 'student'
              ? <StudentHome navigateTo={(k) => goTo(STUDENT_NAV_MAP[k] || k)} />
              : (
                <SAOverview
                  schools={schools}
                  user={user}
                  onReview={handleReview}
                  onNavigate={goTo}
                />
              )
          )}

          {activePage === 'applications' && (
            <SAApplications
              schools={schools}
              onReview={handleReview}
              onBatchAction={handleBatchAction}
            />
          )}

          {activePage === 'review' && selectedSchool && (
            <SAReview
              school={selectedSchool}
              onBack={() => { setActivePage('applications'); setSelectedSchool(null); }}
              onApprove={() => handleAction(selectedSchool.id, 'approve')}
              onReject={(note) => handleAction(selectedSchool.id, 'reject', note)}
              onRequestChanges={(note) => handleAction(selectedSchool.id, 'request_changes', note)}
              onHistory={handleHistory}
              isLoading={isActionLoading}
            />
          )}

          {activePage === 'app-history' && selectedSchool && (
            <SAAppHistory
              school={selectedSchool}
              onBack={() => setActivePage('review')}
              onCompare={() => handleCompare(selectedSchool)}
            />
          )}

          {activePage === 'version-compare' && selectedSchool && (
            <SAVersionCompare
              school={selectedSchool}
              onBack={() => setActivePage('app-history')}
              onApprove={() => handleAction(selectedSchool.id, 'approve')}
              isLoading={isActionLoading}
            />
          )}

          {activePage === 'rejected' && (
            <SARejected
              schools={schools}
              onAudit={handleRejectionAudit}
              onReconsider={handleReconsider}
            />
          )}

          {activePage === 'rejection-audit' && selectedSchool && (
            <SARejectionAudit
              school={selectedSchool}
              onBack={() => { setActivePage('rejected'); setSelectedSchool(null); }}
              onReconsider={handleReconsider}
            />
          )}

          {activePage === 'grade-report' && (
            <SAGradeReport
              onViewRequests={handleGradeRequests}
              onViewDetail={handleGradeDetail}
            />
          )}

          {activePage === 'grade-requests' && (
            <SAGradeIntegrity onDetail={handleGradeDetail} />
          )}

          {activePage === 'grade-audit' && (
            <SAGradeAuditDetail
              request={selectedRequest}
              onBack={handleGradeBack}
            />
          )}

          {activePage === 'security-logs' && (
            <SASecurityLogs
              onForensic={handleForensic}
              initialSearch={secLogFilter}
              onMount={() => setSecLogFilter('')}
            />
          )}

          {activePage === 'forensics' && (
            <SAForensics
              initialEvent={forensicEvent}
              onNavigate={(page, filter) => { if (filter) setSecLogFilter(filter); goTo(page); }}
            />
          )}

          {activePage === 'alert-broadcast' && (
            <SAAlertBroadcast onNavigate={goTo} />
          )}

          {activePage === 'change-alerts' && (
            <SAChangeAlerts />
          )}

          {activePage === 'system-health' && (
            <SASystemHealth />
          )}

          {activePage === 'schools' && (
            <SASchools schools={schools} onReview={handleReview} onAction={handleAction} />
          )}

          {activePage === 'analytics' && (
            <SAAnalytics schools={schools} onLoginAs={async (school) => {
              try {
                const data = await ApiClient.post('/api/impersonate/', { school_id: school.id });
                if (!data.success) { showToast(data.message || 'Could not impersonate admin.', 'error'); return; }
                // Save superadmin session so App.js can restore it
                sessionStorage.setItem('ek-sms-prev-token', localStorage.getItem('token') || '');
                sessionStorage.setItem('ek-sms-prev-user',  localStorage.getItem('user')  || '');
                sessionStorage.setItem('ek-sms-impersonating', JSON.stringify({ schoolName: school.name }));
                localStorage.setItem('token', data.token);
                localStorage.setItem('user',  JSON.stringify(data.user));
                window.dispatchEvent(new Event('storage'));
              } catch (err) {
                showToast(err.message || 'Impersonation failed.', 'error');
              }
            }} />
          )}

          {activePage === 'benchmarks' && (
            <SABenchmarks onNavigate={goTo} />
          )}

          {activePage === 'onboarding' && (
            <SAOnboarding schools={schools} />
          )}

          {activePage === 'governance' && (
            <SAGovernance />
          )}

          {activePage === 'users' && (
            <SAUsers onNavigate={goTo} />
          )}

          {activePage === 'notifications' && (
            user?.role === 'student'
              ? <StudentNotifications />
              : <SANotifications
                  onNavigate={goTo}
                  onUnreadChange={setUnreadNotifCount}
                  schools={schools}
                  gradeAlerts={gradeAlerts}
                />
          )}

          {activePage === 'settings' && (
            <SASettings />
          )}

          {activePage === 'profile' && (
            user?.role === 'student'
              ? <StudentProfile />
              : <SAProfile user={user} onBack={() => goTo('overview')} onAvatarChange={setProfileAvatar} />
          )}

          {activePage === 'academic-terms' && (
            <SACreateTerm onSave={(payload) => showToast('Term saved (logic pending)', 'success')} />
          )}

          {activePage === 'academic-year' && (
            <SARefDataManager
              title="Academic Years"
              subtitle="Define system-wide academic years. Roll out a year to activate it across all schools."
              endpoint="/api/academic-years/"
              listKey="years"
              itemLabel="academic year"
              hasRollout={true}
              hasHero={true}
              hasOverlapCheck={true}
              fields={[
                { key: 'name',       label: 'Name',       type: 'text', required: true, placeholder: 'e.g. 2024/2025' },
                { key: 'start_date', label: 'Start Date', type: 'date' },
                { key: 'end_date',   label: 'End Date',   type: 'date' },
              ]}
            />
          )}

          {activePage === 'institution-type' && (
            <SARefDataManager
              title="Institution Types"
              subtitle="Types of institutions that can register on the platform, e.g. Primary School, University."
              endpoint="/api/institution-types/"
              listKey="types"
              itemLabel="institution type"
              fields={[
                { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Primary School' },
              ]}
            />
          )}

          {activePage === 'school-capacity' && <SASchoolCapacity />}

          {activePage === 'countries' && (
            <SARefDataManager
              title="Countries"
              subtitle="Countries where schools can be located. Used to populate geography dropdowns during registration."
              endpoint="/api/countries/"
              listKey="countries"
              itemLabel="country"
              fields={[
                { key: 'name', label: 'Country Name', type: 'text', required: true, placeholder: 'e.g. Sierra Leone' },
              ]}
            />
          )}

          {activePage === 'regions' && (
            <SARefDataManager
              title="Regions"
              subtitle="Regions or provinces within a country. Select the parent country first."
              endpoint="/api/regions/"
              listKey="regions"
              itemLabel="region"
              fields={[
                { key: 'country_id', label: 'Country', type: 'select', required: true, loadFrom: '/api/countries/', optionsKey: 'countries', labelKey: 'name' },
                { key: 'name',       label: 'Region Name', type: 'text', required: true, placeholder: 'e.g. Western Area' },
              ]}
            />
          )}

          {activePage === 'cities' && (
            <SARefDataManager
              title="Cities"
              subtitle="Cities or towns within a region. Select country, then region, then enter the city name."
              endpoint="/api/cities/"
              listKey="cities"
              itemLabel="city"
              fields={[
                { key: 'country_id', label: 'Country', type: 'select', required: true, loadFrom: '/api/countries/', optionsKey: 'countries', labelKey: 'name' },
                { key: 'region_id',  label: 'Region',  type: 'select', required: true, loadFrom: '/api/regions/',   optionsKey: 'regions',   labelKey: 'name', dependsOn: 'country_id', dependsOnKey: 'country_id' },
                { key: 'name',       label: 'City Name', type: 'text', required: true, placeholder: 'e.g. Freetown' },
              ]}
            />
          )}

          {activePage === 'school-type' && (
            <SARefDataManager
              title="School Types"
              subtitle="Classification of schools by type, e.g. Government, Private, Mission."
              endpoint="/api/school-types/"
              listKey="schooltypes"
              itemLabel="school type"
              fields={[
                { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Government' },
              ]}
            />
          )}

          {activePage === 'syllabus-type' && (
            <SARefDataManager
              title="Syllabus Types"
              subtitle="Curriculum frameworks used by schools, e.g. WAEC, Cambridge, National."
              endpoint="/api/syllabus-types/"
              listKey="syllabustypes"
              itemLabel="syllabus type"
              fields={[
                { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. WAEC' },
              ]}
            />
          )}

          {activePage === 'class-subtype' && (
            <SARefDataManager
              title="Class Subtypes"
              subtitle="Sub-classifications of classroom types, e.g. Science, Arts, Commercial."
              endpoint="/api/class-subtypes/"
              listKey="classsubtypes"
              itemLabel="class subtype"
              fields={[
                { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Science' },
              ]}
            />
          )}

          {activePage === 'academic-system' && <SAAcademicSystem />}
          {activePage === 'grading-system' && <SAGradingSystem />}

          {activePage === 'classes' && <SAClasses />}

          {activePage === 'subjects' && <SASubjects />}

          {activePage === 'lesson-plan-type' && (
            <SARefDataManager
              title="Lesson Plan Types"
              subtitle="Categories of lesson plans teachers can create, e.g. Weekly, Unit, Daily, Scheme of Work."
              endpoint="/api/lesson-plan-types/"
              listKey="lessonplantypes"
              itemLabel="lesson plan type"
              fields={[
                { key: 'name',        label: 'Type Name',   type: 'text', required: true, placeholder: 'e.g. Weekly Plan' },
                { key: 'description', label: 'Description',  type: 'text', placeholder: 'Short description (optional)' },
              ]}
            />
          )}

          {/* ── Grades section ── */}
          {activePage === 'grade-integrity'     && <SAGradeIntegrity onDetail={handleGradeDetail} />}
          {activePage === 'grades-accumulation' && <SAGradesAccumulation onNavigate={goTo} />}

          {/* ── Batch Transfer ── */}
          {activePage === 'batch-students'   && <SABatchTransfer mode="students" />}
          {activePage === 'batch-grades'     && <SABatchTransfer mode="grades" />}
          {activePage === 'batch-image-data' && <SABatchTransfer mode="images" />}

          {/* ── Virtual Meeting (per audience) ── */}
          {activePage === 'vm-parents'  && <SAVirtualMeeting audience="parents" />}
          {activePage === 'vm-staffs'   && <SAVirtualMeeting audience="staffs" />}
          {activePage === 'vm-students' && <SAVirtualMeeting audience="students" />}

          {/* ── Reports hub ── */}
          {activePage === 'reports' && <SAReportsHub onNavigate={goTo} />}

          {/* ── System Audits → security audit log ── */}
          {activePage === 'system-audits' && (
            <SASecurityLogs
              onForensic={handleForensic}
              initialSearch={secLogFilter}
              onMount={() => setSecLogFilter('')}
            />
          )}

          {/* ── Teacher pages ── */}
          {activePage === 'grade-entry' && <GradeEntry navigateTo={goTo} schoolId={schoolId} teacherId={teacherId} />}
          {activePage === 'my-classes'  && <MyClasses  navigateTo={goTo} schoolId={schoolId} teacherId={teacherId} />}

          {/* ── Student pages ── */}
          {activePage === 'my-grades'       && <StudentGrades      navigateTo={goTo} studentId={studentId} schoolId={schoolId} />}
          {activePage === 'my-attendance'   && <StudentAttendance  studentId={studentId} />}
          {activePage === 'my-timetable'    && <StudentTimetable   studentId={studentId} />}
          {activePage === 'my-report-cards' && <StudentReportCards />}
          {activePage === 'my-fees'         && <StudentFinancials  />}
          {activePage === 'assignment'      && <StudentAssignments />}
          {activePage === 'live-class'      && <StudentLiveClasses />}

          {/* ── Parent pages ── */}
          {activePage === 'children-grades'     && <ParentGrades     parentId={parentId} />}
          {activePage === 'children-attendance' && <ParentAttendance parentId={parentId} />}

          {/* ── Bursar / Finance pages (school-scoped) ── */}
          {activePage === 'fee-dashboard'  && scoped(<BursarOverview navigateTo={goTo} schoolId={schoolId} />, 'Pick a school to view its finance command center.')}
          {activePage === 'student-fees'   && scoped(<StudentFees    schoolId={schoolId} />)}
          {activePage === 'fee-categories' && scoped(<FeeCategories  schoolId={schoolId} />)}
          {activePage === 'payments'       && scoped(<Payments       schoolId={schoolId} />)}
          {activePage === 'expenses'       && scoped(<Expenses       schoolId={schoolId} />)}
          {activePage === 'finance-team'   && scoped(<FinanceTeam    schoolId={schoolId} />)}
          {activePage === 'finance-reports' && scoped(<FinanceReports navigateTo={goTo} schoolId={schoolId} />)}
          {activePage === 'school-financial-report' && scoped(<FinanceReports navigateTo={goTo} schoolId={schoolId} />, 'Pick a school to view its financial report.')}

          {/* ── Principal / academic-leadership pages (school-scoped) ── */}
          {activePage === 'grade-approvals'        && scoped(<GradeApprovals      schoolId={schoolId} />, 'Pick a school to review its grade-change requests.')}
          {activePage === 'report-card-approval'   && scoped(<ReportCardApproval  schoolId={schoolId} />, 'Pick a school to review its report cards.')}
          {activePage === 'report-cards-published' && scoped(<PublishedReportCards schoolId={schoolId} />, 'Pick a school to view its published report cards.')}
          {activePage === 'principal-users'        && scoped(<PrincipalUsers      schoolId={schoolId} />)}
          {activePage === 'syllabus-progress'      && scoped(<SyllabusProgress    schoolId={schoolId} />)}
          {activePage === 'attendance-report'      && scoped(<AttendanceReport    schoolId={schoolId} />, 'Pick a school to view its attendance report.')}

          {activePage === 'principal' && <SAPrincipal />}

          {activePage === 'bursar' && <SABursar />}

          {activePage === 'account-teachers' && <SATeachers />}

          {activePage === 'account-students' && <SAStudents />}

          {activePage === 'account-parents' && <SAParents />}

          {/* ── School-admin suite (previously-blank admin nav items) ──
             School staff are token-scoped; superadmins pick a school first. */}
          {activePage === 'exam-schedule'       && scoped(<ExamsPage school={schools[0]} />,        'Pick a school to manage its exam schedule.')}
          {activePage === 'timetable-mgr'       && scoped(<TimetablePage school={schools[0]} />,    'Pick a school to manage its timetable.')}
          {activePage === 'rooms'               && scoped(<RoomsPage />,               'Pick a school to manage its rooms.')}
          {activePage === 'grading-scheme'      && scoped(<GradingSchemePage />,       'Pick a school to manage its grading scheme.')}
          {activePage === 'academic-calendar'   && scoped(<AcademicCalendarPage />,    'Pick a school to manage its academic calendar.')}
          {activePage === 'promotions'          && scoped(<StudentPromotionPage />,    'Pick a school to manage student promotions.')}
          {activePage === 'teacher-assignments' && scoped(<TeacherAssignmentsPage />,  'Pick a school to manage teacher assignments.')}
          {activePage === 'exam-officers'       && scoped(<ExamOfficersPage />,        'Pick a school to manage its exam officers.')}
          {activePage === 'ai-capture'          && scoped(<AIDocumentCapture />,       'Pick a school to use AI document capture.')}
          {activePage === 'finance-users'       && scoped(<FinanceUsersPage school={schools[0]} />, 'Pick a school to manage its finance users.')}

          {!HANDLED_PAGES.has(activePage) && (
            <StubPage title={getTitle(activePage, selectedSchool)} />
          )}

          </Suspense>
        </main>
      </div>

      {/* Mobile bottom nav — role-aware shortcut keys */}
      <nav className="sa-mobile-nav">
        {(user?.role === 'principal'
          ? [
              { key: 'overview',             short: 'Home' },
              { key: 'grade-approvals',      short: 'Grades' },
              { key: 'report-card-approval', short: 'Reports' },
              { key: 'attendance-report',    short: 'Attendance' },
              { key: 'principal-users',      short: 'Team' },
            ]
          : user?.role === 'bursar'
          ? [
              { key: 'overview',        short: 'Home' },
              { key: 'student-fees',    short: 'Fees' },
              { key: 'payments',        short: 'Payments' },
              { key: 'expenses',        short: 'Expenses' },
              { key: 'finance-reports', short: 'Reports' },
            ]
          : user?.role === 'student'
          ? [
              { key: 'overview',        short: 'Home' },
              { key: 'my-grades',       short: 'Grades' },
              { key: 'my-attendance',   short: 'Attendance' },
              { key: 'my-timetable',    short: 'Timetable' },
              { key: 'my-fees',         short: 'Fees' },
            ]
          : [
              { key: 'overview' }, { key: 'applications' }, { key: 'analytics' },
              { key: 'grade-report' }, { key: 'system-health' },
            ]
        ).map(({ key, short }) => {
          const found = navItems.find(n => n.key === key);
          return found ? { ...found, label: short || found.label } : null;
        }).filter(Boolean).map(item => {
          const isAnalyticsRelated = ['analytics', 'benchmarks', 'onboarding'].includes(activePage);
          const isActive =
            activePage === item.key ||
            (item.key === 'applications' && isAppRelated) ||
            (item.key === 'grade-report' && isGradeRelated) ||
            (item.key === 'analytics'    && isAnalyticsRelated);
          return (
            <button
              key={item.key}
              className={`sa-mob-btn${isActive ? ' active' : ''}`}
              onClick={() => goTo(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge > 0 && <span className="sa-mob-badge">{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* Global Search modal */}
      {searchOpen && (
        <GlobalSearch
          pages={navItems.filter(n => !['review', 'app-history', 'version-compare', 'rejection-audit', 'grade-audit'].includes(n.key))}
          schools={schools}
          onSelect={(key) => { goTo(key); setSearchOpen(false); }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}
