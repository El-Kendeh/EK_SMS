import React, { useState, useEffect } from 'react';
import './App.css';
import Login    from './components/login';
import Register from './components/Register';
import Dashboard from './components/superadmin/dashboard';

function App() {
  const [page, setPage]         = useState('loading');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user  = localStorage.getItem('user');
    setPage(token && user ? 'dashboard' : 'login');
    setIsLoading(false);
  }, []);

  // Sync logout across tabs
  useEffect(() => {
    const handleStorage = () => {
      const token = localStorage.getItem('token');
      setPage(token ? 'dashboard' : 'login');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const navigate = (target) => {
    if (target === 'dashboard') {
      // Verify token exists before going to dashboard
      const token = localStorage.getItem('token');
      if (!token) { setPage('login'); return; }
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
    <div className="App">
      {page === 'login'     && <Login    onNavigate={navigate} />}
      {page === 'register'  && <Register onNavigate={navigate} />}
      {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
    </div>
  );
}

export default App;
