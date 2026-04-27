import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacherProfile } from '../../hooks/useTeacherProfile';
import { formatRelativeTime } from '../../utils/teacherUtils';
import './TeacherSettings.css';

const DEFAULT_PREFS = {
  gradeDiscrepancyAlerts: true,
  modificationRequests: true,
  gradeLockConfirmations: true,
  systemAlerts: true,
  weeklyFacultyDigest: false,
};

function SettingsSection({ icon, title, children }) {
  return (
    <div className="ts-section">
      <p className="ts-section-title">
        <span className="material-symbols-outlined">{icon}</span>
        {title}
      </p>
      <div className="tch-card ts-section-card">{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="ts-toggle-row">
      <div className="ts-toggle-row__info">
        <p className="ts-toggle-row__label">{label}</p>
        {description && <p className="ts-toggle-row__desc">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        className={`ts-toggle ${checked ? 'ts-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="ts-toggle__thumb" />
      </button>
    </div>
  );
}

export default function TeacherSettings({ onLogout }) {
  const { profile } = useTeacherProfile();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordFields, setPasswordFields] = useState({ current: '', next: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [exportMsg, setExportMsg] = useState(null);

  const togglePref = (key) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordFields.next !== passwordFields.confirm) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (passwordFields.next.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    try {
      const res = await fetch('/api/change-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          current_password: passwordFields.current,
          new_password: passwordFields.next,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
        setPasswordFields({ current: '', next: '', confirm: '' });
        setTimeout(() => { setShowPasswordForm(false); setPasswordMsg(null); }, 2000);
      } else {
        setPasswordMsg({ type: 'error', text: data.message || 'Failed to change password.' });
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  const handleExport = (format) => {
    setExportMsg({ text: `Generating ${format} export…` });
    setTimeout(() => setExportMsg({ text: `${format} export ready.`, success: true }), 1800);
    setTimeout(() => setExportMsg(null), 4000);
  };

  return (
    <div className="ts-root">
      <h1 className="tch-page-title">Faculty Settings</h1>
      <p className="tch-page-sub">Account management, security, and institutional preferences</p>

      {/* Profile Management */}
      <SettingsSection icon="manage_accounts" title="Profile Management">
        {profile && (
          <>
            <div className="ts-profile-hero">
              <div className="ts-profile-avatar">{profile.initials}</div>
              <div>
                <p className="ts-profile-name">{profile.fullName}</p>
                <p className="ts-profile-id">
                  <span className="tch-badge tch-badge--grey">FACULTY_ID: {profile.employeeNumber || 'N/A'}</span>
                </p>
              </div>
            </div>
            <div className="ts-divider" />
            <div className="ts-field-group">
              <div className="ts-field">
                <label className="tch-label">Full Name</label>
                <div className="ts-field-value">
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--tch-text-secondary)' }}>badge</span>
                  {profile.fullName}
                  <span className="material-symbols-outlined ts-lock-icon">lock</span>
                </div>
              </div>
              <div className="ts-field">
                <label className="tch-label">Employee ID</label>
                <div className="ts-field-value">
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--tch-text-secondary)' }}>tag</span>
                  {profile.employeeNumber || 'N/A'}
                  <span className="material-symbols-outlined ts-lock-icon">lock</span>
                </div>
              </div>
              <div className="ts-field">
                <label className="tch-label">Email Address</label>
                <div className="ts-field-value">
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--tch-text-secondary)' }}>mail</span>
                  {profile.email}
                  <span className="material-symbols-outlined ts-lock-icon">lock</span>
                </div>
              </div>
            </div>
            <div className="ts-field" style={{ marginTop: 14 }}>
              <label className="tch-label">Assigned Subjects</label>
              <div className="ts-chips">
                {(profile.specializations || profile.subjects || []).map(s => (
                  <span key={s} className="tch-badge tch-badge--primary">{s}</span>
                ))}
                {(!profile.specializations || profile.specializations.length === 0) && (!profile.subjects || profile.subjects.length === 0) && (
                  <span className="tch-badge tch-badge--grey">No subjects assigned</span>
                )}
              </div>
            </div>
            <p className="ts-admin-note">
              <span className="material-symbols-outlined">info</span>
              Profile information is managed by your school administrator. Contact admin to update your details.
            </p>
          </>
        )}
      </SettingsSection>

      {/* Security */}
      <SettingsSection icon="security" title="Security &amp; Infrastructure">
        {/* Change password row */}
        <div className="ts-security-row" onClick={() => setShowPasswordForm(p => !p)}>
          <div className="ts-security-row__left">
            <span className="material-symbols-outlined ts-security-row__icon">password</span>
            <div>
              <p className="ts-security-row__title">Change Password</p>
              <p className="ts-security-row__sub">Last login {formatRelativeTime(profile?.lastLogin)}</p>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ color: 'var(--tch-text-secondary)', fontSize: 18, transform: showPasswordForm ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
            chevron_right
          </span>
        </div>

        <AnimatePresence>
          {showPasswordForm && (
            <motion.form
              className="ts-password-form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleChangePassword}
            >
              <input
                type="password"
                className="tch-input"
                placeholder="Current password"
                value={passwordFields.current}
                onChange={e => setPasswordFields(p => ({ ...p, current: e.target.value }))}
                required
              />
              <input
                type="password"
                className="tch-input"
                placeholder="New password (min 8 characters)"
                value={passwordFields.next}
                onChange={e => setPasswordFields(p => ({ ...p, next: e.target.value }))}
                required
              />
              <input
                type="password"
                className="tch-input"
                placeholder="Confirm new password"
                value={passwordFields.confirm}
                onChange={e => setPasswordFields(p => ({ ...p, confirm: e.target.value }))}
                required
              />
              {passwordMsg && (
                <p className={`ts-msg ${passwordMsg.type === 'error' ? 'ts-msg--error' : 'ts-msg--success'}`}>
                  {passwordMsg.text}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => setShowPasswordForm(false)}>Cancel</button>
                <button type="submit" className="tch-btn tch-btn--primary tch-btn--sm">Update Password</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="ts-divider" />

        {/* 2FA status */}
        <div className="ts-2fa-row">
          <span className="material-symbols-outlined ts-2fa-icon" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          <div className="ts-2fa-info">
            <p className="ts-2fa-title">
              Account Security
              <span className={`tch-badge ${profile?.twoFactorEnabled ? 'tch-badge--green' : 'tch-badge--amber'}`} style={{ marginLeft: 8, fontSize: 10 }}>
                {profile?.twoFactorEnabled ? 'SECURE' : 'BASIC'}
              </span>
            </p>
            <p className="ts-2fa-sub">
              {profile?.twoFactorEnabled
                ? 'Two-factor authentication is active. Your account and student records are protected.'
                : 'Two-factor authentication is not enabled. Consider enabling it for enhanced security.'}
            </p>
          </div>
        </div>

        <div className="ts-divider" />

        {/* Session info */}
        <div className="ts-info-row">
          <span className="ts-info-label">Last Login</span>
          <span className="ts-info-value">{formatRelativeTime(profile?.lastLogin)}</span>
        </div>
        <div className="ts-info-row">
          <span className="ts-info-label">Active Sessions</span>
          <span className="ts-info-value">
            <span className="tch-badge tch-badge--primary">{profile?.activeSessions || 1}</span>
          </span>
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection icon="notifications_active" title="Institutional Notifications">
        <ToggleRow
          label="Grade Discrepancy Alerts"
          description="Notify when marks deviate from class average"
          checked={prefs.gradeDiscrepancyAlerts}
          onChange={() => togglePref('gradeDiscrepancyAlerts')}
        />
        <div className="ts-divider" />
        <ToggleRow
          label="Modification Requests"
          description="Updates on grade correction approvals"
          checked={prefs.modificationRequests}
          onChange={() => togglePref('modificationRequests')}
        />
        <div className="ts-divider" />
        <ToggleRow
          label="Grade Lock Confirmations"
          description="Notify when grades are permanently locked"
          checked={prefs.gradeLockConfirmations}
          onChange={() => togglePref('gradeLockConfirmations')}
        />
        <div className="ts-divider" />
        <ToggleRow
          label="System Alerts"
          description="Security events and system announcements"
          checked={prefs.systemAlerts}
          onChange={() => togglePref('systemAlerts')}
        />
        <div className="ts-divider" />
        <ToggleRow
          label="Weekly Faculty Digest"
          description="Summary of institutional compliance and analytics"
          checked={prefs.weeklyFacultyDigest}
          onChange={() => togglePref('weeklyFacultyDigest')}
        />
      </SettingsSection>

      {/* Data & Archives */}
      <SettingsSection icon="archive" title="Data &amp; Archives">
        {exportMsg && (
          <div className={`ts-msg ${exportMsg.success ? 'ts-msg--success' : ''}`} style={{ marginBottom: 12 }}>
            {exportMsg.text}
          </div>
        )}
        <div className="ts-export-row">
          <div className="ts-export-row__info">
            <span className="material-symbols-outlined" style={{ color: 'var(--tch-primary)', fontSize: 18 }}>download</span>
            <div>
              <p className="ts-security-row__title">Export Academic Records</p>
              <p className="ts-security-row__sub">Download a secure archive of your grade submissions</p>
            </div>
          </div>
          <div className="ts-export-btns">
            {['PDF', 'CSV', 'XLSX'].map(fmt => (
              <button key={fmt} className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => handleExport(fmt)}>
                {fmt}
              </button>
            ))}
          </div>
        </div>
      </SettingsSection>

      {/* Secure logout */}
      <div className="ts-logout-wrap">
        <button className="tch-btn ts-logout-btn" onClick={onLogout}>
          <span className="material-symbols-outlined">logout</span>
          Secure Logout from Terminal
        </button>
      </div>
    </div>
  );
}
