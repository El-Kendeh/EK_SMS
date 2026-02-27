import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import { SECURITY_CONFIG } from '../../config/security';

function Dashboard({ onNavigate }) {
  const [user, setUser] = useState(null);
  const [schools, setSchools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      if (onNavigate) onNavigate('home');
      else window.location.href = '/';
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (!parsedUser.is_superuser) {
        if (onNavigate) onNavigate('home');
        else window.location.href = '/';
        return;
      }
      setUser(parsedUser);
      fetchSchools();
    } catch (err) {
      setError('Failed to load user data');
      setIsLoading(false);
    }
  }, [onNavigate]);

  const fetchSchools = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SECURITY_CONFIG.API_URL}/api/schools/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSchools(data.schools);
      } else {
        setError(data.message || 'Failed to fetch schools');
      }
    } catch (err) {
      setError('Connection error while fetching schools');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (schoolId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this school?`)) return;

    setIsActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SECURITY_CONFIG.API_URL}/api/schools/approve/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ school_id: schoolId, action })
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchSchools(); // Refresh list
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (err) {
      alert('Connection error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onNavigate) onNavigate('home');
    else window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading System Management...</div>
      </div>
    );
  }

  const pendingSchools = schools.filter(s => !s.is_approved);
  const approvedSchools = schools.filter(s => s.is_approved);

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">EK-SMS</h2>
          <p className="sidebar-subtitle">Super Admin Console</p>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            <li className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('dashboard')} className="nav-link border-none bg-transparent w-full text-left">
                <span className="nav-icon">📊</span>
                <span className="nav-text">Overview</span>
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'schools' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('schools')} className="nav-link border-none bg-transparent w-full text-left">
                <span className="nav-icon">🏫</span>
                <span className="nav-text">Manage Schools</span>
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('users')} className="nav-link border-none bg-transparent w-full text-left">
                <span className="nav-icon">👥</span>
                <span className="nav-text">Global Users</span>
              </button>
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

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <h1 className="page-title">{activeTab === 'dashboard' ? 'System Overview' : activeTab === 'schools' ? 'School Management' : 'Access Control'}</h1>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{user?.full_name || user?.username}</span>
              <span className="user-role">System Superuser</span>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {error}
                    <button
                      onClick={() => { setError(''); fetchSchools(); }}
                      className="ml-4 font-bold underline hover:text-red-800"
                    >
                      Retry
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'dashboard' && (
            <>
              <section className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">🏫</div>
                  <div className="stat-content">
                    <h3 className="stat-label">Total Schools</h3>
                    <p className="stat-value">{schools.length}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⏳</div>
                  <div className="stat-content">
                    <h3 className="stat-label">Pending Approval</h3>
                    <p className="stat-value">{pendingSchools.length}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-content">
                    <h3 className="stat-label">Active Institutions</h3>
                    <p className="stat-value">{approvedSchools.length}</p>
                  </div>
                </div>
              </section>

              <section className="schools-section">
                <div className="section-header">
                  <h2 className="section-title">New Institution Registrations</h2>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Institution</th>
                        <th>Contact</th>
                        <th>Registered On</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingSchools.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="empty-state">No pending registrations at the moment.</td>
                        </tr>
                      ) : (
                        pendingSchools.map(school => (
                          <tr key={school.id}>
                            <td className="school-name-cell">
                              <span className="school-name">{school.name}</span>
                              <span className="school-code">Code: {school.code}</span>
                            </td>
                            <td>
                              <div>{school.principal_name}</div>
                              <div className="text-xs text-gray-500">{school.email}</div>
                            </td>
                            <td>{new Date(school.registration_date).toLocaleDateString()}</td>
                            <td>
                              <span className="status-badge pending">Pending Review</span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn-action btn-approve"
                                  onClick={() => handleApprove(school.id, 'approve')}
                                  disabled={isActionLoading}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-action btn-reject"
                                  onClick={() => handleApprove(school.id, 'reject')}
                                  disabled={isActionLoading}
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {activeTab === 'schools' && (
            <section className="schools-section">
              <div className="section-header">
                <h2 className="section-title">All Registered Institutions</h2>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Principal</th>
                      <th>Status</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools.map(school => (
                      <tr key={school.id}>
                        <td className="school-name-cell">
                          <span className="school-name">{school.name}</span>
                          <span className="school-code">{school.code}</span>
                        </td>
                        <td>{school.principal_name}</td>
                        <td>
                          <span className={`status-badge ${school.is_approved ? 'approved' : 'pending'}`}>
                            {school.is_approved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td>{school.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
