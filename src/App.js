import React, { useState, useEffect } from 'react';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/login';
import SuperadminDashboard from './components/superadmin/SuperadminDashboard';
import ParentDashboard from './components/parents/dashboard';
import Landing from './components/Landing';
import Register from './components/Register';
import SchoolAdminDashboard from './components/schooladmin/dashboard';

/* ── Impersonation banner (shown when a superadmin is viewing as a school admin) ── */
function ImpersonationBanner() {
  const raw = sessionStorage.getItem('ek-sms-impersonating');
  if (!raw) return null;
  let info = {};
  try { info = JSON.parse(raw); } catch { return null; }

  const handleReturn = () => {
    const prevToken = sessionStorage.getItem('ek-sms-prev-token');
    const prevUser  = sessionStorage.getItem('ek-sms-prev-user');
    sessionStorage.removeItem('ek-sms-impersonating');
    sessionStorage.removeItem('ek-sms-prev-token');
    sessionStorage.removeItem('ek-sms-prev-user');
    if (prevToken && prevUser) {
      localStorage.setItem('token', prevToken);
      localStorage.setItem('user',  prevUser);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(90deg,#1B3FAF,#0EA5E9)',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: '8px 16px', fontSize: '0.8125rem', fontWeight: 600,
    }}>
      <span>👁 Viewing as <strong>{info.schoolName}</strong> admin</span>
      <button
        onClick={handleReturn}
        style={{
          background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '3px 10px',
          fontSize: '0.75rem', fontWeight: 700,
        }}
      >
        ← Return to Superadmin
      </button>
    </div>
  );
}

const PAGE_TO_PATH = {
  login:                '/login',
  home:                 '/',
  landing:              '/',
  register:             '/register',
  superadmindashboard:  '/superadmin',
  'sa-dashboard':       '/dashboard/school-admin',
  parentdashboard:      '/parent',
};

const PATH_TO_PAGE = {
  '/':            'login',
  '/login':       'login',
  '/register':    'register',
  '/superadmin':  'superadmindashboard',
  '/dashboard/school-admin': 'sa-dashboard',
  '/parent':      'parentdashboard',
};

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [isLoading, setIsLoading] = useState(true);

  // Sync URL → state when browser back/forward is used
  useEffect(() => {
    const onPop = () => {
      const page = PATH_TO_PAGE[window.location.pathname] || 'login';
      setCurrentPage(page);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Sync state → URL whenever currentPage changes
  useEffect(() => {
    const path = PAGE_TO_PATH[currentPage] || '/';
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  }, [currentPage]);

  useEffect(() => {
    // Check if user is authenticated on app load
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        const isSuper = user.is_superuser || user.role === 'superadmin' || user.role === 'admin' || user.role === 'superuser';

        if (isSuper) {
          setCurrentPage('superadmindashboard');
        } else if (user.role === 'school_admin') {
          setCurrentPage('sa-dashboard');
        } else if (user.role === 'parent') {
          setCurrentPage('parentdashboard');
        } else {
          setCurrentPage('login');
        }
      } catch (e) {
        setCurrentPage('login');
      }
    } else {
      // Respect the URL path on fresh load (e.g. /register)
      const fromPath = PATH_TO_PAGE[window.location.pathname];
      setCurrentPage(fromPath || 'login');
    }
    setIsLoading(false);
  }, []);

  // Listen for storage changes (login/logout in other tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        setCurrentPage('login');
      } else {
        try {
          const user = JSON.parse(userStr);
          const isSuper = user.is_superuser || user.role === 'superadmin' || user.role === 'admin' || user.role === 'superuser';
          if (isSuper) {
            setCurrentPage('superadmindashboard');
          } else if (user.role === 'school_admin') {
            setCurrentPage('sa-dashboard');
          } else if (user.role === 'parent') {
            setCurrentPage('parentdashboard');
          } else {
            setCurrentPage('home');
          }
        } catch (e) {
          setCurrentPage('login');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const isImpersonating = !!sessionStorage.getItem('ek-sms-impersonating');
  // Stamp body class so child CSS (e.g. sticky header) can offset itself
  React.useEffect(() => {
    document.body.classList.toggle('is-impersonating', isImpersonating);
    return () => document.body.classList.remove('is-impersonating');
  }, [isImpersonating]);

  if (isLoading) {
    return (
      <div className="App loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="App" style={isImpersonating ? { paddingTop: '40px' } : {}}>
        <ImpersonationBanner />
        {currentPage === 'login' && <Login onNavigate={setCurrentPage} />}
        {currentPage === 'superadmindashboard' && <SuperadminDashboard onNavigate={setCurrentPage} />}
        {currentPage === 'sa-dashboard' && <SchoolAdminDashboard onNavigate={setCurrentPage} />}
        {currentPage === 'parentdashboard' && <ParentDashboard onNavigate={setCurrentPage} />}
        {(currentPage === 'home' || currentPage === 'landing') && <Landing onNavigate={setCurrentPage} />}
        {currentPage === 'register' && <Register onNavigate={setCurrentPage} />}

        {/* Fallback for unknown pages */}
        {!['login', 'superadmindashboard', 'sa-dashboard', 'home', 'landing', 'register'].includes(currentPage) && (
          <Login onNavigate={setCurrentPage} />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
