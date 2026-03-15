import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/login';
import SuperadminDashboard from './components/superadmin/dashboard';
import Landing from './components/Landing';
import Register from './components/Register';
import SchoolAdminDashboard from './components/schooladmin/dashboard';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on app load
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        const isSuper = user.is_superuser || user.role === 'superadmin' || user.role === 'admin' || user.role === 'superuser';

        if (isSuper) {
          setCurrentPage('dashboard');
        } else if (user.role === 'school_admin') {
          setCurrentPage('sa-dashboard');
        } else {
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
            setCurrentPage('dashboard');
          } else if (user.role === 'school_admin') {
            setCurrentPage('sa-dashboard');
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

  if (isLoading) {
    return (
      <div className="App loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      {currentPage === 'login' && <Login onNavigate={setCurrentPage} />}
      {currentPage === 'dashboard' && <SuperadminDashboard onNavigate={setCurrentPage} />}
      {currentPage === 'sa-dashboard' && <SchoolAdminDashboard onNavigate={setCurrentPage} />}
      {(currentPage === 'home' || currentPage === 'landing') && <Landing onNavigate={setCurrentPage} />}
      {currentPage === 'register' && <Register onNavigate={setCurrentPage} />}

      {/* Fallback for unknown pages */}
      {!['login', 'dashboard', 'sa-dashboard', 'home', 'landing', 'register'].includes(currentPage) && (
        <Login onNavigate={setCurrentPage} />
      )}
    </div>
  );
}

export default App;
