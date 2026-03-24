import React, { useState, useRef, useEffect } from 'react';
import ApiClient from '../../api/client';

/* ================================================================
   Constants
   ================================================================ */
const DEFAULT_RECOVERY_CODES = [];
const DEFAULT_TOTP_KEY = '';
const TABS = ['General', 'Security', 'Compliance', 'Backups'];

function calcStrength(pw) {
  return [
    pw.length >= 12,
    /[A-Z]/.test(pw) && /[a-z]/.test(pw),
    /[0-9!@#$%^&*()_+\-=]/.test(pw),
    pw.length > 0 && !/\b(password|school|admin|elken|123)\b/i.test(pw),
  ];
}

/* ================================================================
   SVG Icons
   ================================================================ */
const IcShield    = ({size=20}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcClock     = ({size=20}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcLock      = ({size=20}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const IcLockOpen  = ({size=20}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>;
const IcKey       = ({size=20}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l2 2M18 5l2 2"/></svg>;
const IcImage     = ({size=20}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IcGlobe     = ({size=20}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>;
const IcCloud     = ({size=20}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>;
const IcCheck     = ({size=16}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcCircle    = ({size=16}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/></svg>;
const IcEye       = ({size=18}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcEyeOff    = ({size=18}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const IcCopy      = ({size=16}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
const IcDownload  = ({size=16}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IcBack      = ({size=20}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IcInfo      = ({size=18}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IcAlert     = ({size=20}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcShieldLock = ({size=36}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><rect x="9" y="11" width="6" height="6" rx="1"/><path d="M10 11V9a2 2 0 014 0v2"/></svg>;
const IcArrow     = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IcPhone     = ({size=18}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5"/></svg>;
const IcSuccess   = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

/* ================================================================
   Toggle switch (accessible button with role="switch")
   ================================================================ */
function Toggle({ checked, onChange, ariaLabel }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
    >
      <div className={`sa-toggle-track${checked ? ' sa-toggle-track--on' : ''}`}>
        <div className={`sa-toggle-knob${checked ? ' sa-toggle-knob--on' : ''}`} />
      </div>
    </button>
  );
}

/* ================================================================
   Password Change sub-view
   ================================================================ */
function PasswordView({ onBack, onNext }) {
  const [pw,           setPw]           = useState('');
  const [pwConfirm,    setPwConfirm]    = useState('');
  const [showPw,       setShowPw]       = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  const strength     = calcStrength(pw);
  const strengthLvl  = strength.filter(Boolean).length;
  const mismatch     = pwConfirm.length > 0 && pw !== pwConfirm;
  const canProceed   = strengthLvl >= 3 && pw === pwConfirm && pwConfirm.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--sa-border)' }}>
        <button className="sa-role-icon-btn" onClick={onBack} aria-label="Back"><IcBack /></button>
        <div>
          <p style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--sa-text)' }}>Change Password</p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>Admin Setup — Step 1 of 2</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        {/* Step bar */}
        <div className="sa-step-bar" style={{ marginBottom: 24 }}>
          <div className="sa-step-seg sa-step-seg--done" />
          <div className="sa-step-seg sa-step-seg--pending" />
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: 'var(--sa-accent-dim)', color: 'var(--sa-accent)', marginBottom: 12 }}>
            <IcKey />
          </div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--sa-text)', marginBottom: 6 }}>Secure Your Account</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', lineHeight: 1.5 }}>Create a robust password to protect sensitive student and faculty data.</p>
        </div>

        {/* New password */}
        <div style={{ marginBottom: 16 }}>
          <label className="sa-field-label" htmlFor="pw-new">New Password</label>
          <div className="sa-input-wrap">
            <input id="pw-new" type={showPw ? 'text' : 'password'} className="sa-text-input"
              placeholder="Enter password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" />
            <button type="button" className="sa-input-toggle-btn" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <IcEyeOff /> : <IcEye />}
            </button>
          </div>
        </div>

        {/* Strength meter */}
        {pw.length > 0 && (
          <div style={{ background: 'var(--sa-card-bg)', border: '1px solid var(--sa-border)', borderRadius: 'var(--sa-radius-sm)', padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sa-text-2)' }}>
                Strength: {strengthLvl <= 1 ? 'Weak' : strengthLvl === 2 ? 'Medium' : strengthLvl === 3 ? 'Good' : 'Strong'}
              </span>
              <span style={{ fontSize: '0.6875rem', color: strengthLvl >= 4 ? 'var(--sa-green)' : 'var(--sa-accent)' }}>
                {strengthLvl >= 4 ? 'Excellent!' : 'Almost there'}
              </span>
            </div>
            <div className="sa-strength-bars">
              {[0,1,2,3].map(i => (
                <div key={i} className={`sa-strength-bar${i < strengthLvl ? (strengthLvl <= 2 ? ' sa-strength-bar--amber' : ' sa-strength-bar--green') : ''}`} />
              ))}
            </div>
            <ul className="sa-strength-checklist">
              {[
                { text: 'At least 12 characters',            pass: strength[0] },
                { text: 'Contains uppercase & lowercase',    pass: strength[1] },
                { text: 'At least one number or symbol',     pass: strength[2] },
                { text: 'No common dictionary words',        pass: strength[3] },
              ].map((item, i) => (
                <li key={i} className={`sa-strength-item${item.pass ? ' sa-strength-item--pass' : ''}`}>
                  <span className={item.pass ? 'sa-strength-item-icon--pass' : 'sa-strength-item-icon--fail'}>
                    {item.pass ? <IcCheck /> : <IcCircle />}
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confirm password */}
        <div style={{ marginBottom: 16 }}>
          <label className="sa-field-label" htmlFor="pw-confirm">Confirm Password</label>
          <div className="sa-input-wrap">
            <input id="pw-confirm" type={showConfirm ? 'text' : 'password'} className="sa-text-input"
              placeholder="Re-enter password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} autoComplete="new-password" />
            <button type="button" className="sa-input-toggle-btn" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
              {showConfirm ? <IcEyeOff /> : <IcEye />}
            </button>
          </div>
          {mismatch && <p style={{ fontSize: '0.6875rem', color: 'var(--sa-red)', marginTop: 4 }}>Passwords do not match</p>}
        </div>

        {/* Security tip */}
        <div className="sa-sec-tip">
          <IcShield />
          <div>
            <p className="sa-sec-tip-title">Admin Security Tip</p>
            <p className="sa-sec-tip-body">Avoid using personal dates or school names. Unique passwords reduce unauthorized access risk by 95%.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--sa-border)', background: 'var(--sa-sidebar-bg)' }}>
        <button
          style={{ width: '100%', height: 44, background: canProceed ? 'var(--sa-accent)' : 'var(--sa-card-bg2)', color: canProceed ? '#fff' : 'var(--sa-text-3)', border: 'none', borderRadius: 'var(--sa-radius-sm)', fontSize: '0.9375rem', fontWeight: 700, cursor: canProceed ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: canProceed ? '0 2px 10px rgba(14,165,233,0.3)' : 'none', transition: 'background 0.15s' }}
          disabled={!canProceed}
          onClick={onNext}
        >
          Next: Setup 2FA <IcArrow />
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   2FA Setup sub-view
   ================================================================ */
function TwoFAView({ onBack, onComplete, totpKey = DEFAULT_TOTP_KEY, recoveryCodes = DEFAULT_RECOVERY_CODES }) {
  const otpRefs                         = useRef([]);
  const [otpDigits, setOtpDigits]       = useState(Array(6).fill(''));
  const [copied,    setCopied]          = useState(false);

  const handleOtpChange = (idx, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[idx] = digit;
    setOtpDigits(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleCopyKey = () => {
    navigator.clipboard?.writeText(totpKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--sa-border)' }}>
        <button className="sa-role-icon-btn" onClick={onBack} aria-label="Back"><IcBack /></button>
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--sa-text)', paddingRight: 32 }}>2FA Setup</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        {/* Progress dots */}
        <div className="sa-progress-dots">
          <div className="sa-progress-dot sa-progress-dot--done" />
          <div className="sa-progress-dot sa-progress-dot--active" />
          <div className="sa-progress-dot" />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--sa-text)', marginBottom: 8 }}>Enable Two-Factor Auth</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', lineHeight: 1.5 }}>Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
        </div>

        {/* QR box */}
        <div className="sa-qr-box">
          <div className="sa-qr-placeholder">
            {/* Static QR-pattern SVG */}
            <svg viewBox="0 0 80 80" width="120" height="120" fill="currentColor" style={{ color: 'var(--sa-accent)', opacity: 0.8 }}>
              <rect x="4"  y="4"  width="24" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="3"/>
              <rect x="10" y="10" width="12" height="12" rx="1"/>
              <rect x="52" y="4"  width="24" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="3"/>
              <rect x="58" y="10" width="12" height="12" rx="1"/>
              <rect x="4"  y="52" width="24" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="3"/>
              <rect x="10" y="58" width="12" height="12" rx="1"/>
              {[34,38,42,46,50,54,58,62].map((x,xi) =>
                [34,38,42,46,50,54,58,62].filter((_,yi) => (xi+yi)%3!==0).map(y => (
                  <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" rx="0.5" opacity="0.7"/>
                ))
              )}
            </svg>
          </div>
          <div style={{ width: '100%' }}>
            <p className="sa-manual-key-label">Manual Entry Key</p>
            <div className="sa-manual-key-wrap">
              <code className="sa-manual-key">{totpKey}</code>
              <button style={{ background: 'none', border: 'none', color: copied ? 'var(--sa-green)' : 'var(--sa-text-3)', cursor: 'pointer', padding: 4, transition: 'color 0.2s' }} onClick={handleCopyKey} aria-label="Copy key">
                {copied ? <IcCheck /> : <IcCopy />}
              </button>
            </div>
          </div>
        </div>

        {/* OTP Input */}
        <div style={{ marginBottom: 28 }}>
          <label className="sa-field-label">Enter Verification Code</label>
          <div className="sa-otp-row">
            {[0,1,2].map(i => (
              <input key={i} ref={el => { otpRefs.current[i] = el; }} type="text" inputMode="numeric"
                maxLength={1} className="sa-otp-box" value={otpDigits[i]} placeholder="-"
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                aria-label={`OTP digit ${i+1}`}
              />
            ))}
            <span className="sa-otp-sep">—</span>
            {[3,4,5].map(i => (
              <input key={i} ref={el => { otpRefs.current[i] = el; }} type="text" inputMode="numeric"
                maxLength={1} className="sa-otp-box" value={otpDigits[i]} placeholder="-"
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                aria-label={`OTP digit ${i+1}`}
              />
            ))}
          </div>
        </div>

        {/* Recovery codes */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 700, color: 'var(--sa-text)' }}>
              <span style={{ color: 'var(--sa-accent)' }}><IcLock /></span> Recovery Codes
            </h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--sa-accent)', fontSize: '0.6875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IcDownload /> Save
              </button>
              <button style={{ background: 'none', border: 'none', color: 'var(--sa-accent)', fontSize: '0.6875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IcCopy /> Copy
              </button>
            </div>
          </div>
          <div className="sa-recovery-grid">
            {recoveryCodes.map((code, i) => (
              <div key={i} className="sa-recovery-item">
                <span className="sa-recovery-num">{i+1}.</span>
                <code className="sa-recovery-code">{code}</code>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)', marginTop: 8, lineHeight: 1.55 }}>
            Store these codes safely. Each can be used once to regain access if you lose your device.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--sa-border)', background: 'var(--sa-sidebar-bg)' }}>
        <button
          style={{ width: '100%', height: 44, background: 'var(--sa-accent)', color: '#fff', border: 'none', borderRadius: 'var(--sa-radius-sm)', fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 2px 10px rgba(14,165,233,0.3)' }}
          onClick={onComplete}
        >
          Complete Setup &amp; Login <IcCheck size={18} />
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   Active Lockdown Status
   ================================================================ */
function LockdownActive({ lockdownTime, onDeactivate }) {
  const elapsed = lockdownTime ? Math.max(0, Math.round((Date.now() - lockdownTime) / 60000)) : 0;

  return (
    <div className="sa-lockdown-status">
      <div className="sa-lockdown-icon-wrap">
        <div className="sa-lockdown-icon-glow" />
        <div className="sa-lockdown-icon"><IcShieldLock /></div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--sa-text)', marginBottom: 6 }}>Access Restricted</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', lineHeight: 1.5 }}>
          Emergency Lockdown is active. All non-admin access to EK-SMS has been suspended.
        </p>
      </div>
      <div className="sa-lockdown-pill">
        <div className="sa-lockdown-dot" />
        System Status: Emergency Lock
      </div>
      <div className="sa-lockdown-meta">
        <div className="sa-lockdown-meta-item">
          <p className="sa-lockdown-meta-label">Activated By</p>
          <p className="sa-lockdown-meta-value">Super Admin</p>
        </div>
        <div className="sa-lockdown-meta-item">
          <p className="sa-lockdown-meta-label">Duration</p>
          <p className="sa-lockdown-meta-value">{elapsed === 0 ? 'Just now' : `${elapsed}m ago`}</p>
        </div>
        <div className="sa-lockdown-meta-item">
          <p className="sa-lockdown-meta-label">Affected</p>
          <p className="sa-lockdown-meta-value">All Non-Admins</p>
        </div>
        <div className="sa-lockdown-meta-item">
          <p className="sa-lockdown-meta-label">Records</p>
          <p className="sa-lockdown-meta-value" style={{ color: 'var(--sa-green)' }}>Encrypted ✓</p>
        </div>
      </div>
      <p className="sa-lockdown-info">
        All grade records remain securely encrypted and protected. Contact your regional Super Admin for coordination.
      </p>
      <button className="sa-deactivate-btn" onClick={onDeactivate}>
        <IcLockOpen /> Deactivate Lockdown
      </button>
    </div>
  );
}

/* ================================================================
   SASettings — Main component
   ================================================================ */
export default function SASettings() {
  const [activeTab,     setActiveTab]     = useState('security');
  const [secView,       setSecView]       = useState('main'); // 'main' | 'password' | '2fa'

  /* Security toggles */
  const [twoFA,         setTwoFA]         = useState(true);
  const [autoLock,      setAutoLock]      = useState(false);
  const [sessionTimeout,setSessionTimeout]= useState(30);
  const [auditRetention,setAuditRetention]= useState('90 Days');

  /* Lockdown */
  const [isLockdown,     setIsLockdown]     = useState(false);
  const [lockdownTime,   setLockdownTime]   = useState(null);
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [protocol,       setProtocol]       = useState('full-blackout');
  const [lockdownReason, setLockdownReason] = useState('');

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat,    setExportFormat]    = useState('CSV');
  const [exportSets,      setExportSets]      = useState({ schools: true, grades: false, audit: false, users: false });
  const [exporting,       setExporting]       = useState(false);
  const [exported,        setExported]        = useState(false);

  /* 2FA + recovery */
  const [recoveryCodes, setRecoveryCodes] = useState(DEFAULT_RECOVERY_CODES);
  const [totpKey,       setTotpKey]       = useState(DEFAULT_TOTP_KEY);
  const [lastBackupAt,  setLastBackupAt]  = useState(null);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* Load admin settings on mount */
  useEffect(() => {
    ApiClient.get('/api/admin-settings/').then(data => {
      if (data.success && data.settings) {
        const s = data.settings;
        if (s.twoFA !== undefined)          setTwoFA(s.twoFA);
        if (s.autoLock !== undefined)        setAutoLock(s.autoLock);
        if (s.sessionTimeout !== undefined)  setSessionTimeout(s.sessionTimeout);
        if (s.auditRetention !== undefined)  setAuditRetention(s.auditRetention);
        if (Array.isArray(s.recovery_codes) && s.recovery_codes.length > 0)
          setRecoveryCodes(s.recovery_codes);
        if (s.totp_key)       setTotpKey(s.totp_key);
        if (s.last_backup_at) setLastBackupAt(s.last_backup_at);
      }
    }).catch(() => {});
  }, []);

  const saveSecuritySettings = async () => {
    try {
      await ApiClient.patch('/api/admin-settings/', { settings: { twoFA, autoLock, sessionTimeout, auditRetention } });
      showToast('Security settings saved');
    } catch (err) {
      showToast('Failed to save settings', 'error');
    }
  };

  /* ---- Sub-views ---- */
  if (secView === 'password') {
    return <PasswordView onBack={() => setSecView('main')} onNext={() => setSecView('2fa')} />;
  }
  if (secView === '2fa') {
    return <TwoFAView onBack={() => setSecView('password')} onComplete={() => { setSecView('main'); showToast('2FA setup complete'); }} totpKey={totpKey} recoveryCodes={recoveryCodes} />;
  }

  /* ---- Main view ---- */
  return (
    <div style={{ position: 'relative' }}>
      {toast && <div className={`sa-toast sa-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">System Settings</h1>
          <p className="sa-page-sub">Configure platform security, compliance, and operations</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="sa-settings-tabs">
        {TABS.map(tab => (
          <button key={tab}
            className={`sa-settings-tab${activeTab === tab.toLowerCase() ? ' sa-settings-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.toLowerCase())}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="sa-settings-body">

        {/* ===== SECURITY ===== */}
        {activeTab === 'security' && (
          <>
            <div className="sa-settings-section">
              <h2 className="sa-settings-section-title">Security Configuration</h2>

              <div className="sa-toggle-item">
                <div className="sa-toggle-item-left">
                  <div className="sa-toggle-item-icon"><IcShield /></div>
                  <div>
                    <p className="sa-toggle-item-title">Global 2FA Enforcement</p>
                    <p className="sa-toggle-item-sub">Require 2FA for all admins.</p>
                  </div>
                </div>
                <Toggle checked={twoFA} onChange={() => setTwoFA(v => !v)} ariaLabel="Toggle global 2FA enforcement" />
              </div>

              <div className="sa-toggle-item">
                <div className="sa-toggle-item-left">
                  <div className="sa-toggle-item-icon"><IcLock /></div>
                  <div>
                    <p className="sa-toggle-item-title">Auto Grade Locking</p>
                    <p className="sa-toggle-item-sub">Lock grades after 24h.</p>
                  </div>
                </div>
                <Toggle checked={autoLock} onChange={() => setAutoLock(v => !v)} ariaLabel="Toggle auto grade locking" />
              </div>

              <div className="sa-slider-item">
                <div className="sa-slider-header">
                  <div className="sa-slider-header-left">
                    <div className="sa-toggle-item-icon"><IcClock /></div>
                    <p className="sa-toggle-item-title">Session Timeout</p>
                  </div>
                  <span className="sa-slider-value">{sessionTimeout} mins</span>
                </div>
                <input type="range" className="sa-slider" min={5} max={120} value={sessionTimeout}
                  onChange={e => setSessionTimeout(Number(e.target.value))}
                  aria-label="Session timeout duration"
                />
                <div className="sa-slider-labels"><span>5m</span><span>120m</span></div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="sa-btn sa-btn--primary sa-btn--sm"
                  onClick={saveSecuritySettings}
                >
                  Apply Security Settings
                </button>
              </div>
            </div>

            {/* Account Security */}
            <div className="sa-settings-section">
              <h2 className="sa-settings-section-title">Account Security</h2>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { label: 'Change Password', icon: <IcKey />, action: () => setSecView('password') },
                  { label: 'Manage 2FA',      icon: <IcPhone />, action: () => setSecView('2fa') },
                ].map(btn => (
                  <button key={btn.label}
                    style={{ flex: 1, padding: '12px 0', background: 'var(--sa-card-bg)', border: '1px solid var(--sa-border)', borderRadius: 'var(--sa-radius-sm)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sa-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'border-color 0.15s, background 0.15s' }}
                    onClick={btn.action}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--sa-accent)'; e.currentTarget.style.background = 'var(--sa-accent-dim)'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--sa-border)'; e.currentTarget.style.background = 'var(--sa-card-bg)'; }}
                  >
                    {btn.icon} {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emergency Lockdown */}
            <div className="sa-settings-section">
              <h2 className="sa-settings-section-title">Emergency Lockdown</h2>
              {isLockdown
                ? <LockdownActive lockdownTime={lockdownTime} onDeactivate={() => { setIsLockdown(false); showToast('Lockdown deactivated', 'info'); }} />
                : (
                  <div>
                    {/* System status card */}
                    <div className="sa-lcc-status-card">
                      <div className="sa-lcc-status-card-inner">
                        <p className="sa-lcc-status-card-label">Current State</p>
                        <div className="sa-lcc-status-row">
                          <span className="sa-lcc-ping-wrap">
                            <span className="sa-lcc-ping-ring" />
                            <span className="sa-lcc-ping-dot sa-lcc-ping-dot--active" />
                          </span>
                          <h3 className="sa-lcc-status-heading">SYSTEM ACTIVE</h3>
                        </div>
                        <p className="sa-lcc-status-sub">Operations normal. Monitoring 42 school nodes. Ready for transition.</p>
                        <div className="sa-lcc-net-bar"><div className="sa-lcc-net-bar-fill" /></div>
                      </div>
                    </div>

                    {/* Impact grid */}
                    <div className="sa-lcc-impact-grid">
                      {[
                        { icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V10.6M19 21V10.6M12 3L2 8h20L12 3z"/><rect x="9" y="13" width="6" height="8" rx="1"/></svg>, value: '42',    label: 'Affected Schools' },
                        { icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, value: '12.5k', label: 'Active Users' },
                      ].map(stat => (
                        <div key={stat.label} className="sa-lcc-impact-item">
                          <span className="sa-lcc-impact-icon">{stat.icon}</span>
                          <span className="sa-lcc-impact-value">{stat.value}</span>
                          <span className="sa-lcc-impact-label">{stat.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Protocol selection */}
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sa-text-2)', marginBottom: 10 }}>Select Protocol</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {[
                        { id: 'grade-lock',    label: 'Grade Lock Only',      desc: 'Prevents grade modifications across all nodes.' },
                        { id: 'login-suspend', label: 'Login Suspension',     desc: 'Blocks new sessions. Active sessions persist.' },
                        { id: 'full-blackout', label: 'Full System Blackout', desc: 'Immediate termination of all access and APIs.' },
                      ].map(opt => (
                        <label key={opt.id} className={`sa-lcc-protocol${protocol === opt.id ? ' sa-lcc-protocol--selected' : ''}`}>
                          <input type="radio" name="lockdown-protocol" value={opt.id}
                            checked={protocol === opt.id} onChange={() => setProtocol(opt.id)}
                            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <p className="sa-lcc-protocol-label">{opt.label}</p>
                            <p className="sa-lcc-protocol-desc">{opt.desc}</p>
                          </div>
                          {protocol === opt.id && (
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--sa-red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </label>
                      ))}
                    </div>

                    {/* Reason textarea */}
                    <div style={{ marginBottom: 16 }}>
                      <label className="sa-field-label" htmlFor="lockdown-reason">
                        Emergency Authorization Reason <span style={{ color: 'var(--sa-red)' }}>*</span>
                      </label>
                      <textarea
                        id="lockdown-reason"
                        className="sa-lcc-reason"
                        rows={3}
                        placeholder="Enter incident ID or detailed reason for audit logs..."
                        value={lockdownReason}
                        onChange={e => setLockdownReason(e.target.value)}
                      />
                    </div>

                    {/* Initiate button */}
                    <button
                      className="sa-lcc-initiate-btn"
                      onClick={() => setShowConfirm(true)}
                      disabled={!lockdownReason.trim()}
                    >
                      <div className="sa-lcc-initiate-inner">
                        <div>
                          <p className="sa-lcc-initiate-title">Initiate Lockdown</p>
                          <p className="sa-lcc-initiate-sub">Execute selected protocol immediately</p>
                        </div>
                        <div className="sa-lcc-initiate-icon">
                          <IcShieldLock size={24} />
                        </div>
                      </div>
                    </button>
                    <p style={{ textAlign: 'center', fontSize: '0.625rem', color: 'var(--sa-text-3)', marginTop: 8 }}>
                      Action logged by SuperAdmin · All actions are irreversible without admin reset
                    </p>
                  </div>
                )
              }
            </div>
          </>
        )}

        {/* ===== COMPLIANCE ===== */}
        {activeTab === 'compliance' && (
          <>
            <div className="sa-settings-section">
              <h2 className="sa-settings-section-title">Audit Policy</h2>
              <div style={{ padding: '16px', background: 'var(--sa-card-bg)', border: '1px solid var(--sa-border)', borderRadius: 'var(--sa-radius)' }}>
                <label className="sa-field-label" htmlFor="audit-retention">Audit Log Retention Period</label>
                <div className="sa-select-wrap">
                  <select id="audit-retention" className="sa-select" value={auditRetention} onChange={e => setAuditRetention(e.target.value)}>
                    <option>30 Days</option>
                    <option>90 Days</option>
                    <option>1 Year</option>
                    <option>Indefinite</option>
                  </select>
                  <span className="sa-select-chevron">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </span>
                </div>
                <div className="sa-info-callout" style={{ marginTop: 10 }}>
                  <IcInfo />
                  <p>Logs older than this period will be automatically archived to cold storage.</p>
                </div>
              </div>
            </div>

            {/* Bulk Export */}
            <div className="sa-settings-section">
              <h2 className="sa-settings-section-title">Bulk Data Export</h2>
              <div style={{ padding: '16px', background: 'var(--sa-card-bg)', border: '1px solid var(--sa-border)', borderRadius: 'var(--sa-radius)' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', marginBottom: 16, lineHeight: 1.55 }}>
                  Export platform data for compliance reporting, audits, or off-platform analysis.
                </p>
                <p className="sa-field-label" style={{ marginBottom: 10 }}>Select Datasets</p>
                {[
                  { id: 'schools', label: 'Schools Master List', sub: '1,245 school records'     },
                  { id: 'grades',  label: 'Grade Records',       sub: 'All terms — anonymisable' },
                  { id: 'audit',   label: 'Audit Logs',          sub: 'Immutable event trail'    },
                  { id: 'users',   label: 'User Accounts',       sub: 'Admins & staff only'      },
                ].map(ds => (
                  <label key={ds.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 8, background: 'var(--sa-card-bg2)', border: `1px solid ${exportSets[ds.id] ? 'var(--sa-accent)' : 'var(--sa-border)'}`, borderRadius: 'var(--sa-radius-sm)', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                    <input type="checkbox" checked={exportSets[ds.id]}
                      onChange={() => setExportSets(p => ({ ...p, [ds.id]: !p[ds.id] }))}
                      style={{ width: 16, height: 16, accentColor: 'var(--sa-accent)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--sa-text)' }}>{ds.label}</p>
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--sa-text-3)' }}>{ds.sub}</p>
                    </div>
                  </label>
                ))}
                <p className="sa-field-label" style={{ marginTop: 16, marginBottom: 10 }}>Export Format</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['CSV', 'JSON', 'PDF'].map(fmt => (
                    <button key={fmt} onClick={() => setExportFormat(fmt)}
                      style={{ padding: '8px 20px', borderRadius: 'var(--sa-radius-sm)', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
                        border: `1px solid ${exportFormat === fmt ? 'var(--sa-accent)' : 'var(--sa-border)'}`,
                        background: exportFormat === fmt ? 'var(--sa-accent-dim)' : 'var(--sa-card-bg2)',
                        color: exportFormat === fmt ? 'var(--sa-accent)' : 'var(--sa-text-2)',
                        transition: 'all 0.15s' }}>
                      {fmt}
                    </button>
                  ))}
                </div>
                <button
                  className="sa-btn sa-btn--primary sa-btn--full"
                  style={{ marginTop: 20, justifyContent: 'center', height: 44 }}
                  disabled={!Object.values(exportSets).some(Boolean)}
                  onClick={() => setShowExportModal(true)}
                >
                  <IcDownload size={16} /> Export Selected Data
                </button>
                {!Object.values(exportSets).some(Boolean) && (
                  <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--sa-text-3)', marginTop: 6 }}>
                    Select at least one dataset to export.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* ===== GENERAL ===== */}
        {activeTab === 'general' && (
          <div className="sa-settings-section">
            <h2 className="sa-settings-section-title">Branding</h2>
            <div className="sa-upload-grid">
              <div className="sa-upload-box" role="button" tabIndex={0} aria-label="Upload system logo"
                onKeyDown={e => e.key === 'Enter' && e.currentTarget.click()}>
                <div className="sa-upload-box-icon"><IcImage /></div>
                <p className="sa-upload-box-label">System Logo</p>
                <p className="sa-upload-box-hint">PNG, SVG (Max 2MB)</p>
              </div>
              <div className="sa-upload-box" role="button" tabIndex={0} aria-label="Upload favicon"
                onKeyDown={e => e.key === 'Enter' && e.currentTarget.click()}>
                <div className="sa-upload-box-icon"><IcGlobe /></div>
                <p className="sa-upload-box-label">Favicon</p>
                <p className="sa-upload-box-hint">ICO, PNG (32×32)</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== BACKUPS ===== */}
        {activeTab === 'backups' && (
          <div className="sa-settings-section">
            <h2 className="sa-settings-section-title">Backup Control</h2>
            <div className="sa-backup-card">
              <div className="sa-backup-card-header">
                <div>
                  <p className="sa-backup-card-label">Last Auto-Backup</p>
                  <div className="sa-backup-card-status">
                    <IcSuccess /> Successful
                  </div>
                  <p className="sa-backup-card-time">
                    {lastBackupAt
                      ? new Date(lastBackupAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' UTC'
                      : 'No backups recorded'}
                  </p>
                </div>
                <div className="sa-backup-card-icon"><IcCloud /></div>
              </div>
              <button className="sa-backup-btn" onClick={() => showToast('Manual backup initiated')}>
                <IcCloud /> Initiate Manual Backup
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Export confirm modal */}
      {showExportModal && (
        <div className="sa-gov-modal-overlay" onClick={() => { if (!exporting) { setShowExportModal(false); setExported(false); } }}>
          <div className="sa-gov-modal" onClick={e => e.stopPropagation()}>
            {exported ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0', textAlign: 'center' }}>
                <div className="sa-stat-icon sa-stat-icon--green" style={{ width: 52, height: 52 }}><IcCheck size={22} /></div>
                <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--sa-text)', margin: 0 }}>Export Complete</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', margin: 0 }}>Your {exportFormat} file is ready for download.</p>
                <button className="sa-btn sa-btn--primary sa-btn--full" style={{ justifyContent: 'center', marginTop: 4 }}
                  onClick={() => { setShowExportModal(false); setExported(false); showToast('Export downloaded'); }}>
                  <IcDownload size={16} /> Download File
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--sa-accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sa-accent)', flexShrink: 0 }}>
                    <IcDownload size={20} />
                  </div>
                  <div>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sa-text)', margin: 0 }}>Confirm Export</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)', marginTop: 2 }}>This will generate a {exportFormat} file</p>
                  </div>
                </div>
                <div style={{ background: 'var(--sa-card-bg2)', border: '1px solid var(--sa-border)', borderRadius: 'var(--sa-radius-sm)', padding: '12px 14px', marginBottom: 16 }}>
                  <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--sa-text-3)', marginBottom: 8 }}>Exporting</p>
                  {Object.entries(exportSets).filter(([, v]) => v).map(([k]) => {
                    const labels = { schools: 'Schools Master List', grades: 'Grade Records', audit: 'Audit Logs', users: 'User Accounts' };
                    return (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <IcCheck size={14} />
                        <span style={{ fontSize: '0.8125rem', color: 'var(--sa-text)', fontWeight: 600 }}>{labels[k]}</span>
                      </div>
                    );
                  })}
                  <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: 'var(--sa-text-2)' }}>Format: <strong>{exportFormat}</strong></p>
                </div>
                <div className="sa-info-callout" style={{ marginBottom: 16 }}>
                  <IcInfo />
                  <p>Export is logged in the audit trail. Sensitive data is redacted per compliance policy.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="sa-gov-cancel-btn" style={{ flex: 1 }} onClick={() => setShowExportModal(false)} disabled={exporting}>Cancel</button>
                  <button
                    style={{ flex: 1, padding: '12px', background: exporting ? 'var(--sa-card-bg2)' : 'var(--sa-accent)', color: exporting ? 'var(--sa-text-3)' : '#fff', border: 'none', borderRadius: 'var(--sa-radius-sm)', fontSize: '0.875rem', fontWeight: 700, cursor: exporting ? 'not-allowed' : 'pointer' }}
                    disabled={exporting}
                    onClick={() => { setExporting(true); setTimeout(() => { setExporting(false); setExported(true); }, 1200); }}
                  >
                    {exporting ? 'Generating…' : 'Confirm Export'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Lockdown confirm modal */}
      {showConfirm && (
        <div className="sa-gov-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="sa-gov-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--sa-red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sa-red)', flexShrink: 0 }}>
                <IcAlert />
              </div>
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sa-text)' }}>Activate Emergency Lockdown?</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)', marginTop: 2 }}>This will immediately suspend all non-admin access.</p>
              </div>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', marginBottom: 20, lineHeight: 1.55 }}>
              All active sessions will be terminated. Students, teachers, and school admins will be locked out until you deactivate. This action will be logged in the audit trail.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="sa-gov-cancel-btn" style={{ flex: 1 }} onClick={() => setShowConfirm(false)}>Cancel</button>
              <button
                style={{ flex: 1, padding: '12px', background: 'var(--sa-red)', color: '#fff', border: 'none', borderRadius: 'var(--sa-radius-sm)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => { setIsLockdown(true); setLockdownTime(Date.now()); setShowConfirm(false); showToast('Emergency lockdown activated', 'error'); }}
              >
                Confirm Lockdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
