import React, { useState } from 'react';
import './Login.css';
import { SECURITY_CONFIG } from '../config/security';
import PruhLogo from './PruhLogo';

/* ---- Icons ---- */
const SparkleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z" />
    <path d="M19 2 L19.8 5.2 L23 6 L19.8 6.8 L19 10 L18.2 6.8 L15 6 L18.2 5.2 Z" opacity="0.7" />
    <path d="M5 16 L5.6 18.4 L8 19 L5.6 19.6 L5 22 L4.4 19.6 L2 19 L4.4 18.4 Z" opacity="0.6" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/* ===================================================================
   Login Component
   =================================================================== */
function Login({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${SECURITY_CONFIG.API_URL}/api/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (onNavigate) {
        if (data.user.is_superuser) {
          onNavigate('dashboard');
        } else if (data.user.role === 'school_admin') {
          onNavigate('sa-dashboard');
        } else {
          onNavigate('home');
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* ── PRUH brand ── */}
        <div className="login-brand">
          <PruhLogo size={30} showText={true} textColor="#ffffff" variant="blue" />
        </div>

        {/* ── Portal label (top-center) ── */}
        <p className="login-portal-label">Sign-in Portal</p>

        {/* ── Back to Home (inside card, top-left) ── */}
        <button
          className="login-back-btn"
          type="button"
          onClick={() => onNavigate && onNavigate('home')}
        >
          <SparkleIcon />
          Back to Home
        </button>

        {/* ── Error banner ── */}
        {error && (
          <div className="login-error" role="alert">
            <AlertIcon />
            {error}
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>

          {/* Email */}
          <div className="form-field">
            <label htmlFor="login-email" className="sr-only">Email or National ID</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="Email or National ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {/* Password */}
          <div className="form-field">
            <label htmlFor="login-password" className="sr-only">Password</label>
            <div className="input-wrap">
              <input
                id="login-password"
                type={showPwd ? 'text' : 'password'}
                className="form-input has-toggle"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Remember + Forgot */}
          <div className="login-meta">
            <label className="remember-wrap">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="forgot-link"
              onClick={() => onNavigate && onNavigate('forgot')}
            >
              Forgot Password?
            </button>
          </div>

          {/* Login button — pill + gradient + arrow */}
          <button type="submit" className="btn-login" disabled={isLoading}>
            {isLoading ? (
              <span className="btn-spinner">
                <span className="spin" />
                Signing in…
              </span>
            ) : (
              <>
                <span>Login</span>
                <ArrowRightIcon />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="login-divider" style={{ marginTop: '24px' }}>
          <span>Don't have an account?</span>
        </div>

        {/* Register CTA */}
        <button
          type="button"
          className="btn-outline"
          style={{ marginTop: '12px' }}
          onClick={() => onNavigate && onNavigate('register')}
        >
          Register your institution
        </button>

      </div>

      {/* Page footer */}
      <p className="login-footer">
        © 2026 EK-SMS · EL-KENDEH School Management System. All rights reserved.
      </p>
    </div>
  );
}

export default Login;
