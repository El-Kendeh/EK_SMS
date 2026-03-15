import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/login';
import Dashboard from './components/superadmin/Dashboard';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on app load
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      setCurrentPage('dashboard');
    } else {
      setCurrentPage('login');
    }
    setIsLoading(false);
  }, []);

  // Listen for storage changes (login/logout in other tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setCurrentPage('login');
      } else {
        setCurrentPage('dashboard');
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
      {currentPage === 'login' ? <Login /> : <Dashboard />}
    </div>
  );
}

export default App;
