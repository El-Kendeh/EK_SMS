import { motion } from 'framer-motion';
import { useTeacherProfile } from '../../hooks/useTeacherProfile';
import { formatRelativeTime } from '../../utils/teacherUtils';
import './TeacherProfile.css';

export default function TeacherProfile({ navigateTo }) {
  const { profile, loading } = useTeacherProfile();

  if (loading) {
    return (
      <div>
        <h1 className="tch-page-title">My Profile</h1>
        <div className="tch-skeleton" style={{ height: 120, marginTop: 20 }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <h1 className="tch-page-title">My Profile</h1>
        <div className="tch-empty">
          <span className="material-symbols-outlined">person</span>
          <p>Profile not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tp-root">
      <h1 className="tch-page-title">My Profile</h1>
      <p className="tch-page-sub">Account information and security settings</p>

      {/* Hero card */}
      <motion.div
        className="tp-hero-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="tp-avatar">{profile.initials}</div>
        <div className="tp-hero-info">
          <h2 className="tp-name">{profile.fullName}</h2>
          <p className="tp-role">Mathematics Teacher</p>
          <div className="tp-hero-chips">
            {profile.specializations.map(s => (
              <span key={s} className="tch-badge tch-badge--primary">{s}</span>
            ))}
          </div>
        </div>
        <span className={`tch-badge ${profile.status === 'active' ? 'tch-badge--green' : 'tch-badge--grey'} tp-status-badge`}>
          {profile.status}
        </span>
      </motion.div>

      {/* Details */}
      <div className="tp-sections">
        <div className="tp-section">
          <p className="tp-section-title">
            <span className="material-symbols-outlined">badge</span>
            Employee Information
          </p>
          <div className="tch-card">
            {[
              ['Employee Number', profile.employeeNumber],
              ['Email', profile.email],
              ['Phone', profile.phone],
              ['School', profile.school],
              ['Joined', new Date(profile.joinedDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })],
            ].map(([label, value]) => (
              <div key={label} className="tp-info-row">
                <span className="tp-info-label">{label}</span>
                <span className="tp-info-value">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tp-section">
          <p className="tp-section-title">
            <span className="material-symbols-outlined">security</span>
            Security &amp; Sessions
          </p>
          <div className="tch-card">
            <div className="tp-info-row">
              <span className="tp-info-label">Last Login</span>
              <span className="tp-info-value">{formatRelativeTime(profile.lastLogin)}</span>
            </div>
            <div className="tp-info-row">
              <span className="tp-info-label">Active Sessions</span>
              <span className="tp-info-value">
                <span className="tch-badge tch-badge--primary">{profile.activeSessions} session{profile.activeSessions !== 1 ? 's' : ''}</span>
              </span>
            </div>
            <div className="tp-info-row">
              <span className="tp-info-label">Two-Factor Auth</span>
              <span className="tp-info-value">
                <span className={`tch-badge ${profile.twoFactorEnabled ? 'tch-badge--green' : 'tch-badge--amber'}`}>
                  {profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </span>
            </div>
          </div>

          {!profile.twoFactorEnabled && (
            <div className="tp-2fa-prompt">
              <span className="material-symbols-outlined">shield</span>
              <div>
                <p className="tp-2fa-prompt__title">Enable Two-Factor Authentication</p>
                <p className="tp-2fa-prompt__text">
                  Add an extra layer of security to protect your grades and account.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
