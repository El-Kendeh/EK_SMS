import React, { useState, useEffect, useCallback } from 'react';
import './SA.css';
import './Dashboard.css';
import { SECURITY_CONFIG } from '../../config/security';
import SAOverview       from './SAOverview';
import SAApplications   from './SAApplications';
import SAReview         from './SAReview';
import SASchools        from './SASchools';
import SAAppHistory     from './SAAppHistory';
import SAVersionCompare from './SAVersionCompare';
import SARejected       from './SARejected';
import SARejectionAudit from './SARejectionAudit';
import SASecurityLogs    from './SASecurityLogs';
import SAForensics       from './SAForensics';
import SAAlertBroadcast  from './SAAlertBroadcast';
import SASystemHealth    from './SASystemHealth';
import SAGradeReport     from './SAGradeReport';
import SAGradeIntegrity  from './SAGradeIntegrity';
import SAGradeAuditDetail from './SAGradeAuditDetail';
import SAGovernance      from './SAGovernance';
import SASettings        from './SASettings';
import SAAnalytics       from './SAAnalytics';
import SABenchmarks      from './SABenchmarks';
import SAOnboarding      from './SAOnboarding';

const API = SECURITY_CONFIG.API_URL;

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
const IcBell = () => (
  <svg viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcSettings = () => (
  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" strokeWidth="1.8"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
    strokeWidth="1.8"/>
  </svg>
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
const IcSecLogs  = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="9" x2="13" y2="9"/><line x1="9" y1="15" x2="11" y2="15"/>
  </svg>
);
const IcForensics = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
);
const IcBroadcast = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 22-7z"/>
  </svg>
);
const IcHealth = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IcGrade = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/>
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
);
const IcRequests = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const IcGovernance = () => (
  <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="12" y1="9" x2="12" y2="15"/>
  </svg>
);
const IcAnalytics = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const IcBenchmarks = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IcOnboarding = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <polyline points="16 11 18 13 22 9"/>
  </svg>
);

/* ================================================================
   Page title helper
   ================================================================ */
function getTitle(page, school) {
  if ((page === 'review' || page === 'app-history' || page === 'version-compare') && school) return school.name;
  if (page === 'rejection-audit' && school) return school.name;
  const map = {
    overview:          'Dashboard',
    applications:      'Applications',
    rejected:          'Rejected',
    schools:           'Schools',
    notifications:     'Notifications',
    settings:          'Settings',
    'app-history':     'History',
    'version-compare': 'Compare',
    'rejection-audit': 'Audit',
    'security-logs':   'Audit Logs',
    'forensics':       'Forensics',
    'alert-broadcast': 'Broadcast',
    'system-health':   'System Health',
    'grade-report':    'Grade Integrity',
    'grade-requests':  'Mod. Requests',
    'grade-audit':     'Audit Detail',
    'governance':      'Role-Based Access',
    'analytics':       'School Directory & Analytics',
    'benchmarks':      'Academic Benchmarks',
    'onboarding':      'Onboarding Analytics',
  };
  return map[page] || 'Dashboard';
}

/* ================================================================
   Main Dashboard Component
   ================================================================ */
