import React, { useState, useEffect } from 'react';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import Landing from './components/Landing';
import Login from './components/login';
import Register from './components/Register';
import Dashboard from './components/superadmin/Dashboard';
import SchoolAdminDashboard from './components/schooladmin/dashboard';

/* ---- URL ↔ page helpers ---- */
const PAGE_TO_PATH = {
  landing:        '/',
  login:          '/login',
  register:       '/register',
  dashboard:      '/dashboard',
  'sa-dashboard': '/school-admin',
};

function resolvePageFromPath(path, user) {
  const hasAuth = !!user;
  if (path === '/login')    return 'login';
  if (path === '/register') return 'register';
  if (path === '/dashboard' || path === '/admin') {
    if (!hasAuth) return 'login';
    return user.is_superuser ? 'dashboard'
      : user.role === 'school_admin' ? 'sa-dashboard'
      : 'landing';
  }
  if (path === '/school-admin') {
    if (!hasAuth) return 'login';
    return user.role === 'school_admin' ? 'sa-dashboard' : 'landing';
  }
  // Default: authenticated users go to their dashboard
  if (hasAuth) {
    return user.is_superuser ? 'dashboard'
      : user.role === 'school_admin' ? 'sa-dashboard'
      : 'landing';
  }
  return 'landing';
}

function App() {
  const [page, setPage] = useState('loading');
  const [isLoading, setIsLoading] = useState(true);

  /* ---- Initial load: resolve page from current URL ---- */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user = null;
    try { if (userStr) user = JSON.parse(userStr); } catch (e) { }

    const resolvedPage = resolvePageFromPath(
      window.location.pathname,
      token && user ? user : null
    );
    setPage(resolvedPage);

    // Canonicalise URL (e.g. /login → / if not authenticated for that route)
    const canonical = PAGE_TO_PATH[resolvedPage] || '/';
    if (window.location.pathname !== canonical) {
      window.history.replaceState(null, '', canonical);
    }

    setIsLoading(false);
  }, []);

  /* ---- Sync logout across tabs ---- */
  useEffect(() => {
    const handleStorage = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      let user = null;
      try { if (userStr) user = JSON.parse(userStr); } catch (e) { }

      if (token && user) {
        if (user.is_superuser) {
          setPage('dashboard');
        } else if (user.role === 'school_admin') {
          setPage('sa-dashboard');
        } else {
          setPage('landing');
          window.history.replaceState(null, '', '/');
        }
      } else {
        setPage('landing');
        window.history.replaceState(null, '', '/');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  /* ---- Browser back/forward ---- */
  useEffect(() => {
    const handlePop = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      let user = null;
      try { if (userStr) user = JSON.parse(userStr); } catch (e) { }
      const resolved = resolvePageFromPath(
        window.location.pathname,
        token && user ? user : null
      );
      setPage(resolved);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  /* ---- Navigation helper (used by all child components) ---- */
  const navigate = (target) => {
    if (target === 'home') target = 'landing';
    if (target === 'dashboard') {
      const token = localStorage.getItem('token');
      if (!token) target = 'landing';
    }
    setPage(target);
    const path = PAGE_TO_PATH[target] || '/';
    window.history.pushState(null, '', path);
  };

  if (isLoading) {
    return (
      <div className="App app-loading">
        <div className="app-spinner" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="App">
        {page === 'landing'      && <Landing               onNavigate={navigate} />}
        {page === 'login'        && <Login                 onNavigate={navigate} />}
        {page === 'register'     && <Register              onNavigate={navigate} />}
        {page === 'dashboard'    && <Dashboard             onNavigate={navigate} />}
        {page === 'sa-dashboard' && <SchoolAdminDashboard  onNavigate={navigate} />}
      </div>
    </ThemeProvider>
  );
}

export default App;
