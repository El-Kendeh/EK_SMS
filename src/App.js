import React, { useState, useEffect } from 'react';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import { SchoolContextProvider } from './hooks/useSchoolContext';
import Login from './components/login';
import SuperadminDashboard from './components/superadmin/SuperadminDashboard';
import ParentDashboard from './components/parent/ParentDashboard';
import Landing from './components/Landing';
import Register from './components/Register';
import SchoolAdminDashboard from './components/schooladmin/dashboard';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentDashboard from './components/student/StudentDashboard';
import PrincipalDashboard from './components/principal/PrincipalDashboard';
import VerifyPage from './components/student/VerifyPage';
import ForceChangePassword from './components/ForceChangePassword';
import DashboardGate from './components/DashboardGate';

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
  'teacher-dashboard':  '/dashboard/teacher',
  'student-dashboard':  '/dashboard/student',
  'principal-dashboard':'/principal',
  parentdashboard:      '/parent',
};

const PATH_TO_PAGE = {
  '/':            'login',
  '/login':       'login',
  '/register':    'register',
  '/superadmin':  'superadmindashboard',
  '/dashboard/school-admin': 'sa-dashboard',
  '/dashboard/teacher':      'teacher-dashboard',
  '/teacher/dashboard':      'teacher-dashboard',
  '/dashboard/student':      'student-dashboard',
  '/parent':                 'parentdashboard',
  '/parent/children':        'parentdashboard',
  '/parent/grades':          'parentdashboard',
  '/parent/report-cards':    'parentdashboard',
  '/parent/notifications':   'parentdashboard',
  '/parent/profile':         'parentdashboard',
  '/parent/attendance':      'parentdashboard',
  '/parent/behavior':        'parentdashboard',
  '/parent/fees':            'parentdashboard',
  '/parent/verification':    'parentdashboard',
  '/teacher/classes':        'teacher-dashboard',
  '/teacher/grade-entry':    'teacher-dashboard',
  '/teacher/grade-history':  'teacher-dashboard',
  '/teacher/students':       'teacher-dashboard',
  '/teacher/timetable':      'teacher-dashboard',
  '/teacher/notifications':  'teacher-dashboard',
  '/teacher/profile':        'teacher-dashboard',
  '/teacher/attendance':     'teacher-dashboard',
  '/teacher/analytics':      'teacher-dashboard',
  '/teacher/settings':       'teacher-dashboard',
  '/principal':              'principal-dashboard',
  '/principal/approvals':    'principal-dashboard',
  '/principal/reports':      'principal-dashboard',
  '/principal/activity':     'principal-dashboard',
};

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    // On app load, determine where to go based on localStorage user/token
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

        const isSuper = user.is_superuser || user.role === 'superadmin' || user.role === 'admin' || user.role === 'superuser';
        if (isSuper) {
          setCurrentPage('superadmindashboard');
        } else {
          // Non-superadmins must log in as superadmin to access the app for now
          setCurrentPage('login');
        }
      } catch (e) {
        setCurrentPage('login');
      }
    } else {
      setCurrentPage('login');
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

    const abort = new AbortController();
    setFetchError(null);

    (async () => {
      try {
        const res = await fetch((process.env.REACT_APP_API_BASE_URL || '') + '/api/superadmin/dashboard', {
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
      <div className="App">
        <ImpersonationBanner />
        {currentPage === 'login' && <Login onNavigate={setCurrentPage} />}
        {currentPage === 'force-change-password' && <ForceChangePassword onNavigate={setCurrentPage} />}
        {currentPage === 'superadmindashboard' && (
          <SuperadminDashboard
            onNavigate={setCurrentPage}
            data={dashboardData}
            fetchError={fetchError}
          />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
