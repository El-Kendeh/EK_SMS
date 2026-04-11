import React, { useState, useEffect } from 'react';
import ApiClient from '../../api/client';

function ParentDashboard({ onNavigate }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [parentName, setParentName] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setParentName(user.full_name || user.username || 'Parent');
      } catch (e) {
        setParentName('Parent');
      }
    }
  }, []);

  useEffect(() => {
    const loadChildren = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await ApiClient.get('/api/parent/students/');
        if (!data.success) {
          throw new Error(data.message || 'Failed to load children.');
        }
        setChildren(data.children || []);
      } catch (e) {
        setError(e.message || 'Unable to load your child details.');
      } finally {
        setLoading(false);
      }
    };
    loadChildren();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onNavigate) onNavigate('login');
  };

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Parent Dashboard</h1>
          <p className="ska-page-sub">Welcome back, {parentName}. Your children are listed below.</p>
        </div>
        <button className="ska-btn ska-btn--ghost" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
        <h2 className="ska-card-title">How it works</h2>
        <p style={{ margin: 0, color: 'var(--ska-text-3)' }}>
          After admission, your login credentials are sent to the email address you provided. Use them to sign in and view details for your registered child or children.
        </p>
      </div>

      {loading ? (
        <div className="ska-empty"><p className="ska-empty-desc">Loading child details…</p></div>
      ) : error ? (
        <div className="ska-empty"><p className="ska-empty-desc" style={{ color: 'var(--ska-danger)' }}>{error}</p></div>
      ) : children.length === 0 ? (
        <div className="ska-empty">
          <div className="ska-empty-title">No linked children found</div>
          <p className="ska-empty-desc">If you recently registered your child, please check your email for login details and try again.</p>
        </div>
      ) : (
        <div className="ska-card" style={{ overflowX: 'auto' }}>
          <table className="ska-table">
            <thead>
              <tr>
                <th>Child Name</th>
                <th>Admission No.</th>
                <th>Class</th>
                <th>Date of Birth</th>
                <th>Phone</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {children.map(child => (
                <tr key={child.id}>
                  <td>{child.full_name}</td>
                  <td><span className="ska-badge ska-badge--cyan">{child.admission_number}</span></td>
                  <td>{child.classroom || 'Unassigned'}</td>
                  <td>{child.date_of_birth || 'Unknown'}</td>
                  <td>{child.phone_number || '—'}</td>
                  <td>{child.email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ParentDashboard;
