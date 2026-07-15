import React, { useState, useRef, useEffect, useCallback } from 'react';
import ApiClient from '../../api/client';
import SECURITY_CONFIG from '../../config/security';

/* Compact number formatter for live platform counters (1,245 / 12.5k). */
function fmtNum(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(n);
}
const TIMEZONES = ['Africa/Freetown', 'Africa/Lagos', 'Africa/Accra', 'Africa/Nairobi', 'UTC', 'Europe/London'];
const LANGUAGES = ['English', 'French', 'Krio', 'Portuguese', 'Arabic'];

/* ================================================================
   Constants
   ================================================================ */
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
const IcPhone     = ({size=18}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5"/></svg>;
const IcSuccess   = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

/* ================================================================
   BrandingUploadBox — real file upload with preview
   ================================================================ */
function BrandingUploadBox({ kind, label, hint, accept, icon, currentUrl, onUploaded, onError }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentUrl || null);

  useEffect(() => { setPreviewUrl(currentUrl || null); }, [currentUrl]);

  const pickFile = () => inputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      onError?.('File too large (max 2MB).');
      e.target.value = '';
      return;
    }
    // Optimistic local preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('kind', kind);
      fd.append('file', file);
      const res = await ApiClient.post('/api/sa/branding/', fd);
      if (res?.success && res.url) {
        setPreviewUrl(res.url);
        onUploaded?.(res.url);
      } else {
        throw new Error(res?.message || 'Upload failed');
      }
    } catch (err) {
      onError?.(err?.message || 'Upload failed.');
      setPreviewUrl(currentUrl || null);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div
      className="sa-upload-box"
      role="button"
      tabIndex={0}
      aria-label={`Upload ${label}`}
      onClick={pickFile}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickFile(); } }}
      style={{ cursor: uploading ? 'wait' : 'pointer', position: 'relative', overflow: 'hidden' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFile}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={`${label} preview`}
          style={{ maxWidth: 64, maxHeight: 64, objectFit: 'contain', marginBottom: 8, borderRadius: 6 }}
        />
      ) : (
        <div className="sa-upload-box-icon">{icon}</div>
      )}
      <p className="sa-upload-box-label">{label}</p>
      <p className="sa-upload-box-hint">{uploading ? 'Uploading…' : hint}</p>
      {previewUrl && !uploading && (
        <p style={{ fontSize: '0.6875rem', color: 'var(--sa-accent)', marginTop: 4 }}>
          Click to replace
        </p>
      )}
    </div>
  );
}


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
function PasswordView({ onBack, onSubmit }) {
  const [current,      setCurrent]      = useState('');
  const [pw,           setPw]           = useState('');
  const [pwConfirm,    setPwConfirm]    = useState('');
  const [showCurrent,  setShowCurrent]  = useState(false);
  const [showPw,       setShowPw]       = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState('');

  const strength     = calcStrength(pw);
  const strengthLvl  = strength.filter(Boolean).length;
  const mismatch     = pwConfirm.length > 0 && pw !== pwConfirm;
  const sameAsOld    = current.length > 0 && pw.length > 0 && current === pw;
  const canProceed   = current.length > 0 && strengthLvl >= 3 && pw === pwConfirm && pwConfirm.length > 0 && !sameAsOld;

  const handleSave = async () => {
    if (!canProceed || saving) return;
    setErr('');
    setSaving(true);
    try {
      await onSubmit(current, pw);
      /* parent navigates away + toasts on success */
    } catch (e) {
      setErr(e?.message || 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--sa-border)' }}>
        <button className="sa-role-icon-btn" onClick={onBack} aria-label="Back"><IcBack /></button>
        <div>
          <p style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--sa-text)' }}>Change Password</p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>Update your Super Admin sign-in password</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: 'var(--sa-accent-dim)', color: 'var(--sa-accent)', marginBottom: 12 }}>
            <IcKey />
          </div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--sa-text)', marginBottom: 6 }}>Secure Your Account</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', lineHeight: 1.5 }}>Create a robust password to protect sensitive student and faculty data.</p>
        </div>

        {/* Current password */}
        <div style={{ marginBottom: 16 }}>
          <label className="sa-field-label" htmlFor="pw-current">Current Password</label>
          <div className="sa-input-wrap">
            <input id="pw-current" type={showCurrent ? 'text' : 'password'} className="sa-text-input"
              placeholder="Enter current password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" />
            <button type="button" className="sa-input-toggle-btn" onClick={() => setShowCurrent(!showCurrent)} aria-label={showCurrent ? 'Hide password' : 'Show password'}>
              {showCurrent ? <IcEyeOff /> : <IcEye />}
            </button>
          </div>
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
          {sameAsOld && <p style={{ fontSize: '0.6875rem', color: 'var(--sa-red)', marginTop: 4 }}>New password must differ from the current one</p>}
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

        {/* Error */}
        {err && (
          <div className="sa-info-callout" style={{ marginBottom: 14, borderColor: 'var(--sa-red)', color: 'var(--sa-red)' }}>
            <IcAlert size={16} /><p style={{ color: 'var(--sa-red)' }}>{err}</p>
          </div>
        )}

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
          style={{ width: '100%', height: 44, background: canProceed && !saving ? 'var(--sa-accent)' : 'var(--sa-card-bg2)', color: canProceed && !saving ? '#fff' : 'var(--sa-text-3)', border: 'none', borderRadius: 'var(--sa-radius-sm)', fontSize: '0.9375rem', fontWeight: 700, cursor: canProceed && !saving ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: canProceed && !saving ? '0 2px 10px rgba(14,165,233,0.3)' : 'none', transition: 'background 0.15s' }}
          disabled={!canProceed || saving}
          onClick={handleSave}
        >
          {saving ? 'Updating…' : <>Update Password <IcCheck size={18} /></>}
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   2FA Setup sub-view — real TOTP enrolment (SA-46).
   GET /api/sa/2fa/ is a side-effect-free status read; POST {action:'begin'}
   starts enrolment (QR + key + recovery codes); POST {action:'verify', code}
   enables; POST {action:'disable'} disables. Nothing is enforced until the
   first code verifies, so re-opening this view before enabling simply
   issues a fresh secret.
   ================================================================ */
