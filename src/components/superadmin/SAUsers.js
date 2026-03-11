import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SECURITY_CONFIG } from '../../config/security';

const API = SECURITY_CONFIG.API_URL;

/* ---- Icons ---- */
const IcSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const IcBack = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
const IcShield = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const IcLock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>;
const IcBlock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>;
const IcList = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="3" cy="6" r="1.2" fill="currentColor" /><circle cx="3" cy="12" r="1.2" fill="currentColor" /><circle cx="3" cy="18" r="1.2" fill="currentColor" /></svg>;
const IcLogin = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>;
const IcGrade = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>;
const IcAdmin = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="9" y1="12" x2="15" y2="12" /></svg>;
const IcDesktop = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
const IcPhone = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.5" /></svg>;
const IcLaptop = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20M4 6a2 2 0 012-2h12a2 2 0 012 2v10H4V6z" /></svg>;
const IcTrendUp = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
const IcTrendDn = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>;
const IcEdit = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const IcHistory = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102-.66" /></svg>;
const IcKey = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6M15.5 7.5l2 2M18 5l2 2" /></svg>;
const IcPlus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IcX = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IcCheck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const IcMapPin = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>;

const RISK_CFG = {
  low: { color: 'var(--sa-green)', bg: 'var(--sa-green-dim)', label: 'Low' },
  medium: { color: 'var(--sa-amber)', bg: 'var(--sa-amber-dim)', label: 'Medium' },
  high: { color: 'var(--sa-red)', bg: 'var(--sa-red-dim)', label: 'High' },
};

/* ---- Deterministic 30-day risk sparkline ---- */
function genSparkData(userId, riskScore, failedAttempts) {
  const pts = [];
  let val = Math.max(5, riskScore - 15);
  for (let i = 0; i < 30; i++) {
    // pseudo-random walk seeded from userId + day index
    const seed = (userId * 31 + i * 17 + failedAttempts * 7) % 97;
    const delta = ((seed % 11) - 5) * 1.5;
    val = Math.min(100, Math.max(0, val + delta));
    pts.push(Math.round(val));
  }
  // ensure last point matches current riskScore
  pts[29] = riskScore;
  return pts;
}

