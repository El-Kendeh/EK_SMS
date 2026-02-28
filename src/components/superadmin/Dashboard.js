import React, { useState, useEffect, useCallback } from 'react';
import './SA.css';
import './Dashboard.css';
import { SECURITY_CONFIG } from '../../config/security';
import SAOverview      from './SAOverview';
import SAApplications  from './SAApplications';
import SAReview        from './SAReview';
import SASchools       from './SASchools';

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

/* ================================================================
   Page title helper
   ================================================================ */
function getTitle(page, school) {
  if (page === 'review' && school) return school.name;
  const map = { overview: 'Dashboard', applications: 'Applications', schools: 'Schools', notifications: 'Notifications', settings: 'Settings' };
  return map[page] || 'Dashboard';
}

/* ================================================================
   Main Dashboard Component
   ================================================================ */
export default function Dashboard({ onNavigate }) {
  const [user,            setUser]            = useState(null);
  const [activePage,      setActivePage]      = useState('overview');
  const [selectedSchool,  setSelectedSchool]  = useState(null);
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
    const token    = localStorage.getItem('token');
    const userStr  = localStorage.getItem('user');
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

  const handleReview = (school) => {
    setSelectedSchool(school);
    setActivePage('review');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onNavigate && onNavigate('home');
  };

  const goTo = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
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

  const pendingCount = schools.filter(s => !s.is_approved).length;

  const navItems = [
    { key: 'overview',      label: 'Dashboard',      icon: <IcHome /> },
    { key: 'applications',  label: 'Applications',   icon: <IcApplications />, badge: pendingCount },
    { key: 'schools',       label: 'Schools',        icon: <IcSchools /> },
    { key: 'notifications', label: 'Notifications',  icon: <IcBell /> },
    { key: 'settings',      label: 'Settings',       icon: <IcSettings /> },
  ];

  const isAppRelated = activePage === 'applications' || activePage === 'review';

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
          {navItems.map(item => (
            <button
              key={item.key}
              className={`sa-nav-btn${activePage === item.key || (item.key === 'applications' && isAppRelated) ? ' active' : ''}`}
              onClick={() => goTo(item.key)}
            >
              <span className="sa-nav-icon">{item.icon}</span>
              <span className="sa-nav-label">{item.label}</span>
              {item.badge > 0 && <span className="sa-nav-badge">{item.badge}</span>}
            </button>
          ))}
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
              isLoading={isActionLoading}
            />
          )}

          {activePage === 'schools' && (
            <SASchools schools={schools} onReview={handleReview} />
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
            <div className="sa-page-head">
              <div>
                <h1 className="sa-page-title">Settings</h1>
                <p className="sa-page-sub">System configuration — coming soon</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="sa-mobile-nav">
        {navItems.map(item => (
          <button
            key={item.key}
            className={`sa-mob-btn${activePage === item.key || (item.key === 'applications' && isAppRelated) ? ' active' : ''}`}
            onClick={() => goTo(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge > 0 && <span className="sa-mob-badge">{item.badge}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
