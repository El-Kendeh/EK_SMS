import React, { useState } from 'react';
import './Login.css';

/* ---- Inline SVG icons (no extra deps) ---- */
const GradCapIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" aria-hidden="true">
    <path d="M12 3L1 9l4 2.18V15c0 .92 4.03 3 7 3s7-2.08 7-3v-3.82L23 9 12 3zm6.18 7L12 13.72 5.82 10 12 6.28 18.18 10zM19 13.99l-7 3.79-7-3.79V12.7l7 3.79 7-3.79v1.29z" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 7l10 7 10-7" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5M12 5l-7 7 7 7" />
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
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [remember, setRemember]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/login/', {
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

      if (onNavigate) onNavigate('dashboard');
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Back to home */}
      <button
        className="login-back-link"
        onClick={() => onNavigate && onNavigate('home')}
        type="button"
      >
        <ArrowLeftIcon />
        Back to home
      </button>

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo-wrap">
          <div className="login-logo-circle">
            <GradCapIcon />
            <span className="login-logo-dot" aria-hidden="true" />
          </div>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in to your EK-SMS account</p>

        {error && (
          <div className="login-error" role="alert">
            <AlertIcon />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Email */}
          <div className="form-field">
            <label htmlFor="login-email">Email address</label>
            <div className="input-wrap">
              <span className="input-icon"><MailIcon /></span>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="admin@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-field">
            <label htmlFor="login-password">Password</label>
            <div className="input-wrap">
              <span className="input-icon"><LockIcon /></span>
              <input
                id="login-password"
                type={showPwd ? 'text' : 'password'}
                className="form-input has-toggle"
                placeholder="••••••••••••"
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
              Forgot password?
            </button>
          </div>

          {/* Sign In */}
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading
              ? <span className="btn-spinner"><span className="spin" />Signing in…</span>
              : 'Sign in'}
          </button>
        </form>

        {/* Divider */}
        <div className="login-divider" style={{ marginTop: '20px' }}>
          <span>New to EK-SMS?</span>
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
        © 2026 EK-SMS — School Management System. All rights reserved.
      </p>
    </div>
  );
}

export default Login;
