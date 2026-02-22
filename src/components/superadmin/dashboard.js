import React, { useEffect, useState } from 'react';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      // Redirect to login if not authenticated
      window.location.href = '/';
      return;
    }

    try {
      setUser(JSON.parse(userData));
      setIsLoading(false);
    } catch (err) {
      setError('Failed to load user data');
      setIsLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">EK-SMS</h2>
          <p className="sidebar-subtitle">Admin Dashboard</p>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            <li className="nav-item active">
              <a href="#dashboard" className="nav-link">
                <span className="nav-icon">📊</span>
                <span className="nav-text">Dashboard</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#users" className="nav-link">
                <span className="nav-icon">👥</span>
                <span className="nav-text">Users</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#messages" className="nav-link">
                <span className="nav-icon">💬</span>
                <span className="nav-text">Messages</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#reports" className="nav-link">
                <span className="nav-icon">📈</span>
                <span className="nav-text">Reports</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#settings" className="nav-link">
                <span className="nav-icon">⚙️</span>
                <span className="nav-text">Settings</span>
              </a>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <span className="logout-icon">🚪</span>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <h1 className="page-title">Dashboard</h1>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{user?.username}</span>
              <span className="user-role">
                {user?.is_superuser ? 'Superuser' : 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Welcome Section */}
          <section className="welcome-section">
            <h2>Welcome, {user?.username}!</h2>
            <p>
              {user?.is_superuser
                ? 'You have full administrative access to the EK-SMS system.'
                : 'You have administrative access to the system.'}
            </p>
          </section>

          {/* Stats Cards */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📨</div>
              <div className="stat-content">
                <h3 className="stat-label">Total Messages</h3>
                <p className="stat-value">0</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👤</div>
              <div className="stat-content">
                <h3 className="stat-label">Total Users</h3>
                <p className="stat-value">0</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3 className="stat-label">Delivered</h3>
                <p className="stat-value">0</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">❌</div>
              <div className="stat-content">
                <h3 className="stat-label">Failed</h3>
                <p className="stat-value">0</p>
              </div>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="recent-activity">
            <h2>Recent Activity</h2>
            <div className="activity-list">
              <div className="activity-item">
                <p className="activity-message">
                  Welcome to EK-SMS Dashboard. Configure your settings to get started.
                </p>
                <span className="activity-time">Just now</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
