import React, { useState, useEffect } from 'react';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import Landing from './components/Landing';
import Login from './components/login';
import Register from './components/Register';
import Dashboard from './components/superadmin/Dashboard';

function App() {
  const [page, setPage] = useState('loading');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    // Authenticated users go straight to dashboard; everyone else sees the landing page
    setPage(token && user ? 'dashboard' : 'landing');
    setIsLoading(false);
  }, []);

  // Sync logout across tabs
  useEffect(() => {
    const handleStorage = () => {
      const token = localStorage.getItem('token');
      setPage(token ? 'dashboard' : 'landing');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const navigate = (target) => {
    // 'home' is an alias for the landing page
    if (target === 'home') { setPage('landing'); return; }
    if (target === 'dashboard') {
      const token = localStorage.getItem('token');
      if (!token) { setPage('landing'); return; }
    }
    setPage(target);
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
        {page === 'landing' && <Landing onNavigate={navigate} />}
        {page === 'login' && <Login onNavigate={navigate} />}
        {page === 'register' && <Register onNavigate={navigate} />}
        {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
      </div>
    </ThemeProvider>
  );
}

export default App;
