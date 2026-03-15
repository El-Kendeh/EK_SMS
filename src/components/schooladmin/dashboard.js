import React, { useEffect, useState } from 'react';
import './dashboard.css';

import SECURITY_CONFIG from '../../config/security';

const getBadgeUrl = (badgePath) => {
    if (!badgePath) return '';
    if (badgePath.startsWith('http') || badgePath.startsWith('data:')) return badgePath;
    const baseUrl = SECURITY_CONFIG.API_URL.replace(/\/$/, '');
    return `${baseUrl}${badgePath.startsWith('/') ? '' : '/'}${badgePath}`;
};

function SchoolBadge({ badge, name, size = 80 }) {
  const [failed, setFailed] = useState(false);
  const initials = name?.trim().charAt(0).toUpperCase() || '🏫';

  if (!badge || failed) {
    return <span style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: '#fff' }}>{initials}</span>;
  }

  return (
    <img
      src={getBadgeUrl(badge)}
      alt={`${name} logo`}
      style={{ width: size, height: size, objectFit: 'cover', borderRadius: 12 }}
      onError={() => setFailed(true)}
    />
  );
}

// eslint-disable-next-line no-unused-vars
const GradCapIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
);

const ClockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const LogoutIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 01-2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

function SchoolAdminDashboard({ onNavigate }) {
    const [user, setUser] = useState(null);
    const [isApproved, setIsApproved] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const userData = JSON.parse(userStr);
            setUser(userData);
            setIsApproved(userData.school?.is_approved || false);
        } else {
            onNavigate('login');
        }
    }, [onNavigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        onNavigate('home');
    };

    if (!user) return null;

    if (!isApproved) {
        return (
            <div className="sa-dashboard pending">
                <div className="pending-container">
                    <div className="pending-card">
                        <div className="pending-brand">
                            <SchoolBadge badge={user.school?.badge} name={user.school?.name} size={80} />
                        </div>
                        <div className="pending-icon-glow">
                            <ClockIcon />
                        </div>
                        <h1 className="pending-title">Account Under Review</h1>
                        <p className="pending-desc">
                            Welcome, <strong>{user.full_name}</strong>. Your registration for <strong>{user.school?.name}</strong> is currently being reviewed by our system administrators.
                        </p>
                        <div className="pending-steps">
                            <div className="pending-step done">
                                <div className="step-check"><CheckIcon /></div>
                                <span>Application Submitted</span>
                            </div>
                            <div className="pending-step active">
                                <div className="step-circle">2</div>
                                <span>Superadmin Review</span>
                            </div>
                            <div className="pending-step">
                                <div className="step-circle">3</div>
                                <span>Dashboard Access Granted</span>
                            </div>
                        </div>
                        <p className="pending-note">
                            You will receive an email once your account has been approved. This usually takes 24-48 hours.
                        </p>
                        <button className="btn-logout-alt" onClick={handleLogout}>
                            <LogoutIcon /> Sign Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="sa-dashboard approved">
            <header className="sa-header">
                <div className="sa-logo-section">
                    <div className="sa-logo-icon" style={{ background: user.school?.badge ? 'transparent' : undefined }}>
                        <SchoolBadge badge={user.school?.badge} name={user.school?.name} size={40} />
                    </div>
                    <div className="sa-school-info">
                        <h1 className="sa-school-name">{user.school.name}</h1>
                        <span className="sa-role-badge">School Administrator</span>
                    </div>
                </div>
                <div className="sa-user-nav">
                    <span className="sa-user-name">Welcome, {user.first_name}</span>
                    <button className="btn-logout" onClick={handleLogout}>
                        <LogoutIcon /> Sign Out
                    </button>
                </div>
            </header>

            <main className="sa-main">
                <div className="sa-welcome-banner">
                    <h2>Dashboard Overview</h2>
                    <p>Manage your institution's academic data, staff, and students from one central location.</p>
                </div>

                <div className="sa-grid">
                    {/* Quick Stats */}
                    <div className="sa-card stat">
                        <h3>Total Students</h3>
                        <p className="stat-value">0</p>
                        <span className="stat-label">Enrolled</span>
                    </div>
                    <div className="sa-card stat">
                        <h3>Total Teachers</h3>
                        <p className="stat-value">0</p>
                        <span className="stat-label">Active</span>
                    </div>
                    <div className="sa-card stat">
                        <h3>Academic Year</h3>
                        <p className="stat-value">N/A</p>
                        <span className="stat-label">Current Term</span>
                    </div>
                </div>

                <div className="sa-sections">
                    <div className="sa-card action-card">
                        <h3>Recent Activity</h3>
                        <div className="empty-state">
                            <p>No recent activity to show.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default SchoolAdminDashboard;
