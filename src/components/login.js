import React, { useState, useCallback, useEffect } from 'react';
import './Login.css';
import ApiClient from '../api/client';
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
   Error Modal Component
   =================================================================== */
function ErrorModal({ message, onClose }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose} style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)'
    }}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{
        background: 'white', padding: '32px', borderRadius: '16px', maxWidth: '360px',
        width: '90%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        animation: 'fadeInDown 0.3s ease-out'
      }}>
        <div style={{ 
          width: '60px', height: '60px', borderRadius: '50%', background: '#fee2e2',
          color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <AlertIcon />
        </div>
        <h3 style={{ margin: '0 0 12px', color: '#1e293b', fontSize: '20px', fontWeight: '700' }}>Login Failed</h3>
        <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '15px', lineHeight: 1.5 }}>{message}</p>
        <button type="button" onClick={onClose} style={{
          background: '#ef4444', color: 'white', border: 'none', padding: '12px 24px',
          borderRadius: '10px', fontWeight: '600', cursor: 'pointer', width: '100%',
          fontSize: '15px', transition: 'background 0.2s'
        }} onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
           onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}>
          Try Again
        </button>
      </div>
    </div>
  );
}

/* ===================================================================
   Login Component
   =================================================================== */
function Login({ onNavigate }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMsg, setForgotMsg] = useState(false);
  const [goingHome, setGoingHome] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Auto-redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);

        if (user.must_change_password) {
          onNavigate('force-change-password');
          return;
        }

        const isSuper = user.is_superuser || user.role === 'superadmin' || user.role === 'admin' || user.role === 'superuser';
        if (isSuper) {
          onNavigate('superadmindashboard');
        } else if (user.role === 'school_admin') {
          onNavigate('sa-dashboard');
        } else if (user.role === 'teacher') {
          onNavigate('teacher-dashboard');
        } else if (user.role === 'student') {
          onNavigate('student-dashboard');
        } else if (user.role === 'parent') {
          onNavigate('parentdashboard');
        } else {
          onNavigate('home');
        }
      } catch (e) {
        setCheckingAuth(false);
      }
    } else {
      setCheckingAuth(false);
    }
  }, [onNavigate]);

  const handleBackHome = useCallback(() => {
    setGoingHome(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => onNavigate && onNavigate('home'));
    });
  }, [onNavigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email or username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await ApiClient.post('/api/login/', {
        username: identifier.trim(),
        password
      });

      if (!data.success) {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }

      const user = { ...data.user, must_change_password: !!data.must_change_password };
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(user));

      if (onNavigate) {
        if (data.must_change_password) {
          onNavigate('force-change-password');
          return;
        }
        const isSuper = user.is_superuser || user.role === 'superadmin' || user.role === 'admin' || user.role === 'superuser';
        if (isSuper) {
          onNavigate('superadmindashboard');
        } else if (user.role === 'school_admin') {
          onNavigate('sa-dashboard');
        } else if (user.role === 'teacher') {
          onNavigate('teacher-dashboard');
        } else if (user.role === 'student') {
          onNavigate('student-dashboard');
        } else if (user.role === 'parent') {
          onNavigate('parentdashboard');
        } else {
          onNavigate('home');
        }
      }
    } catch (err) {
      const raw = err.message || '';
      if (raw.toLowerCase().includes('failed to fetch') || raw.toLowerCase().includes('networkerror') || raw.toLowerCase().includes('load failed')) {
        setError('Unable to reach the server. Please check your connection and try again.');
      } else if (raw.toLowerCase().includes('invalid') || raw.toLowerCase().includes('credentials') || raw.toLowerCase().includes('password') || raw.toLowerCase().includes('401')) {
        setError('Incorrect email/username or password. Please check your credentials and try again.');
      } else if (raw) {
        setError(raw);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="login-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sa-loader-ring" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div className="login-page">

      {/* ── Desktop brand panel (hidden on mobile via CSS) ── */}
      <div className="login-panel" aria-hidden="true">
        <div className="login-panel__inner">
          <div className="login-panel__logo">
            <PruhLogo size={36} showText={true} textColor="#ffffff" variant="blue" />
          </div>
          <h2 className="login-panel__headline">
            School management,<br />
            <span className="login-panel__headline-accent">reimagined for Africa.</span>
          </h2>
          <p className="login-panel__sub">
            Trusted by institutions across the continent for secure,
            data-driven academic administration.
          </p>
          <ul className="login-panel__features">
            {[
              'Automated grading & report cards',
              'Real-time attendance tracking',
              'Multi-tenant school isolation',
              '256-bit encrypted audit logs',
            ].map((f) => (
              <li key={f}>
                <span className="login-panel__check">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="login-panel__stats">
            <div>
              <span className="login-panel__stat-num">20+</span>
              <span className="login-panel__stat-lbl">Data Models</span>
            </div>
            <div>
              <span className="login-panel__stat-num">2FA</span>
              <span className="login-panel__stat-lbl">Secured</span>
            </div>
            <div>
              <span className="login-panel__stat-num">99.9%</span>
              <span className="login-panel__stat-lbl">Uptime SLA</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: form card + footer ── */}
      <div className="login-right">
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
          onClick={handleBackHome}
          disabled={goingHome}
        >
          <SparkleIcon />
          {goingHome ? 'Going home…' : 'Back to Home'}
        </button>



        {/* ── Forgot password info ── */}
        {forgotMsg && (
          <div className="login-error" role="status" style={{ background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.35)', color: 'var(--text-primary)' }}>
            <AlertIcon />
            Password reset is not yet available. Please contact your system administrator.
            <button type="button" onClick={() => setForgotMsg(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem', lineHeight: 1 }} aria-label="Dismiss">×</button>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>

          {/* Email or Username */}
          <div className="form-field">
            <label htmlFor="login-identifier" className="sr-only">Email or Username</label>
            <input
              id="login-identifier"
              type="text"
              className="form-input"
              placeholder="Email or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
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
              onClick={() => setForgotMsg(true)}
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
        © 2026 · EL-KENDEH School Management System (EK-SMS ). All rights reserved.
      </p>
      </div>{/* end .login-right */}

      {/* ── Error modal ── */}
      {error && <ErrorModal message={error} onClose={() => setError('')} />}
    </div>
  );
}

export default Login;