export default function Dashboard({ onNavigate }) {
  const [user,            setUser]            = useState(null);
  const [activePage,      setActivePage]      = useState('overview');
  const [selectedSchool,  setSelectedSchool]  = useState(null);
  const [forensicEvent,   setForensicEvent]   = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [schools,         setSchools]         = useState([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [toast,           setToast]           = useState(null);

  /* ---- Data ---- */
  const fetchSchools = useCallback(async (tok) => {
    const token = tok || localStorage.getItem('token');
    try {
      const res  = await fetch(`${API}/api/schools/`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setSchools(data.schools);
    } catch { /* network error — silently ignore */ }
    finally { setIsLoading(false); }
  }, []);

  /* ---- Auth guard ---- */
  useEffect(() => {
    const token   = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) { onNavigate && onNavigate('home'); return; }
    try {
      const parsed = JSON.parse(userStr);
      if (!parsed.is_superuser) { onNavigate && onNavigate('home'); return; }
      setUser(parsed);
      fetchSchools(token);
    } catch { onNavigate && onNavigate('home'); }
  }, [onNavigate, fetchSchools]);

  /* ---- Actions ---- */
  const handleAction = useCallback(async (schoolId, action, note = '') => {
    setIsActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API}/api/schools/approve/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ school_id: schoolId, action, note }),
      });
      const data = await res.json();
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
    /* Move school back to pending by re-fetching after a toast */
    showToast(`${school.name} marked for reconsideration.`, 'info');
    setActivePage('rejected');
    setSelectedSchool(null);
  };

  const handleForensic = (event) => {
    setForensicEvent(event);
    setActivePage('forensics');
  };

  const handleGradeDetail = (req) => {
    setSelectedRequest(req);
    setActivePage('grade-audit');
  };

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

  const SEC_PAGES   = ['security-logs', 'forensics', 'alert-broadcast', 'system-health'];
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

  const pendingCount  = schools.filter(s => !s.is_approved && s.is_active !== false).length;
  const rejectedCount = schools.filter(s => !s.is_approved && !s.is_active).length;

  const isAppRelated   = ['applications', 'review', 'app-history', 'version-compare'].includes(activePage);
  const isRejRelated   = ['rejected', 'rejection-audit'].includes(activePage);
  const isSecRelated   = SEC_PAGES.includes(activePage);
  const isGradeRelated = GRADE_PAGES.includes(activePage);

  const navItems = [
    { key: 'overview',        label: 'Dashboard',    icon: <IcHome />,         badge: 0,             section: null     },
    { key: 'applications',    label: 'Applications', icon: <IcApplications />, badge: pendingCount,  section: null     },
    { key: 'rejected',        label: 'Rejected',     icon: <IcRejected />,     badge: rejectedCount, section: null     },
    { key: 'schools',         label: 'Schools',      icon: <IcSchools />,      badge: 0,             section: null     },
    { key: 'grade-report',    label: 'Grade Integrity', icon: <IcGrade />,      badge: 0,             section: 'Grade Integrity'  },
    { key: 'grade-requests',  label: 'Mod. Requests',  icon: <IcRequests />,   badge: 0,             section: 'Grade Integrity'  },
    { key: 'analytics',       label: 'School Directory', icon: <IcAnalytics />,  badge: 0,             section: 'Reports & Analytics' },
    { key: 'benchmarks',      label: 'Benchmarks',   icon: <IcBenchmarks />,   badge: 0,             section: 'Reports & Analytics' },
    { key: 'onboarding',      label: 'Onboarding',   icon: <IcOnboarding />,   badge: 0,             section: 'Reports & Analytics' },
    { key: 'governance',      label: 'RBAC / Roles', icon: <IcGovernance />,   badge: 0,             section: 'Governance'       },
    { key: 'security-logs',   label: 'Audit Logs',   icon: <IcSecLogs />,      badge: 0,             section: 'Security & Audit' },
    { key: 'forensics',       label: 'Forensics',    icon: <IcForensics />,    badge: 0,             section: 'Security & Audit' },
    { key: 'alert-broadcast', label: 'Broadcast',    icon: <IcBroadcast />,    badge: 0,             section: 'Security & Audit' },
    { key: 'system-health',   label: 'System Health',icon: <IcHealth />,       badge: 0,             section: 'Security & Audit' },
    { key: 'notifications',   label: 'Notifications',icon: <IcBell />,         badge: 0,             section: null     },
    { key: 'settings',        label: 'Settings',     icon: <IcSettings />,     badge: 0,             section: null     },
  ];

  return (
    <div className={`sa-wrap${sidebarOpen ? ' sidebar-open' : ''}`}>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="sa-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ===== Sidebar ===== */}
      <aside className="sa-sidebar">
        <div className="sa-sidebar-head">
          <div className="sa-brand">
            <span className="sa-brand-mark">EK</span>
            <div>
              <p className="sa-brand-name">EK-SMS</p>
              <p className="sa-brand-role">Super Admin</p>
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
          <div className="sa-user-chip">
            <div className="sa-user-avatar">
              {(user?.full_name || user?.email || 'A')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p className="sa-user-name">{user?.full_name || user?.username || 'Admin'}</p>
              <p className="sa-user-role">Super Admin</p>
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
            <button className="sa-notif-btn" onClick={() => goTo('notifications')}>
              <IcBell />
              {pendingCount > 0 && <span className="sa-notif-dot" />}
            </button>
            <div className="sa-avatar-sm">
              {(user?.full_name || user?.email || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Toast */}
        {toast && <div className={`sa-toast sa-toast--${toast.type}`}>{toast.msg}</div>}

        {/* Page content */}
        <main className="sa-content">

          {activePage === 'overview' && (
            <SAOverview
              schools={schools}
              user={user}
              onReview={handleReview}
              onNavigate={goTo}
            />
          )}

          {activePage === 'applications' && (
            <SAApplications
              schools={schools}
              onReview={handleReview}
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
            <SASecurityLogs onForensic={handleForensic} />
          )}

          {activePage === 'forensics' && (
            <SAForensics initialEvent={forensicEvent} />
          )}

          {activePage === 'alert-broadcast' && (
            <SAAlertBroadcast />
          )}

          {activePage === 'system-health' && (
            <SASystemHealth />
          )}

          {activePage === 'schools' && (
            <SASchools schools={schools} onReview={handleReview} />
          )}

          {activePage === 'analytics' && (
            <SAAnalytics schools={schools} />
          )}

          {activePage === 'benchmarks' && (
            <SABenchmarks />
          )}

          {activePage === 'onboarding' && (
            <SAOnboarding />
          )}

          {activePage === 'governance' && (
            <SAGovernance />
          )}

          {activePage === 'notifications' && (
            <div className="sa-page-head">
              <div>
                <h1 className="sa-page-title">Notifications</h1>
                <p className="sa-page-sub">System alerts and activity notifications</p>
              </div>
            </div>
          )}

          {activePage === 'settings' && (
            <SASettings />
          )}

        </main>
      </div>

      {/* Mobile bottom nav — Dashboard, Applications, Analytics, Grade Integrity, System Health */}
      <nav className="sa-mobile-nav">
        {['overview', 'applications', 'analytics', 'grade-report', 'system-health'].map(key => navItems.find(n => n.key === key)).filter(Boolean).map(item => {
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
    </div>
  );
}
