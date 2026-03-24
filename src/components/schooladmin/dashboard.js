import React, { useEffect, useState } from 'react';
import './dashboard.css';

import SECURITY_CONFIG from '../../config/security';
import ApiClient from '../../api/client';

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
    const [saStats, setSaStats] = useState(null);

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

    useEffect(() => {
        if (!isApproved) return;
        ApiClient.get('/api/sa-stats/').then(data => {
            if (data.success) setSaStats(data);
        }).catch(() => {});
    }, [isApproved]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        onNavigate('home');
    };

    if (!user) return null;

    // BRANDING: Apply school colors if available
    const colors = user.school?.brand_colors?.split(',').filter(Boolean) || [];
    const primaryColor = colors[0] || '#6366f1'; // Default Fallback
    
    const brandingStyles = {
        '--sa-accent': primaryColor,
        '--sa-accent-dim': `${primaryColor}15`,
        '--sa-accent-hover': `${primaryColor}dd`,
    };

    if (!isApproved) {
        return (
            <div className="sa-dashboard pending" style={brandingStyles}>
                <div className="pending-container">
                    <div className="pending-card">
                        <div className="pending-brand">
                            <SchoolBadge badge={user.school?.badge} name={user.school?.name} size={100} />
                        </div>
                        <div className="pending-icon-glow" style={{ background: brandingStyles['--sa-accent-dim'], color: primaryColor }}>
                            <ClockIcon />
                        </div>
                        <h1 className="pending-title">Account Under Review</h1>
                        <p className="pending-desc">
                            Welcome, <strong>{user.full_name}</strong>. Your registration for <strong>{user.school?.name}</strong> is currently being reviewed by our system administrators.
                        </p>
                        <div className="pending-steps">
                            <div className="pending-step done" style={{ color: primaryColor }}>
                                <div className="step-check" style={{ background: brandingStyles['--sa-accent-dim'], color: primaryColor }}><CheckIcon /></div>
                                <span>Application Submitted</span>
                            </div>
                            <div className="pending-step active">
                                <div className="step-circle" style={{ borderColor: primaryColor }}>2</div>
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

    const approvalDate = user.school?.approval_date
        ? new Date(user.school.approval_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;
    const registrationDate = user.school?.registration_date
        ? new Date(user.school.registration_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    return (
        <div className="sa-dashboard approved" style={brandingStyles}>
            <header className="sa-header">
                <div className="sa-logo-section">
                    <div className="sa-logo-icon" style={{ background: 'transparent' }}>
                        <SchoolBadge badge={user.school?.badge} name={user.school?.name} size={42} />
                    </div>
                    <div className="sa-school-info">
                        <h1 className="sa-school-name">{user.school.name}</h1>
                        <span className="sa-role-badge" style={{ color: primaryColor }}>School Administrator</span>
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
                    <h2>Welcome back, {user.first_name || user.full_name || 'Admin'}</h2>
                    <p>Your school dashboard is active. Academic data management features are coming soon.</p>
                </div>

                {/* Live stats row */}
                <div className="sa-grid">
                    <div className="sa-card stat">
                        <h3>Students</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', color: primaryColor }}>
                            {saStats ? saStats.student_count.toLocaleString() : '—'}
                        </p>
                        <span className="stat-label">Enrolled &amp; active</span>
                    </div>
                    <div className="sa-card stat">
                        <h3>Teachers</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', color: primaryColor }}>
                            {saStats ? saStats.teacher_count.toLocaleString() : '—'}
                        </p>
                        <span className="stat-label">Active staff</span>
                    </div>
                    <div className="sa-card stat">
                        <h3>Classrooms</h3>
                        <p className="stat-value" style={{ fontSize: '1.75rem', color: primaryColor }}>
                            {saStats ? saStats.classroom_count.toLocaleString() : '—'}
                        </p>
                        <span className="stat-label">Active classes</span>
                    </div>
                    <div className="sa-card stat">
                        <h3>Academic Year</h3>
                        <p className="stat-value" style={{ fontSize: '1.1rem', fontWeight: 700, color: primaryColor }}>
                            {saStats ? (saStats.academic_year || 'Not set') : '—'}
                        </p>
                        <span className="stat-label">Current year</span>
                    </div>
                </div>

                {/* School info cards */}
                <div className="sa-grid">
                    <div className="sa-card stat">
                        <h3>School Code</h3>
                        <p className="stat-value" style={{ fontSize: '1.5rem' }}>
                            {user.school?.code || '—'}
                        </p>
                        <span className="stat-label">Institution ID</span>
                    </div>
                    <div className="sa-card stat">
                        <h3>Status</h3>
                        <p className="stat-value" style={{ fontSize: '1.25rem', color: primaryColor }}>Active</p>
                        <span className="stat-label">
                            {approvalDate ? `Approved ${approvalDate}` : registrationDate ? `Registered ${registrationDate}` : 'Approved'}
                        </span>
                    </div>
                    <div className="sa-card stat">
                        <h3>Contact Email</h3>
                        <p className="stat-value" style={{ fontSize: '0.9rem', fontWeight: 600, wordBreak: 'break-all' }}>
                            {user.school?.email || user.email || '—'}
                        </p>
                        <span className="stat-label">Primary contact</span>
                    </div>
                </div>

                {/* Coming-soon feature cards */}
                <div className="sa-sections">
                    <div className="sa-card action-card">
                        <h3>Academic Modules</h3>
                        <div className="sa-module-grid">
                            {[
                                { label: 'Students', desc: 'Enrol and manage students', icon: '🎓' },
                                { label: 'Teachers', desc: 'Staff records and assignments', icon: '👩‍🏫' },
                                { label: 'Classes', desc: 'Classrooms and timetables', icon: '🏫' },
                                { label: 'Grades & Reports', desc: 'Scores, terms, and report cards', icon: '📊' },
                            ].map(m => (
                                <div key={m.label} style={{ background: 'var(--sa-card-bg, #f8fafc)', border: '1px solid var(--sa-border, #e2e8f0)', borderRadius: '10px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--sa-text, #1e293b)' }}>{m.label}</p>
                                        <p style={{ margin: '2px 0 6px', fontSize: '0.78rem', color: 'var(--sa-text-2, #64748b)' }}>{m.desc}</p>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: primaryColor, background: `${primaryColor}18`, padding: '2px 8px', borderRadius: '20px' }}>
                                            Coming Soon
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default SchoolAdminDashboard;