function TwoFAView({ onBack, onEnabled, onDisabled }) {
  const otpRefs                         = useRef([]);
  const [otpDigits, setOtpDigits]       = useState(Array(6).fill(''));
  const [copied,    setCopied]          = useState(false);
  const [loading,   setLoading]         = useState(true);
  const [enabled,   setEnabled]         = useState(false);
  const [qrCode,    setQrCode]          = useState('');
  const [totpKey,   setTotpKey]         = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [error,     setError]           = useState('');
  const [busy,      setBusy]            = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await ApiClient.get('/api/sa/2fa/');
        if (cancelled) return;
        if (status?.enabled) {
          setEnabled(true);
        } else {
          // Opening the wizard is the explicit intent to enrol — begin here
          // (a plain status read must never rotate the pending secret).
          const d = await ApiClient.post('/api/sa/2fa/', { action: 'begin' });
          if (cancelled) return;
          setQrCode(d?.qr_code || '');
          setTotpKey(d?.manual_key || '');
          setRecoveryCodes(Array.isArray(d?.recovery_codes) ? d.recovery_codes : []);
        }
      } catch {
        if (!cancelled) setError('Could not load 2FA setup. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  const codesText = recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join('\n');
  const handleCopyCodes = () => navigator.clipboard?.writeText(codesText).catch(() => {});
  const handleSaveCodes = () => {
    const blob = new Blob([`EK-SMS 2FA recovery codes\n\n${codesText}\n`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ek-sms-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const code = otpDigits.join('');
  const handleVerify = async () => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await ApiClient.post('/api/sa/2fa/', { action: 'verify', code });
      if (res?.success === false) throw new Error(res.message || 'Invalid verification code');
      onEnabled();
    } catch (e) {
      setError(e?.message || 'Invalid verification code');
      setOtpDigits(Array(6).fill(''));
      otpRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await ApiClient.post('/api/sa/2fa/', { action: 'disable' });
      if (res?.success === false) throw new Error(res.message || 'Could not disable 2FA');
      onDisabled();
    } catch (e) {
      setError(e?.message || 'Could not disable 2FA');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--sa-border)' }}>
        <button className="sa-role-icon-btn" onClick={onBack} aria-label="Back"><IcBack /></button>
        <h2 style={{ flex: 1, textAlign: 'center', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--sa-text)', paddingRight: 32 }}>2FA Setup</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--sa-text-2)', fontSize: '0.875rem', padding: '40px 0' }}>Loading 2FA settings…</p>
        ) : enabled ? (
          <>
            {/* Already enabled → status + disable */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'inline-flex', color: 'var(--sa-green)', marginBottom: 12 }}><IcShieldLock size={44} /></div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--sa-text)', marginBottom: 8 }}>Two-Factor Auth is Active</h1>
              <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', lineHeight: 1.5 }}>
                Sign-ins to this account require a code from your authenticator app (or a recovery code).
              </p>
            </div>
            {error && <p role="alert" style={{ color: 'var(--sa-red, #ef4444)', fontSize: '0.8125rem', textAlign: 'center', marginBottom: 12 }}>{error}</p>}
            <button
              style={{ width: '100%', height: 44, background: 'transparent', color: 'var(--sa-red, #ef4444)', border: '1px solid var(--sa-red, #ef4444)', borderRadius: 'var(--sa-radius-sm)', fontSize: '0.9375rem', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}
              onClick={handleDisable}
              disabled={busy}
            >
              {busy ? 'Disabling…' : 'Disable Two-Factor Auth'}
            </button>
            <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)', marginTop: 10, lineHeight: 1.55, textAlign: 'center' }}>
              Disabling removes the authenticator secret and all recovery codes.
            </p>
          </>
        ) : error && !qrCode ? (
          <p role="alert" style={{ textAlign: 'center', color: 'var(--sa-red, #ef4444)', fontSize: '0.875rem', padding: '40px 0' }}>{error}</p>
        ) : (
          <>
            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--sa-text)', marginBottom: 8 }}>Enable Two-Factor Auth</h1>
              <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', lineHeight: 1.5 }}>Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code it shows.</p>
            </div>

            {/* QR box — real provisioning QR from the backend */}
            <div className="sa-qr-box">
              <div className="sa-qr-placeholder">
                {qrCode
                  ? <img src={qrCode} alt="Scan with your authenticator app" style={{ width: 140, height: 140, borderRadius: 8, background: '#fff', padding: 6 }} />
                  : <p style={{ fontSize: '0.75rem', color: 'var(--sa-text-2)' }}>QR unavailable — use the manual key below.</p>}
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
              {error && <p role="alert" style={{ color: 'var(--sa-red, #ef4444)', fontSize: '0.75rem', marginTop: 8 }}>{error}</p>}
            </div>

            {/* Recovery codes */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 700, color: 'var(--sa-text)' }}>
                  <span style={{ color: 'var(--sa-accent)' }}><IcLock /></span> Recovery Codes
                </h3>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={handleSaveCodes} style={{ background: 'none', border: 'none', color: 'var(--sa-accent)', fontSize: '0.6875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IcDownload /> Save
                  </button>
                  <button onClick={handleCopyCodes} style={{ background: 'none', border: 'none', color: 'var(--sa-accent)', fontSize: '0.6875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IcCopy /> Copy
                  </button>
                </div>
              </div>
              <div className="sa-recovery-grid">
                {recoveryCodes.map((rc, i) => (
                  <div key={i} className="sa-recovery-item">
                    <span className="sa-recovery-num">{i+1}.</span>
                    <code className="sa-recovery-code">{rc}</code>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)', marginTop: 8, lineHeight: 1.55 }}>
                Store these codes safely NOW — they are only shown during setup. Each can be used once to sign in if you lose your device.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer — only the enrolment flow needs the verify CTA */}
      {!loading && !enabled && qrCode && (
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--sa-border)', background: 'var(--sa-sidebar-bg)' }}>
          <button
            style={{ width: '100%', height: 44, background: code.length === 6 && !busy ? 'var(--sa-accent)' : 'var(--sa-card-bg2)', color: code.length === 6 && !busy ? '#fff' : 'var(--sa-text-3)', border: 'none', borderRadius: 'var(--sa-radius-sm)', fontSize: '0.9375rem', fontWeight: 700, cursor: code.length === 6 && !busy ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: code.length === 6 && !busy ? '0 2px 10px rgba(14,165,233,0.3)' : 'none', transition: 'background 0.15s' }}
            onClick={handleVerify}
            disabled={code.length !== 6 || busy}
          >
            {busy ? 'Verifying…' : <>Verify &amp; Enable 2FA <IcCheck size={18} /></>}
          </button>
        </div>
      )}
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
        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--sa-text)', marginBottom: 6 }}>Lockdown Recorded</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', lineHeight: 1.5 }}>
          An emergency-lockdown state is recorded and logged. Enforcement is not yet implemented — logins, active sessions, and grade records are not actually blocked.
        </p>
      </div>
      <div className="sa-lockdown-pill">
        <div className="sa-lockdown-dot" />
        Status: Recorded (not enforced)
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
          <p className="sa-lockdown-meta-label">Enforcement</p>
          <p className="sa-lockdown-meta-value" style={{ color: 'var(--sa-amber)' }}>Not implemented</p>
        </div>
        <div className="sa-lockdown-meta-item">
          <p className="sa-lockdown-meta-label">Audit</p>
          <p className="sa-lockdown-meta-value">Logged ✓</p>
        </div>
      </div>
      <p className="sa-lockdown-info">
        This records the lockdown intent and writes an audit entry only. Real enforcement (login block, session termination, grade locking) is pending.
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

  const [lastBackupAt,  setLastBackupAt]  = useState(null);
  const [lastBackupMeta, setLastBackupMeta] = useState(null);

  /* Branding (logo + favicon URLs persisted via AdminSetting) */
  const [brandingLogoUrl,    setBrandingLogoUrl]    = useState(null);
  const [brandingFaviconUrl, setBrandingFaviconUrl] = useState(null);

  /* Backup state */
  const [backingUp, setBackingUp] = useState(false);

  /* Lockdown server-state echo (kept so we can hydrate from server on reload).
     The setter is called from load + activate/deactivate handlers below. */
  // eslint-disable-next-line no-unused-vars
  const [lockdownState, setLockdownState] = useState(null);

  /* Live platform stats (realtime counters) */
  const [liveStats, setLiveStats] = useState({ schools: null, users: null, activeUsers: null, grades: null, pendingReviews: null });
  const [statsAt,   setStatsAt]   = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  /* General / platform settings (persisted via admin-settings JSON) */
  const [platform, setPlatform] = useState({
    platform_name: '', support_email: '', timezone: 'Africa/Freetown',
    default_language: 'English', maintenance_mode: false, allow_registrations: true,
  });
  const [savingGeneral, setSavingGeneral] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* Pull live platform counters from real endpoints */
  const fetchLiveStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [g, u] = await Promise.all([
        ApiClient.get('/api/grade-stats/').catch(() => null),
        ApiClient.get('/api/users/').catch(() => null),
      ]);
      const users = Array.isArray(u?.users) ? u.users : null;
      setLiveStats({
        schools:        g?.schools ?? null,
        grades:         g?.total_grades ?? null,
        pendingReviews: g?.pending_reviews ?? null,
        users:          users ? users.length : null,
        activeUsers:    users ? users.filter(x => x.status === 'active').length : null,
      });
      setStatsAt(Date.now());
    } catch { /* leave previous values */ }
    finally { setStatsLoading(false); }
  }, []);

  /* Load admin settings on mount */
  useEffect(() => {
    ApiClient.get('/api/admin-settings/').then(data => {
      if (data.success && data.settings) {
        const s = data.settings;
        if (s.twoFA !== undefined)          setTwoFA(s.twoFA);
        if (s.autoLock !== undefined)        setAutoLock(s.autoLock);
        if (s.sessionTimeout !== undefined)  setSessionTimeout(s.sessionTimeout);
        if (s.auditRetention !== undefined)  setAuditRetention(s.auditRetention);
        if (s.last_backup_at) setLastBackupAt(s.last_backup_at);
        if (s.last_backup_meta) setLastBackupMeta(s.last_backup_meta);
        if (s.branding_logo?.url)    setBrandingLogoUrl(s.branding_logo.url);
        if (s.branding_favicon?.url) setBrandingFaviconUrl(s.branding_favicon.url);
        setPlatform(p => ({
          platform_name:      s.platform_name      ?? p.platform_name,
          support_email:      s.support_email      ?? p.support_email,
          timezone:           s.timezone           ?? p.timezone,
          default_language:   s.default_language   ?? p.default_language,
          maintenance_mode:   s.maintenance_mode   ?? p.maintenance_mode,
          allow_registrations: s.allow_registrations ?? p.allow_registrations,
        }));
      }
    }).catch(() => {});
    ApiClient.get('/api/sa/lockdown/').then(d => {
      if (d?.success && d.state?.active) {
        setLockdownState(d.state);
        setIsLockdown(true);
        setLockdownTime(Date.parse(d.state.activated_at) || Date.now());
        if (d.state.protocol) setProtocol(d.state.protocol);
      }
    }).catch(() => {});
  }, []);

  /* Realtime counters: fetch on mount + refresh every 45s */
  useEffect(() => {
    fetchLiveStats();
    const t = setInterval(fetchLiveStats, 45000);
    return () => clearInterval(t);
  }, [fetchLiveStats]);

  const saveSecuritySettings = async () => {
    try {
      const res = await ApiClient.patch('/api/admin-settings/', {
        settings: { twoFA, autoLock, sessionTimeout, auditRetention },
      });
      if (res?.success === false) {
        showToast(res.message || 'Failed to save settings', 'error');
      } else {
        showToast('Security settings saved');
      }
    } catch (err) {
      const msg = err?.message || 'Failed to save settings';
      const status = err?.status ? ` (HTTP ${err.status})` : '';
      showToast(`${msg}${status}`, 'error');
    }
  };

  const saveGeneral = async () => {
    setSavingGeneral(true);
    try {
      const res = await ApiClient.patch('/api/admin-settings/', { settings: { ...platform } });
      if (res?.success === false) showToast(res.message || 'Failed to save general settings', 'error');
      else showToast('General settings saved');
    } catch (err) {
      showToast(err?.message || 'Failed to save general settings', 'error');
    } finally {
      setSavingGeneral(false);
    }
  };

  const saveAuditPolicy = async () => {
    try {
      const res = await ApiClient.patch('/api/admin-settings/', { settings: { auditRetention } });
      if (res?.success === false) showToast(res.message || 'Failed to save audit policy', 'error');
      else showToast('Audit retention policy saved');
    } catch (err) {
      showToast(err?.message || 'Failed to save audit policy', 'error');
    }
  };

  /* Real password change → POST /api/change-password/ (throws so the sub-view shows the error) */
  const changePassword = async (current, newPw) => {
    const res = await ApiClient.post('/api/change-password/', { current_password: current, new_password: newPw });
    if (res?.success === false) throw new Error(res.message || 'Could not change password');
    showToast('Password updated successfully');
    setSecView('main');
  };

  /* ---- Sub-views ---- */
  if (secView === 'password') {
    return <PasswordView onBack={() => setSecView('main')} onSubmit={changePassword} />;
  }
  if (secView === '2fa') {
    return <TwoFAView
      onBack={() => setSecView('main')}
      onEnabled={() => { setSecView('main'); showToast('Two-factor authentication enabled — codes are now required at login.'); }}
      onDisabled={() => { setSecView('main'); showToast('Two-factor authentication disabled.'); }}
    />;
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
        <button
          onClick={fetchLiveStats}
          disabled={statsLoading}
          title="Refresh live platform stats"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 'var(--sa-radius-sm)', border: '1px solid var(--sa-border)', background: 'var(--sa-card-bg)', color: 'var(--sa-text-2)', fontSize: '0.75rem', fontWeight: 600, cursor: statsLoading ? 'wait' : 'pointer' }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statsLoading ? 'var(--sa-amber)' : 'var(--sa-green)', boxShadow: statsLoading ? 'none' : '0 0 6px var(--sa-green)' }} />
          {statsLoading
            ? 'Refreshing…'
            : statsAt
              ? `Live · updated ${new Date(statsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
              : 'Live data'}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        </button>
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

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <span style={{ flexShrink: 0, color: 'var(--sa-amber)', marginTop: 1, fontWeight: 800 }}>!</span>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--sa-text-2)', lineHeight: 1.5 }}>
                  Recorded — enforcement pending. These preferences are saved, but global 2FA, auto grade-locking and the session timeout are not yet wired into login, grade and session handling, so they don't change behaviour yet.
                </p>
              </div>

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
                ? <LockdownActive lockdownTime={lockdownTime} onDeactivate={async () => {
                    try {
                      const res = await ApiClient.post('/api/sa/lockdown/', { action: 'deactivate' });
                      if (res?.success) {
                        setIsLockdown(false);
                        setLockdownState(res.state);
                        showToast('Lockdown deactivated', 'info');
                      } else {
                        showToast(res?.message || 'Failed to deactivate lockdown', 'error');
                      }
                    } catch (err) {
                      showToast(err?.message || 'Failed to deactivate lockdown', 'error');
                    }
                  }} />
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
                        <p className="sa-lcc-status-sub">Operations normal. Monitoring {liveStats.schools ?? '—'} school node{liveStats.schools === 1 ? '' : 's'}. Ready for transition.</p>
                        <div className="sa-lcc-net-bar"><div className="sa-lcc-net-bar-fill" /></div>
                      </div>
                    </div>

                    {/* Impact grid */}
                    <div className="sa-lcc-impact-grid">
                      {[
                        { icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V10.6M19 21V10.6M12 3L2 8h20L12 3z"/><rect x="9" y="13" width="6" height="8" rx="1"/></svg>, value: fmtNum(liveStats.schools),     label: 'Affected Schools' },
                        { icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>, value: fmtNum(liveStats.activeUsers ?? liveStats.users), label: 'Active Users' },
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
                          <p className="sa-lcc-initiate-title">Record Lockdown</p>
                          <p className="sa-lcc-initiate-sub">Records the state &amp; logs it (enforcement pending)</p>
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
                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="sa-btn sa-btn--primary sa-btn--sm" onClick={saveAuditPolicy}>
                    Apply Audit Policy
                  </button>
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
                  { id: 'schools', label: 'Schools Master List', sub: liveStats.schools != null ? `${liveStats.schools.toLocaleString()} school record${liveStats.schools === 1 ? '' : 's'}` : 'School registry' },
                  { id: 'grades',  label: 'Grade Records',       sub: liveStats.grades != null ? `${liveStats.grades.toLocaleString()} grades — anonymisable` : 'All terms — anonymisable' },
                  { id: 'audit',   label: 'Audit Logs',          sub: 'Immutable event trail'    },
                  { id: 'users',   label: 'User Accounts',       sub: liveStats.users != null ? `${liveStats.users.toLocaleString()} accounts` : 'Admins & staff only' },
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
                  {/* PDF removed — the endpoint has no PDF renderer; offering
                      it silently returned CSV (SA-16). */}
                  {['CSV', 'JSON'].map(fmt => (
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
          <>
          <div className="sa-settings-section">
            <h2 className="sa-settings-section-title">Platform Configuration</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div>
                <label className="sa-field-label" htmlFor="pf-name">Platform Name</label>
                <input id="pf-name" className="sa-text-input" placeholder="EK-SMS" value={platform.platform_name}
                  onChange={e => setPlatform(p => ({ ...p, platform_name: e.target.value }))} />
              </div>
              <div>
                <label className="sa-field-label" htmlFor="pf-email">Support Email</label>
                <input id="pf-email" type="email" className="sa-text-input" placeholder="support@elkendeh.com" value={platform.support_email}
                  onChange={e => setPlatform(p => ({ ...p, support_email: e.target.value }))} />
              </div>
              <div>
                <label className="sa-field-label" htmlFor="pf-tz">Default Timezone</label>
                <div className="sa-select-wrap">
                  <select id="pf-tz" className="sa-select" value={platform.timezone} onChange={e => setPlatform(p => ({ ...p, timezone: e.target.value }))}>
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                  <span className="sa-select-chevron"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg></span>
                </div>
              </div>
              <div>
                <label className="sa-field-label" htmlFor="pf-lang">Default Language</label>
                <div className="sa-select-wrap">
                  <select id="pf-lang" className="sa-select" value={platform.default_language} onChange={e => setPlatform(p => ({ ...p, default_language: e.target.value }))}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <span className="sa-select-chevron"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg></span>
                </div>
              </div>
            </div>

            <div className="sa-toggle-item" style={{ marginTop: 16 }}>
              <div className="sa-toggle-item-left">
                <div className="sa-toggle-item-icon"><IcGlobe /></div>
                <div>
                  <p className="sa-toggle-item-title">Allow New School Registrations</p>
                  <p className="sa-toggle-item-sub">When off, the public registration form is closed.</p>
                </div>
              </div>
              <Toggle checked={platform.allow_registrations} onChange={() => setPlatform(p => ({ ...p, allow_registrations: !p.allow_registrations }))} ariaLabel="Toggle new school registrations" />
            </div>

            <div className="sa-toggle-item">
              <div className="sa-toggle-item-left">
                <div className="sa-toggle-item-icon"><IcAlert /></div>
                <div>
                  <p className="sa-toggle-item-title">Maintenance Mode</p>
                  <p className="sa-toggle-item-sub">Show a maintenance banner and pause non-admin access.</p>
                </div>
              </div>
              <Toggle checked={platform.maintenance_mode} onChange={() => setPlatform(p => ({ ...p, maintenance_mode: !p.maintenance_mode }))} ariaLabel="Toggle maintenance mode" />
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="sa-btn sa-btn--primary sa-btn--sm" disabled={savingGeneral} onClick={saveGeneral}>
                {savingGeneral ? 'Saving…' : 'Save General Settings'}
              </button>
            </div>
          </div>

          <div className="sa-settings-section">
            <h2 className="sa-settings-section-title">Branding</h2>
            <div className="sa-upload-grid">
              <BrandingUploadBox
                kind="logo"
                label="System Logo"
                hint="PNG, SVG, JPG, WEBP (Max 2MB)"
                accept=".png,.svg,.jpg,.jpeg,.webp,image/*"
                icon={<IcImage />}
                currentUrl={brandingLogoUrl}
                onUploaded={(url) => { setBrandingLogoUrl(url); showToast('Logo uploaded — shown in the sidebar on next load'); }}
                onError={(msg) => showToast(msg, 'error')}
              />
              <BrandingUploadBox
                kind="favicon"
                label="Favicon"
                hint="ICO, PNG (32×32 recommended)"
                accept=".ico,.png,.svg,.jpg,.jpeg,image/*"
                icon={<IcGlobe />}
                currentUrl={brandingFaviconUrl}
                onUploaded={(url) => { setBrandingFaviconUrl(url); showToast('Favicon uploaded — applied as the tab icon on next load'); }}
                onError={(msg) => showToast(msg, 'error')}
              />
            </div>
          </div>
          </>
        )}

        {/* ===== BACKUPS ===== */}
        {activeTab === 'backups' && (
          <div className="sa-settings-section">
            <h2 className="sa-settings-section-title">Backup Control</h2>
            <div className="sa-backup-card">
              <div className="sa-backup-card-header">
                <div>
                  <p className="sa-backup-card-label">Last Backup</p>
                  <div className="sa-backup-card-status">
                    {lastBackupAt ? <><IcSuccess /> Recorded</> : 'Never'}
                  </div>
                  <p className="sa-backup-card-time">
                    {lastBackupAt
                      ? new Date(lastBackupAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' UTC'
                      : 'No backups recorded'}
                  </p>
                  {lastBackupMeta?.filename && (
                    <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-3)', marginTop: 4, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {lastBackupMeta.filename}
                      {lastBackupMeta.size_bytes ? ` · ${(lastBackupMeta.size_bytes / 1024).toFixed(0)} KB` : ''}
                    </p>
                  )}
                </div>
                <div className="sa-backup-card-icon"><IcCloud /></div>
              </div>
              <button
                className="sa-backup-btn"
                disabled={backingUp}
                onClick={async () => {
                  setBackingUp(true);
                  try {
                    const res = await ApiClient.post('/api/sa/backup/manual/', {});
                    if (res?.success) {
                      const iso = res.created_at || new Date().toISOString();
                      setLastBackupAt(iso);
                      setLastBackupMeta({
                        filename:   res.filename,
                        size_bytes: res.size_bytes,
                        created_at: iso,
                      });
                      showToast(`Backup entry recorded${res.filename ? `: ${res.filename}` : ''} — no database dump is produced yet.`);
                    } else {
                      showToast(res?.message || 'Backup failed', 'error');
                    }
                  } catch (err) {
                    showToast(err?.message || 'Backup failed', 'error');
                  } finally {
                    setBackingUp(false);
                  }
                }}
              >
                <IcCloud /> {backingUp ? 'Recording…' : 'Record Backup Entry'}
              </button>
              <p style={{ fontSize: '0.6875rem', color: 'var(--sa-amber)', marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.5 }}>
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <span>Not implemented yet — this records a backup entry and timestamp only; it does not produce an actual database dump.</span>
              </p>
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
                <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', margin: 0 }}>Your {exportFormat} file has been downloaded.</p>
                <button className="sa-btn sa-btn--primary sa-btn--full" style={{ justifyContent: 'center', marginTop: 4 }}
                  onClick={() => { setShowExportModal(false); setExported(false); }}>
                  <IcCheck size={16} /> Done
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
                  <p>Export is logged in the audit trail. All selected datasets are included. Note: redaction is not yet applied (data is not filtered for sensitive fields).</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="sa-gov-cancel-btn" style={{ flex: 1 }} onClick={() => setShowExportModal(false)} disabled={exporting}>Cancel</button>
                  <button
                    style={{ flex: 1, padding: '12px', background: exporting ? 'var(--sa-card-bg2)' : 'var(--sa-accent)', color: exporting ? 'var(--sa-text-3)' : '#fff', border: 'none', borderRadius: 'var(--sa-radius-sm)', fontSize: '0.875rem', fontWeight: 700, cursor: exporting ? 'not-allowed' : 'pointer' }}
                    disabled={exporting}
                    onClick={async () => {
                      setExporting(true);
                      try {
                        const datasets = Object.entries(exportSets)
                          .filter(([, v]) => v).map(([k]) => k).join(',');
                        const fmt = exportFormat.toLowerCase();
                        const token = localStorage.getItem('token') || '';
                        const url = `${SECURITY_CONFIG.API_URL}/api/sa/export/?datasets=${encodeURIComponent(datasets)}&format=${fmt}`;
                        const resp = await fetch(url, {
                          credentials: 'include',
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        });
                        if (!resp.ok) {
                          let msg = `Export failed (HTTP ${resp.status})`;
                          try {
                            const j = await resp.clone().json();
                            if (j?.message) msg = j.message;
                          } catch { /* non-JSON response */ }
                          throw new Error(msg);
                        }
                        // Browser-driven download from the response Blob
                        const blob = await resp.blob();
                        const cd = resp.headers.get('Content-Disposition') || '';
                        const m = cd.match(/filename="?([^";]+)"?/i);
                        const filename = m ? m[1] : `eksms_export.${fmt === 'csv' && datasets.split(',').length > 1 ? 'zip' : fmt}`;
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(blobUrl);
                        setExported(true);
                        showToast(`Downloaded ${filename}`);
                      } catch (err) {
                        showToast(err?.message || 'Export failed', 'error');
                      } finally {
                        setExporting(false);
                      }
                    }}
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
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sa-text)' }}>Record Emergency Lockdown?</p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)', marginTop: 2 }}>Records the intent and writes an audit entry.</p>
              </div>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', marginBottom: 20, lineHeight: 1.55 }}>
              ⚠️ <strong>Enforcement is not yet implemented.</strong> This records an emergency-lockdown state and logs it to the audit trail, but it does <strong>not</strong> currently block logins, terminate active sessions, or lock grade records.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="sa-gov-cancel-btn" style={{ flex: 1 }} onClick={() => setShowConfirm(false)}>Cancel</button>
              <button
                style={{ flex: 1, padding: '12px', background: 'var(--sa-red)', color: '#fff', border: 'none', borderRadius: 'var(--sa-radius-sm)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}
                onClick={async () => {
                  try {
                    const res = await ApiClient.post('/api/sa/lockdown/', {
                      action: 'activate', protocol, reason: lockdownReason,
                    });
                    if (res?.success) {
                      setIsLockdown(true);
                      setLockdownTime(Date.now());
                      setLockdownState(res.state);
                      setShowConfirm(false);
                      showToast(`Lockdown recorded — ${protocol} (not enforced yet)`, 'error');
                    } else {
                      showToast(res?.message || 'Failed to activate lockdown', 'error');
                    }
                  } catch (err) {
                    showToast(err?.message || 'Failed to activate lockdown', 'error');
                  }
                }}
              >
                Record Lockdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
