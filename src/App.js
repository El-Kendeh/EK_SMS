import React, { useState, useEffect } from 'react';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import { SchoolBrandingProvider } from './context/SchoolBrandingContext';
import Login from './components/login';
import Landing from './components/Landing';
import Register from './components/Register';
import SuperadminDashboard from './components/superadmin/SuperadminDashboard';
import ForceChangePassword from './components/ForceChangePassword';
import VerifyPage from './components/student/VerifyPage';
import ApiClient from './api/client';

const PAGE_TO_PATH = {
  home: '/',
  landing: '/',
  login: '/login',
  register: '/register',
  'force-change-password': '/force-password',
  superadmindashboard: '/superadmin',
};

const PATH_TO_PAGE = {
  '/': 'home',
  '/login': 'login',
  '/register': 'register',
  '/force-password': 'force-change-password',
  '/superadmin': 'superadmindashboard',
};

/* ── Impersonation banner (shown when a superadmin is viewing as a school admin) ── */
function ImpersonationBanner() {
  const raw = sessionStorage.getItem('ek-sms-impersonating');
  if (!raw) return null;
  let info = {};
  try { info = JSON.parse(raw); } catch { return null; }

  const handleReturn = async () => {
    // Close the audited impersonation session server-side while we still hold the
    // impersonation token (ApiClient reads it from localStorage). Best-effort — the
    // UI restore proceeds regardless of network outcome.
    try { await ApiClient.post('/api/impersonate/end/', {}); } catch { /* ignore */ }
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


/* Thin shell. The public /verify/<hash> page must render WITHOUT the dashboard's
   hooks/effects running, so its early return lives here — in a component that has
   no Hooks of its own (a conditional return before Hooks would violate the Rules
   of Hooks). Everything stateful lives in <MainApp>, where Hook order stays
   unconditional. */
function App() {
  // Public verification page — reachable at /verify/<hash> from a scanned receipt QR.
  if (window.location.pathname.startsWith('/verify/')) {
    const hash = decodeURIComponent(window.location.pathname.slice('/verify/'.length).replace(/\/+$/, ''));
    return <VerifyPage hash={hash} />;
  }
  return <MainApp />;
}

function MainApp() {
  const [currentPage, setCurrentPage] = useState(() => PATH_TO_PAGE[window.location.pathname] || 'home');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  /* Bumped whenever the auth token/user is swapped (impersonation enter/exit).
     Used as a React key on the dashboard so it REMOUNTS and re-reads the new
     identity — without this the shell keeps rendering the old role after a swap. */
  const [authKey, setAuthKey] = useState(0);

  useEffect(() => {
    const path = PAGE_TO_PATH[currentPage] || '/';
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  }, [currentPage]);

  useEffect(() => {
    const onPop = () => {
      const page = PATH_TO_PAGE[window.location.pathname] || 'home';
      setCurrentPage(page);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /* Impersonation enter/exit dispatches a synthetic 'storage' event after
     swapping the token+user in localStorage. Re-derive the route from the new
     user and bump authKey so <SuperadminDashboard> remounts and re-reads the
     swapped identity (otherwise the operator stays on the superadmin shell until
     a manual reload). UserContext/SchoolBrandingContext already listen too. */
  useEffect(() => {
    const onAuthSwap = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          const roles = ['superadmin', 'school_admin', 'principal', 'bursar', 'teacher', 'student', 'parent'];
          setCurrentPage(roles.includes(user.role) ? 'superadmindashboard' : 'home');
        } catch { setCurrentPage('home'); }
      } else {
        setCurrentPage('home');
      }
      setAuthKey(k => k + 1);
    };
    window.addEventListener('storage', onAuthSwap);
    return () => window.removeEventListener('storage', onAuthSwap);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);

        if (user.must_change_password) {
          setCurrentPage('force-change-password');
          setIsLoading(false);
          return;
        }

        const page = user.role === 'superadmin' || user.role === 'school_admin' || user.role === 'principal' || user.role === 'bursar' || user.role === 'teacher' || user.role === 'student' || user.role === 'parent'
          ? 'superadmindashboard' : 'home';
        setCurrentPage(page);
      } catch (e) {
        setCurrentPage('home');
      }
    } else {
      setCurrentPage('home');
    }

    setIsLoading(false);
  }, []);

  // When superadmin page becomes active, fetch dashboard data from backend
  useEffect(() => {
    if (currentPage !== 'superadmindashboard') return;

    const token = localStorage.getItem('token');
    if (!token) {
      setFetchError('No auth token');
      return;
    }

    // Platform dashboard counts are superadmin-only (the /api/dashboard/ route is
    // now gated). School staff render the same shell but must not call it, so skip
    // the fetch for any non-superadmin role to avoid a 403.
    let role = null;
    try { role = JSON.parse(localStorage.getItem('user') || '{}').role; } catch { /* ignore */ }
    if (role !== 'superadmin') { setFetchError(null); return; }

    const API_BASE = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || 'https://backend.pruhsms.africa';
    const abort = new AbortController();
    setFetchError(null);

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/dashboard/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          signal: abort.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Status ${res.status}: ${text}`);
        }

        const data = await res.json();
        setDashboardData(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setFetchError(err.message || 'Fetch error');
        }
      }
    })();

    return () => abort.abort();
  }, [currentPage]);

  if (isLoading) {
    return (
      <div className="App loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <SchoolBrandingProvider>
      <div className="App">
        <ImpersonationBanner />
        {(currentPage === 'home' || currentPage === 'landing') && <Landing onNavigate={setCurrentPage} />}
        {currentPage === 'register' && <Register onNavigate={setCurrentPage} />}
        {currentPage === 'login' && <Login onNavigate={setCurrentPage} />}
        {currentPage === 'force-change-password' && <ForceChangePassword onNavigate={setCurrentPage} />}
        {currentPage === 'superadmindashboard' && (
          <SuperadminDashboard
            key={authKey}
            onNavigate={setCurrentPage}
            data={dashboardData}
            fetchError={fetchError}
          />
        )}
      </div>
      </SchoolBrandingProvider>
    </ThemeProvider>
  );
}

export default App;