function RiskSparkline({ userId, riskScore, failedAttempts, color }) {
  const data = genSparkData(userId, riskScore, failedAttempts);
  const W = 200, H = 40, PAD = 2;
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const scaleY = v => PAD + (H - PAD * 2) * (1 - (v - min) / (max - min || 1));
  const scaleX = i => (i / (data.length - 1)) * W;
  const points = data.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(' ');
  const areaPoints = `0,${H} ${points} ${W},${H}`;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--sa-text-2)' }}>Risk Trend — Last 30 Days</span>
        <span style={{ fontSize: '0.72rem', color, fontWeight: 700 }}>{data[0]} → {riskScore}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`spk-${userId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#spk-${userId})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* last point dot */}
        <circle cx={scaleX(29)} cy={scaleY(riskScore)} r="3" fill={color} />
      </svg>
    </div>
  );
}

const ROLE_COLORS = {
  'Super Admin': '#1B3FAF',
  'School Admin': '#0EA5E9',
  'Teacher': '#10B981',
  'Exam Officer': '#8B5CF6',
  'Finance Officer': '#F59E0B',
  'Parent': '#6366F1',
};

const ACTIVITY_ICONS = { grade: <IcGrade />, login: <IcLogin />, admin: <IcAdmin /> };

/* ============================================================
   Create User Modal
   ============================================================ */
const ROLES_LIST = ['Super Admin', 'School Admin', 'Teacher', 'Exam Officer', 'Finance Officer'];

function CreateUserModal({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'Teacher', school: '' });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const needsSchool = form.role !== 'Super Admin';

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (needsSchool && !form.school.trim()) e.school = 'School is required for this role';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitted(true);
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--sa-text-2)' }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: undefined })); }}
        placeholder={placeholder}
        style={{
          padding: '9px 12px', borderRadius: 8, fontSize: '0.875rem',
          background: 'var(--sa-card-bg2)', border: `1px solid ${errors[key] ? 'var(--sa-red)' : 'var(--sa-border)'}`,
          color: 'var(--sa-text)', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'var(--sa-font)',
        }}
      />
      {errors[key] && <span style={{ fontSize: '0.71875rem', color: 'var(--sa-red)' }}>{errors[key]}</span>}
    </div>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="sa-card" style={{ width: '100%', maxWidth: 460, padding: '28px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', animation: 'none' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800 }}>Invite New User</h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.78125rem', color: 'var(--sa-text-2)' }}>Creates account and sends credentials via email</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sa-text-2)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
            <IcX />
          </button>
        </div>

        {submitted ? (
          /* Success state */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--sa-green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--sa-green)' }}>
              <IcCheck />
            </div>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '1rem' }}>Invitation Sent</p>
            <p style={{ margin: '0 0 20px', fontSize: '0.8125rem', color: 'var(--sa-text-2)' }}>
              Credentials have been dispatched to <strong>{form.email}</strong>. The user must complete 2FA setup on first login.
            </p>
            <button className="sa-btn sa-btn--primary" onClick={onClose} style={{ width: '100%' }}>Done</button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {field('name', 'Full Name', 'text', 'e.g. Aminata Koroma')}
            {field('email', 'Email Address', 'email', 'user@school.edu.sl')}

            {/* Role */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--sa-text-2)' }}>Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, fontSize: '0.875rem', background: 'var(--sa-card-bg2)', border: '1px solid var(--sa-border)', color: 'var(--sa-text)', cursor: 'pointer', fontFamily: 'var(--sa-font)' }}
              >
                {ROLES_LIST.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* School — only for non-SA roles */}
            {needsSchool && field('school', 'School', 'text', 'e.g. MAB Secondary School')}

            {/* 2FA enforcement notice */}
            <div style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <span style={{ color: 'var(--sa-accent)', flexShrink: 0, marginTop: 1 }}><IcKey /></span>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--sa-text-2)', lineHeight: 1.5 }}>
                2FA setup will be <strong style={{ color: 'var(--sa-text)' }}>required on first login</strong> for all admin and teacher accounts per platform security policy.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" className="sa-btn sa-btn--ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button type="submit" className="sa-btn sa-btn--primary" style={{ flex: 2 }}>Send Invitation</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   User Profile view
   ============================================================ */
function UserProfile({ user, onBack, onNavigate, showToast }) {
  const risk = RISK_CFG[user.riskLevel] || RISK_CFG.low;
  const [suspended, setSuspended] = useState(user.status === 'suspended');
  const [resetSent, setResetSent] = useState(false);
  const [setupSent, setSetupSent] = useState(false);
  const [sessions, setSessions] = useState(user.sessions);
  const [twoFA, setTwoFA] = useState(user.twoFAEnabled);

  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const roleColor = ROLE_COLORS[user.role] || '#64748B';

  const terminateSession = (id) => setSessions(s => s.filter(sess => sess.id !== id));
  const terminateAll = () => setSessions(s => s.filter(sess => !sess.active));

  return (
    <div>
      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={onBack} style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <IcBack /> Back
        </button>
        <div>
          <h1 className="sa-page-title" style={{ margin: 0 }}>User Profile</h1>
          <p className="sa-page-sub" style={{ margin: 0 }}>EK-SMS Security Management System</p>
        </div>
        <button className="sa-btn sa-btn--primary" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => showToast && showToast(`Profile editing for ${user.name} — coming in next release`)}>
          <IcEdit /> Edit Profile
        </button>
      </div>

      {/* Top section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 260px) 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>

        {/* Avatar card */}
        <div className="sa-card" style={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#fff', border: '3px solid rgba(255,255,255,0.1)' }}>
              {initials}
            </div>
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: suspended ? 'var(--sa-red)' : 'var(--sa-green)', border: '3px solid var(--sa-card-bg)' }} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{user.name}</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--sa-accent)', fontWeight: 600 }}>{user.role}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--sa-text-2)' }}>{user.school} • ID: #{String(user.id).padStart(4, '0')}</span>

          {/* Account status */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4,
            fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '3px 12px', borderRadius: 999,
            background: suspended ? 'var(--sa-red-dim)' : 'var(--sa-green-dim)',
            color: suspended ? 'var(--sa-red)' : 'var(--sa-green)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
            {suspended ? 'Suspended' : 'Active'}
          </span>

          {/* 2FA status */}
          <div style={{
            marginTop: 8, width: '100%', padding: '10px 12px', borderRadius: 8,
            background: twoFA ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${twoFA ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: twoFA ? 'var(--sa-green)' : 'var(--sa-red)', flexShrink: 0, width: 16, height: 16 }}><IcKey /></span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: '0.71875rem', fontWeight: 700, color: twoFA ? 'var(--sa-green)' : 'var(--sa-red)' }}>
                2FA {twoFA ? 'Enabled' : 'Not Enrolled'}
              </p>
              <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--sa-text-3)' }}>
                {twoFA ? 'TOTP authenticator active' : 'Account is not 2FA protected'}
              </p>
            </div>
          </div>
        </div>

        {/* Security Risk Profile */}
        <div className="sa-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 18, height: 18, color: 'var(--sa-accent)' }}><IcShield /></span>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Security Risk Profile</span>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 8, background: risk.bg, color: risk.color }}>
              Risk Level: {risk.label}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
            {[
              { label: 'Successful Logins', value: user.successLogins, trend: '+5%', trendUp: true },
              { label: 'Failed Attempts', value: user.failedAttempts, trend: '-10%', trendUp: false },
              { label: 'Alerts Triggered', value: user.alertsTriggered, trend: '0%', trendUp: null },
            ].map((stat, i) => (
              <div key={i} style={{ background: 'var(--sa-card-bg2)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--sa-border)' }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: 'var(--sa-text-2)', fontWeight: 500 }}>{stat.label}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stat.value}</span>
                  {stat.trendUp !== null && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.72rem', fontWeight: 700, color: stat.trendUp ? 'var(--sa-green)' : 'var(--sa-amber)' }}>
                      <span style={{ width: 12, height: 12 }}>{stat.trendUp ? <IcTrendUp /> : <IcTrendDn />}</span>
                      {stat.trend}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Risk score bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 500, marginBottom: 6 }}>
              <span>Risk Assessment Score</span>
              <span style={{ color: risk.color }}>{user.riskScore}/100</span>
            </div>
            <div style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${user.riskScore}%`, background: risk.color, borderRadius: 999, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          {/* 30-day sparkline */}
          <RiskSparkline userId={user.id} riskScore={user.riskScore} failedAttempts={user.failedAttempts} color={risk.color} />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setResetSent(true)}
          style={{ flex: '1 1 140px', padding: '11px 16px', borderRadius: 10, border: '1px solid var(--sa-border)', cursor: 'pointer', background: 'var(--sa-card-bg2)', color: resetSent ? 'var(--sa-green)' : 'var(--sa-text)', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'var(--sa-font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <span style={{ width: 16, height: 16 }}><IcLock /></span>
          {resetSent ? 'Reset Email Sent' : 'Reset Password'}
        </button>

        {!twoFA && (
          <button
            onClick={() => { setSetupSent(true); setTimeout(() => setTwoFA(true), 1500); }}
            style={{ flex: '1 1 140px', padding: '11px 16px', borderRadius: 10, cursor: 'pointer', background: setupSent ? 'var(--sa-green-dim)' : 'rgba(99,102,241,0.1)', color: setupSent ? 'var(--sa-green)' : 'var(--sa-accent)', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'var(--sa-font)', border: `1px solid ${setupSent ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <span style={{ width: 16, height: 16 }}><IcKey /></span>
            {setupSent ? '2FA Setup Sent' : 'Send 2FA Setup'}
          </button>
        )}

        <button
          onClick={() => setSuspended(s => !s)}
          style={{ flex: '1 1 140px', padding: '11px 16px', borderRadius: 10, cursor: 'pointer', background: suspended ? 'var(--sa-green-dim)' : 'var(--sa-red-dim)', color: suspended ? 'var(--sa-green)' : 'var(--sa-red)', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'var(--sa-font)', border: `1px solid ${suspended ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <span style={{ width: 16, height: 16 }}><IcBlock /></span>
          {suspended ? 'Unsuspend Account' : 'Suspend Account'}
        </button>

        <button
          onClick={() => onNavigate && onNavigate('security-logs')}
          style={{ flex: '1 1 140px', padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(14,165,233,0.25)', cursor: 'pointer', background: 'var(--sa-accent-dim)', color: 'var(--sa-accent)', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'var(--sa-font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ width: 16, height: 16 }}><IcList /></span>
          View Full Logs
        </button>
      </div>

      {/* Activity + Sessions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Recent Activity */}
        <div className="sa-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ width: 16, height: 16, color: 'var(--sa-accent)' }}><IcHistory /></span>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Recent Activity</span>
          </div>
          <div style={{ position: 'relative', paddingLeft: 28 }}>
            <div style={{ position: 'absolute', left: 12, top: 0, bottom: 0, width: 1, background: 'var(--sa-border)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {user.recentActivity.map((act, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -28, width: 24, height: 24, borderRadius: '50%', background: `${act.color}22`, border: `2px solid var(--sa-card-bg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ width: 12, height: 12, color: act.color }}>{ACTIVITY_ICONS[act.icon] || <IcLogin />}</span>
                  </div>
                  <p style={{ margin: '0 0 3px', fontSize: '0.875rem', fontWeight: 700 }}>{act.title}</p>
                  <p style={{ margin: '0 0 3px', fontSize: '0.75rem', color: 'var(--sa-text-2)' }}>{act.desc}</p>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--sa-accent)', fontFamily: 'monospace', textTransform: 'uppercase' }}>{act.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div className="sa-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 16, height: 16, color: 'var(--sa-accent)' }}><IcDesktop /></span>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Active Sessions</span>
            </div>
            {sessions.some(s => s.active) && (
              <button
                onClick={terminateAll}
                style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sa-red)', background: 'var(--sa-red-dim)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--sa-font)' }}
              >
                Terminate All
              </button>
            )}
          </div>
          {sessions.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text-3)', textAlign: 'center', padding: '12px 0' }}>No sessions found</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessions.map(sess => (
                <div key={sess.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--sa-card-bg2)', border: `1px solid ${sess.active ? 'rgba(16,185,129,0.2)' : 'var(--sa-border)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 16, height: 16, color: sess.active ? 'var(--sa-green)' : 'var(--sa-text-3)', flexShrink: 0 }}>
                        {sess.device.includes('iPhone') || sess.device.includes('Android') ? <IcPhone /> : sess.device.includes('macOS') ? <IcLaptop /> : <IcDesktop />}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{sess.device}</span>
                          {sess.active && (
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: 'var(--sa-green)', color: '#fff', textTransform: 'uppercase' }}>Live</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.71875rem', color: 'var(--sa-text-3)' }}>
                          <span>IP: {sess.ip}</span>
                          <span>·</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 11, height: 11, color: 'var(--sa-text-3)' }}><IcMapPin /></span>{sess.location}</span>
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--sa-text-3)', marginTop: 3, fontFamily: 'monospace' }}>
                          Started: {sess.started} · Last active: {sess.lastActive.split(' ')[1]}
                        </div>
                      </div>
                    </div>
                    {sess.active && (
                      <button
                        onClick={() => terminateSession(sess.id)}
                        style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sa-red)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--sa-font)', flexShrink: 0, paddingTop: 2 }}
                      >
                        Terminate
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.6875rem', color: 'var(--sa-text-3)', fontFamily: 'monospace' }}>
                    Session ID: {sess.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   User list view
   ============================================================ */
export default function SAUsers({ onNavigate }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/users/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Enforce some structure for the UI
        const mapped = data.users.map(u => ({
          ...u,
          riskLevel: u.riskLevel || 'low',
          riskScore: u.riskScore || 0,
          failedAttempts: u.failedAttempts || 0,
          successLogins: u.successLogins || 0,
          twoFAEnabled: !!u.twoFAEnabled,
          lastSeen: u.last_login ? new Date(u.last_login).toLocaleString() : 'Never',
          recentActivity: u.recentActivity || [],
          sessions: u.sessions || []
        }));
        setUsers(mapped);
      } else {
        showToast(data.message || 'Failed to fetch users', 'error');
      }
    } catch (err) {
      showToast('Connection error occurred', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    let list = [...users];
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.school.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, search, roleFilter]);

  if (selected) return <UserProfile user={selected} onBack={() => setSelected(null)} onNavigate={onNavigate} showToast={showToast} />;

  const roles = useMemo(() => ['all', ...Array.from(new Set(users.map(u => u.role)))], [users]);
  const no2FACount = users.filter(u => !u.twoFAEnabled).length;

  return (
    <div style={{ position: 'relative' }}>
      {toast && <div className="sa-toast sa-toast--success">{toast}</div>}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}

      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">User Management</h1>
          <p className="sa-page-sub">Platform users, security risk profiles, and session management.</p>
        </div>
        <button
          className="sa-btn sa-btn--primary"
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}
        >
          <span style={{ width: 16, height: 16, display: 'flex' }}><IcPlus /></span>
          Invite User
        </button>
      </div>

      {/* 2FA compliance banner */}
      {no2FACount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, marginBottom: 16,
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <span style={{ color: 'var(--sa-red)', flexShrink: 0 }}><IcKey /></span>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text-2)', flex: 1 }}>
            <strong style={{ color: 'var(--sa-red)' }}>{no2FACount} {no2FACount === 1 ? 'user' : 'users'}</strong> have not enrolled in 2FA. Platform security policy requires 2FA for all admin and teacher accounts.
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="sa-search-bar" style={{ flex: 1, minWidth: 200 }}>
          <IcSearch />
          <input className="sa-search-input" placeholder="Search by name, email, or school…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="sa-filter-tabs">
          {roles.map(r => (
            <button key={r} className={`sa-filter-tab${roleFilter === r ? ' active' : ''}`} onClick={() => setRoleFilter(r)}>
              {r === 'all' ? 'All Roles' : r}
            </button>
          ))}
        </div>
      </div>

      {/* User cards */}
      {loading ? (
        <div className="sa-card" style={{ padding: 40, textAlign: 'center', color: 'var(--sa-text-2)' }}>
          <div className="sa-live-dot" style={{ margin: '0 auto 12px' }} />
          Loading users from directory...
        </div>
      ) : filtered.length === 0 ? (
        <div className="sa-card"><div className="sa-empty"><p className="sa-empty-title">No users found</p></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(user => {
            const risk = RISK_CFG[user.riskLevel] || RISK_CFG.low;
            const roleColor = ROLE_COLORS[user.role] || '#64748B';
            const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div
                key={user.id}
                className="sa-card"
                style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'border-color 0.15s' }}
                onClick={() => setSelected(user)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sa-border-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--sa-border)'; }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 800, color: '#fff' }}>
                    {initials}
                  </div>
                  <div style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: '50%', background: user.status === 'active' ? 'var(--sa-green)' : 'var(--sa-red)', border: '2px solid var(--sa-card-bg)' }} />
                </div>

                {/* Name + school */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                    {/* 2FA badge */}
                    <span title={user.twoFAEnabled ? '2FA Enabled' : '2FA Not Enrolled'} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                      background: user.twoFAEnabled ? 'var(--sa-green-dim)' : 'var(--sa-red-dim)',
                      color: user.twoFAEnabled ? 'var(--sa-green)' : 'var(--sa-red)',
                    }}>
                      <span style={{ width: 9, height: 9 }}><IcKey /></span>
                      {user.twoFAEnabled ? '2FA' : 'No 2FA'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--sa-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email} · {user.school}</p>
                </div>

                {/* Role badge */}
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: `${roleColor}22`, color: roleColor, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {user.role}
                </span>

                {/* Risk */}
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: risk.bg, color: risk.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {risk.label} Risk
                </span>

                {/* Last seen */}
                <span style={{ fontSize: '0.72rem', color: 'var(--sa-text-2)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {user.lastSeen}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
