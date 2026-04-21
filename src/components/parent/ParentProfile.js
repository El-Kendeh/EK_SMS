import { useState } from 'react';
import { motion } from 'framer-motion';
import { useParentProfile } from '../../hooks/useParentProfile';
import { formatDate } from '../../utils/parentUtils';
import './ParentProfile.css';

function InfoRow({ label, value, icon }) {
  return (
    <div className="par-profile__info-row">
      <div className="par-profile__info-label">
        {icon && <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>}
        {label}
      </div>
      <div className="par-profile__info-val">{value || '—'}</div>
    </div>
  );
}

export default function ParentProfile({ parent }) {
  const { profile, loading } = useParentProfile();
  const [editing, setEditing] = useState(false);

  const data = profile || parent;
  const initials = data?.initials ||
    (data?.fullName ? data.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : 'P');

  if (loading) {
    return (
      <div>
        <div className="par-skeleton" style={{ height: 160, marginBottom: 16, borderRadius: 16 }} />
        <div className="par-skeleton" style={{ height: 300, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div className="par-profile">
      <h1 className="par-page-header__title" style={{ marginBottom: 24 }}>My Profile</h1>

      {/* Profile hero card */}
      <motion.div
        className="par-profile__hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
      >
        <div className="par-profile__hero-bg" />
        <div className="par-profile__hero-content">
          <div className="par-profile__avatar">{initials}</div>
          <div className="par-profile__hero-text">
            <h2 className="par-profile__name">{data?.fullName || 'Parent'}</h2>
            <p className="par-profile__role">
              <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>family_restroom</span>
              &nbsp;{data?.relationship || 'Parent / Guardian'}
            </p>
          </div>
          <button className="par-profile__edit-btn" onClick={() => setEditing((p) => !p)}>
            <span className="material-symbols-outlined">edit</span>
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
        <div className="par-profile__chips">
          <div className="par-profile__chip">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: 'var(--par-primary)' }}>verified_user</span>
            Verified Guardian
          </div>
          <div className="par-profile__chip">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            Linked since {data?.linkedSince ? new Date(data.linkedSince).getFullYear() : '—'}
          </div>
        </div>
      </motion.div>

      {/* Info grid */}
      <div className="par-profile__sections">
        <div className="par-profile__section par-card par-card--pad">
          <h3 className="par-profile__section-title">
            <span className="material-symbols-outlined">person</span>
            Personal Information
          </h3>
          <div className="par-profile__info-list">
            <InfoRow label="Full Name"          value={data?.fullName}       icon="badge" />
            <InfoRow label="National ID"         value={data?.nationalId}     icon="fingerprint" />
            <InfoRow label="Occupation"          value={data?.occupation}     icon="work" />
            <InfoRow label="Date Linked"         value={formatDate(data?.linkedSince)} icon="event" />
          </div>
        </div>

        <div className="par-profile__section par-card par-card--pad">
          <h3 className="par-profile__section-title">
            <span className="material-symbols-outlined">contact_phone</span>
            Contact Details
          </h3>
          <div className="par-profile__info-list">
            <InfoRow label="Email Address"       value={data?.email}          icon="email" />
            <InfoRow label="Phone Number"        value={data?.phone}          icon="phone" />
            <InfoRow label="Emergency Contact"   value={data?.emergencyContact} icon="emergency" />
            <InfoRow label="Home Address"        value={data?.address}        icon="home" />
          </div>
        </div>

        {/* Notification preferences */}
        {data?.notificationPrefs && (
          <div className="par-profile__section par-card par-card--pad" style={{ gridColumn: '1 / -1' }}>
            <h3 className="par-profile__section-title">
              <span className="material-symbols-outlined">notifications</span>
              Notification Preferences
            </h3>
            <div className="par-profile__prefs-grid">
              {Object.entries(data.notificationPrefs).map(([key, val]) => {
                const labels = {
                  gradePosted:    'New Grade Posted',
                  gradeLocked:    'Grade Locked',
                  securityAlert:  'Security Alerts',
                  attendance:     'Attendance Updates',
                  reportCard:     'Report Card Available',
                  systemMessages: 'System Messages',
                };
                return (
                  <div key={key} className="par-profile__pref-row">
                    <span className="par-profile__pref-label">{labels[key] || key}</span>
                    <div className={`par-profile__toggle ${val ? 'par-profile__toggle--on' : ''}`}>
                      <div className="par-profile__toggle-thumb" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Security note */}
      <div className="par-profile__security-note">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: 'var(--par-primary)' }}>lock</span>
        <p>
          Your account is protected with school-level security. To update your email or phone number,
          please contact the school administrator directly.
        </p>
      </div>
    </div>
  );
}
