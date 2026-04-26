import React, { useState } from 'react';
import ApiClient from '../api/client';
import PruhLogo from './PruhLogo';

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="18" height="18">
    <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="18" height="18">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

function StrengthBar({ password }) {
  const checks = [
    password.length >= 12,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#e5e7eb', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
  return password.length > 0 ? (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < score ? colors[score] : '#e5e7eb',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score] }}>{labels[score]}</span>
    </div>
  ) : null;
}

export default function ForceChangePassword({ onNavigate }) {
  const userStr = localStorage.getItem('user');
  let user = {};
  try { user = JSON.parse(userStr || '{}'); } catch { /* */ }

  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const getDestination = () => {
    const isSuper = user.is_superuser || ['superadmin', 'admin', 'superuser'].includes(user.role);
    if (isSuper) return 'superadmindashboard';
    if (user.role === 'school_admin') return 'sa-dashboard';
    if (user.role === 'teacher') return 'teacher-dashboard';
    if (user.role === 'student') return 'student-dashboard';
    if (user.role === 'parent') return 'parentdashboard';
    return 'login';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPwd !== confirmPwd) {
      setError('New passwords do not match.');
      return;
    }
    if (newPwd.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await ApiClient.post('/api/change-password-strong/', {
        old_password: oldPwd,
        new_password: newPwd,
      });
      if (!data.success) throw new Error(data.message || 'Password change failed.');
      setSuccess(true);
      const updatedUser = { ...user, must_change_password: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setTimeout(() => onNavigate(getDestination()), 1500);
    } catch (err) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1B3FAF 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '40px 36px', maxWidth: 440, width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <PruhLogo size={30} showText={true} textColor="#1B3FAF" variant="blue" />
        </div>

        <div style={{
          background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10,
          padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: '#92400e', fontSize: 14 }}>Password change required</p>
            <p style={{ margin: '4px 0 0', color: '#78350f', fontSize: 13 }}>
              Your account requires a new password before you can continue. Please set a strong password below.
            </p>
          </div>
        </div>

        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
          Set your password
        </h2>
        <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14 }}>
          Welcome, <strong>{user.full_name || user.first_name || user.username || 'User'}</strong>
        </p>

        {success && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20, color: '#166534', fontWeight: 600, fontSize: 14,
          }}>
            ✓ Password changed successfully. Redirecting…
          </div>
        )}

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Current password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPwd}
                onChange={e => setOldPwd(e.target.value)}
                placeholder="Your current (temporary) password"
                required
                style={{
                  width: '100%', padding: '11px 40px 11px 14px', borderRadius: 10,
                  border: '1.5px solid #d1d5db', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#1B3FAF'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
              <button type="button" onClick={() => setShowOld(v => !v)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0,
              }}>
                {showOld ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              New password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="Min 12 chars, uppercase, digit, special"
                required
                style={{
                  width: '100%', padding: '11px 40px 11px 14px', borderRadius: 10,
                  border: '1.5px solid #d1d5db', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#1B3FAF'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
              <button type="button" onClick={() => setShowNew(v => !v)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0,
              }}>
                {showNew ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <StrengthBar password={newPwd} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Repeat new password"
              required
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                border: `1.5px solid ${confirmPwd && confirmPwd !== newPwd ? '#ef4444' : '#d1d5db'}`,
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#1B3FAF'}
              onBlur={e => e.target.style.borderColor = (confirmPwd && confirmPwd !== newPwd) ? '#ef4444' : '#d1d5db'}
            />
            {confirmPwd && confirmPwd !== newPwd && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>Passwords do not match</p>
            )}
          </div>

          <ul style={{ margin: '0 0 24px', padding: '0 0 0 18px', color: '#6b7280', fontSize: 12 }}>
            {[
              ['At least 12 characters', newPwd.length >= 12],
              ['One uppercase letter', /[A-Z]/.test(newPwd)],
              ['One digit', /[0-9]/.test(newPwd)],
              ['One special character', /[^A-Za-z0-9]/.test(newPwd)],
            ].map(([label, met]) => (
              <li key={label} style={{ color: met ? '#22c55e' : '#6b7280', marginBottom: 2 }}>
                {met ? '✓' : '○'} {label}
              </li>
            ))}
          </ul>

          <button
            type="submit"
            disabled={loading || success}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #1B3FAF, #0EA5E9)', color: '#fff',
              fontWeight: 700, fontSize: 15, opacity: (loading || success) ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Changing password…' : success ? 'Done! Redirecting…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  );
}
