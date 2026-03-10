import React, { useState, useRef } from 'react';

/* ================================================================
   Icons
   ================================================================ */
const IcBack     = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IcCamera   = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const IcUser     = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcGlobe    = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>;
const IcKey      = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l2 2M18 5l2 2"/></svg>;
const IcShield   = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcEye      = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcEyeOff   = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const IcCheck    = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcActivity = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IcClock    = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcTrash    = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;

/* ================================================================
   Avatar colour palette — pick one for the initials avatar
   ================================================================ */
const AVATAR_COLORS = [
  { id: 'blue',   bg: 'linear-gradient(135deg,#1B3FAF,#0EA5E9)' },
  { id: 'purple', bg: 'linear-gradient(135deg,#7C3AED,#A78BFA)' },
  { id: 'green',  bg: 'linear-gradient(135deg,#059669,#34D399)' },
  { id: 'red',    bg: 'linear-gradient(135deg,#DC2626,#F87171)' },
  { id: 'amber',  bg: 'linear-gradient(135deg,#D97706,#FCD34D)' },
  { id: 'rose',   bg: 'linear-gradient(135deg,#BE185D,#F472B6)' },
];

function calcStrength(pw) {
  return [
    pw.length >= 12,
    /[A-Z]/.test(pw) && /[a-z]/.test(pw),
    /[0-9]/.test(pw),
    /[!@#$%^&*()_+\-=]/.test(pw),
  ];
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', 'var(--sa-red)', 'var(--sa-amber)', 'var(--sa-accent)', 'var(--sa-green)'];

/* ================================================================
   Section wrapper
   ================================================================ */
function Section({ title, icon, children }) {
  return (
    <div className="sp-section">
      <div className="sp-section-hdr">
        <span className="sp-section-ico">{icon}</span>
        <h2 className="sp-section-title">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ================================================================
   Field row
   ================================================================ */
function Field({ label, children }) {
  return (
    <div className="sp-field">
      <label className="sa-field-label">{label}</label>
      {children}
    </div>
  );
}

/* ================================================================
   Activity log mock
   ================================================================ */
const ACTIVITY = [
  { action: 'Approved school registration',       target: 'Freetown International Academy', time: '14m ago',  icon: 'green'  },
  { action: 'Initiated Emergency Lockdown Test',  target: 'System-wide',                    time: '2h ago',   icon: 'red'    },
  { action: 'Exported Audit Logs (CSV)',          target: 'Compliance — Term 2',             time: '5h ago',   icon: 'accent' },
  { action: 'Rejected school registration',       target: 'Lunsar Islamic School',           time: '1d ago',   icon: 'amber'  },
  { action: 'Updated Global 2FA enforcement',     target: 'Security Settings',               time: '2d ago',   icon: 'purple' },
];

/* ================================================================
   Main Component
   ================================================================ */
export default function SAProfile({ user, onBack }) {
  const fileInputRef = useRef(null);

  /* ---- Load persisted profile data ---- */
  const saved = (() => { try { return JSON.parse(localStorage.getItem('ek-sms-profile') || '{}'); } catch { return {}; } })();

  const [avatarSrc,   setAvatarSrc]   = useState(saved.avatarSrc   || null);
  const [avatarColor, setAvatarColor] = useState(saved.avatarColor || 'blue');
  const [fullName,    setFullName]    = useState(saved.fullName     || user?.full_name  || user?.username || '');
  const [email,       setEmail]       = useState(saved.email        || user?.email      || '');
  const [phone,       setPhone]       = useState(saved.phone        || '');
  const [bio,         setBio]         = useState(saved.bio          || '');
  const [language,    setLanguage]    = useState(saved.language     || 'English');
  const [timezone,    setTimezone]    = useState(saved.timezone     || 'Africa/Freetown (GMT+0)');

  /* ---- Password state ---- */
  const [currPw,      setCurrPw]      = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [showCurr,    setShowCurr]    = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConf,    setShowConf]    = useState(false);
  const [pwSaved,     setPwSaved]     = useState(false);

  /* ---- UI state ---- */
  const [saved2,      setSaved2]      = useState(false);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ---- Avatar file upload ---- */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2 MB', 'error'); return; }
    if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => { setAvatarSrc(null); fileInputRef.current && (fileInputRef.current.value = ''); };

  /* ---- Save profile ---- */
  const handleSave = () => {
    const data = { avatarSrc, avatarColor, fullName, email, phone, bio, language, timezone };
    localStorage.setItem('ek-sms-profile', JSON.stringify(data));
    setSaved2(true);
    showToast('Profile updated successfully');
    setTimeout(() => setSaved2(false), 2000);
  };

  /* ---- Save password ---- */
  const strength     = calcStrength(newPw);
  const strengthLvl  = strength.filter(Boolean).length;
  const mismatch     = confirmPw.length > 0 && newPw !== confirmPw;
  const canSavePw    = currPw.length > 0 && strengthLvl >= 3 && newPw === confirmPw && confirmPw.length > 0;

  const handleSavePassword = () => {
    setPwSaved(true);
    setCurrPw(''); setNewPw(''); setConfirmPw('');
    showToast('Password changed successfully');
    setTimeout(() => setPwSaved(false), 2000);
  };

  /* ---- Derived ---- */
  const initials  = (fullName || email || 'SA').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colorCfg  = AVATAR_COLORS.find(c => c.id === avatarColor) || AVATAR_COLORS[0];
  const joinDate  = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Feb 20, 2026';

  const ChevDown = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>;

  return (
    <div className="sp-wrap">
      {toast && <div className={`sa-toast sa-toast--${toast.type}`}>{toast.msg}</div>}

      {/* Page header */}
      <div className="sp-page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="sp-back-btn" onClick={onBack} aria-label="Back">
            <IcBack />
          </button>
          <div>
            <h1 className="sa-page-title" style={{ margin: 0 }}>My Profile</h1>
            <p className="sa-page-sub">Manage your personal info and account preferences</p>
          </div>
        </div>
        <button
          className={`sa-btn sa-btn--primary sp-save-btn${saved2 ? ' sp-save-btn--done' : ''}`}
          onClick={handleSave}
        >
          {saved2 ? <><IcCheck /> Saved</> : 'Save Changes'}
        </button>
      </div>

      <div className="sp-body">

        {/* ===== Avatar Card ===== */}
        <div className="sp-avatar-card">
          {/* Avatar preview */}
          <div className="sp-avatar-wrap">
            <div className="sp-avatar" style={{ background: avatarSrc ? 'transparent' : colorCfg.bg }}>
              {avatarSrc
                ? <img src={avatarSrc} alt="Profile" className="sp-avatar-img" />
                : <span className="sp-avatar-initials">{initials}</span>
              }
            </div>
            <button
              className="sp-avatar-cam"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change profile photo"
              title="Upload photo"
            >
              <IcCamera />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {/* Name + role */}
          <div className="sp-avatar-info">
            <p className="sp-avatar-name">{fullName || email || 'Super Admin'}</p>
            <span className="sp-role-badge">Super Admin</span>
            <p className="sp-avatar-joined">Member since {joinDate}</p>
          </div>

          {/* Avatar colour picker (only shown when no photo uploaded) */}
          {!avatarSrc && (
            <div className="sp-color-picker">
              <p className="sp-color-label">Avatar colour</p>
              <div className="sp-color-swatches">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c.id}
                    className={`sp-color-swatch${avatarColor === c.id ? ' sp-color-swatch--active' : ''}`}
                    style={{ background: c.bg }}
                    onClick={() => setAvatarColor(c.id)}
                    aria-label={`Set avatar colour ${c.id}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upload / remove controls */}
          <div className="sp-avatar-btns">
            <button className="sa-btn sa-btn--ghost sa-btn--sm" onClick={() => fileInputRef.current?.click()}>
              <IcCamera /> Upload Photo
            </button>
            {avatarSrc && (
              <button className="sa-btn sa-btn--ghost sa-btn--sm sp-remove-btn" onClick={removeAvatar}>
                <IcTrash /> Remove
              </button>
            )}
          </div>
          <p className="sp-avatar-hint">PNG, JPG or GIF · Max 2 MB</p>
        </div>

        {/* ===== Personal Info ===== */}
        <Section title="Personal Information" icon={<IcUser />}>
          <div className="sp-field-grid">
            <Field label="Full Name">
              <div className="sp-input-wrap">
                <input
                  className="sa-text-input"
                  type="text"
                  placeholder="e.g. Ishmael Kanneh"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
            </Field>
            <Field label="Email Address">
              <div className="sp-input-wrap">
                <input
                  className="sa-text-input"
                  type="email"
                  placeholder="admin@elkendeh.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </Field>
            <Field label="Phone Number">
              <div className="sp-input-wrap">
                <input
                  className="sa-text-input"
                  type="tel"
                  placeholder="+232 76 000 000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            </Field>
            <Field label="Bio">
              <textarea
                className="sa-lcc-reason"
                rows={3}
                placeholder="Brief description about your role…"
                value={bio}
                onChange={e => setBio(e.target.value)}
                style={{ resize: 'vertical', minHeight: 80 }}
              />
            </Field>
          </div>
        </Section>

        {/* ===== Preferences ===== */}
        <Section title="Preferences" icon={<IcGlobe />}>
          <div className="sp-field-grid sp-field-grid--2col">
            <Field label="Language">
              <div className="sa-select-wrap">
                <select className="sa-select" value={language} onChange={e => setLanguage(e.target.value)}>
                  {['English', 'French', 'Krio', 'Arabic'].map(l => <option key={l}>{l}</option>)}
                </select>
                <span className="sa-select-chevron"><ChevDown /></span>
              </div>
            </Field>
            <Field label="Timezone">
              <div className="sa-select-wrap">
                <select className="sa-select" value={timezone} onChange={e => setTimezone(e.target.value)}>
                  {[
                    'Africa/Freetown (GMT+0)',
                    'Africa/Lagos (GMT+1)',
                    'Africa/Nairobi (GMT+3)',
                    'Europe/London (GMT+0/+1)',
                    'America/New_York (GMT-5)',
                  ].map(tz => <option key={tz}>{tz}</option>)}
                </select>
                <span className="sa-select-chevron"><ChevDown /></span>
              </div>
            </Field>
          </div>
        </Section>

        {/* ===== Account Info ===== */}
        <Section title="Account Details" icon={<IcShield />}>
          <div className="sp-account-grid">
            {[
              { label: 'Username',     value: user?.username || 'ek_sms0000' },
              { label: 'Role',         value: 'Super Administrator' },
              { label: 'Account ID',   value: `UID-${String(user?.id || '0001').padStart(4,'0')}` },
              { label: 'Member Since', value: joinDate },
              { label: 'Last Login',   value: 'Today, 09:42 AM' },
              { label: 'Status',       value: 'Active', green: true },
            ].map(row => (
              <div key={row.label} className="sp-account-row">
                <span className="sp-account-label">{row.label}</span>
                <span className="sp-account-value" style={row.green ? { color: 'var(--sa-green)' } : {}}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ===== Change Password ===== */}
        <Section title="Change Password" icon={<IcKey />}>
          <div className="sp-pw-fields">
            <Field label="Current Password">
              <div className="sp-pw-input-wrap">
                <input
                  className="sa-text-input"
                  type={showCurr ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currPw}
                  onChange={e => setCurrPw(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button className="sp-eye-btn" type="button" onClick={() => setShowCurr(v => !v)} aria-label="Toggle visibility">
                  {showCurr ? <IcEyeOff /> : <IcEye />}
                </button>
              </div>
            </Field>

            <Field label="New Password">
              <div className="sp-pw-input-wrap">
                <input
                  className="sa-text-input"
                  type={showNew ? 'text' : 'password'}
                  placeholder="At least 12 characters"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button className="sp-eye-btn" type="button" onClick={() => setShowNew(v => !v)} aria-label="Toggle visibility">
                  {showNew ? <IcEyeOff /> : <IcEye />}
                </button>
              </div>
              {newPw.length > 0 && (
                <div className="sp-strength-wrap">
                  <div className="sp-strength-bar">
                    {[0,1,2,3].map(i => (
                      <div
                        key={i}
                        className="sp-strength-seg"
                        style={{ background: i < strengthLvl ? STRENGTH_COLORS[strengthLvl] : undefined }}
                      />
                    ))}
                  </div>
                  <span className="sp-strength-label" style={{ color: STRENGTH_COLORS[strengthLvl] }}>
                    {STRENGTH_LABELS[strengthLvl]}
                  </span>
                </div>
              )}
              {newPw.length > 0 && (
                <div className="sp-pw-hints">
                  {[
                    [strength[0], '12+ characters'],
                    [strength[1], 'Upper & lowercase'],
                    [strength[2], 'Number'],
                    [strength[3], 'Special character'],
                  ].map(([ok, text]) => (
                    <span key={text} className={`sp-pw-hint${ok ? ' sp-pw-hint--ok' : ''}`}>
                      {ok ? '✓' : '·'} {text}
                    </span>
                  ))}
                </div>
              )}
            </Field>

            <Field label="Confirm New Password">
              <div className="sp-pw-input-wrap">
                <input
                  className={`sa-text-input${mismatch ? ' sp-input-error' : ''}`}
                  type={showConf ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button className="sp-eye-btn" type="button" onClick={() => setShowConf(v => !v)} aria-label="Toggle visibility">
                  {showConf ? <IcEyeOff /> : <IcEye />}
                </button>
              </div>
              {mismatch && <p className="sp-error-msg">Passwords do not match</p>}
            </Field>
          </div>

          <button
            className={`sa-btn sa-btn--full${canSavePw ? ' sa-btn--primary' : ' sa-btn--ghost'}`}
            style={{ justifyContent: 'center', height: 44, marginTop: 4 }}
            disabled={!canSavePw}
            onClick={handleSavePassword}
          >
            {pwSaved ? <><IcCheck /> Password Updated</> : <><IcKey /> Update Password</>}
          </button>
        </Section>

        {/* ===== Recent Activity ===== */}
        <Section title="Recent Activity" icon={<IcActivity />}>
          <div className="sp-activity-list">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="sp-activity-row">
                <div className={`sp-activity-dot sp-activity-dot--${a.icon}`} />
                <div className="sp-activity-content">
                  <p className="sp-activity-action">{a.action}</p>
                  <p className="sp-activity-target">{a.target}</p>
                </div>
                <span className="sp-activity-time"><IcClock /> {a.time}</span>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  );
}
