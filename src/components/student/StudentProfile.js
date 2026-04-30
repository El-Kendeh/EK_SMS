import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import ChannelPreferences from './ChannelPreferences';
import WhoSawMyData from './WhoSawMyData';
import { studentApi } from '../../api/studentApi';
import { getAvatarColor, getInitials, maskPhone, maskEmail, formatRelativeTime } from '../../utils/studentUtils';
import './StudentProfile.css';

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.32, delay: i * 0.07 } }),
};

function PwField({ label, value, onChange, show, onToggle, error }) {
  return (
    <div className="sprof-pw-field">
      <label>{label}</label>
      <div className="sprof-pw-input-wrap">
        <input
          className="sprof-pw-input"
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
        />
        <button className="sprof-pw-toggle" type="button" onClick={onToggle} tabIndex={-1}>
          <span className="material-symbols-outlined">{show ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
      {error && <p className="sprof-pw-error">{error}</p>}
    </div>
  );
}

export default function StudentProfile() {
  const { profile, accountInfo, loading } = useStudentProfile();

  // Security health state
  const [secHealth, setSecHealth] = useState(null);
  const [secLoading, setSecLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);

  // Parental access log state
  const [parentalLog, setParentalLog] = useState(null);
  const [parentalLoading, setParentalLoading] = useState(true);

  useEffect(() => {
    studentApi.getSecurityHealth()
      .then(setSecHealth)
      .catch(() => {})
      .finally(() => setSecLoading(false));

    studentApi.getParentalAccessLog()
      .then(setParentalLog)
      .catch(() => {})
      .finally(() => setParentalLoading(false));
  }, []);

  const handleRevokeDevice = async (deviceId) => {
    setRevoking(deviceId);
    try {
      await studentApi.revokeDevice(deviceId);
      setSecHealth((prev) => ({
        ...prev,
        trustedDevices: prev.trustedDevices.filter((d) => d.id !== deviceId),
      }));
    } catch {
      // silent
    } finally {
      setRevoking(null);
    }
  };

  // 2FA modal state
  const [show2FA, setShow2FA] = useState(false);
  const [twoFAData, setTwoFAData] = useState(null);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAOtp, setTwoFAOtp] = useState('');
  const [twoFAMsg, setTwoFAMsg] = useState(null);

  const open2FA = async () => {
    setShow2FA(true);
    setTwoFAMsg(null);
    setTwoFAOtp('');
    setTwoFALoading(true);
    try {
      const data = await studentApi.get2FASetup();
      setTwoFAData(data);
    } catch { setTwoFAMsg({ type: 'err', text: 'Could not load 2FA settings.' }); }
    finally { setTwoFALoading(false); }
  };

  const handle2FAEnable = async () => {
    if (!twoFAOtp.trim()) return;
    setTwoFALoading(true); setTwoFAMsg(null);
    try {
      const res = await studentApi.enable2FA(twoFAOtp.trim());
      if (res.success) {
        setTwoFAMsg({ type: 'ok', text: '2FA enabled successfully.' });
        setSecHealth(prev => prev ? { ...prev, twoFactorEnabled: true } : prev);
        setTwoFAData(prev => prev ? { ...prev, enabled: true } : prev);
        setTimeout(() => setShow2FA(false), 1800);
      } else {
        setTwoFAMsg({ type: 'err', text: res.message || 'Invalid code.' });
      }
    } catch { setTwoFAMsg({ type: 'err', text: 'Failed to enable 2FA.' }); }
    finally { setTwoFALoading(false); }
  };

  const handle2FADisable = async () => {
    setTwoFALoading(true); setTwoFAMsg(null);
    try {
      const res = await studentApi.disable2FA();
      if (res.success) {
        setTwoFAMsg({ type: 'ok', text: '2FA has been disabled.' });
        setSecHealth(prev => prev ? { ...prev, twoFactorEnabled: false } : prev);
        setTwoFAData(prev => prev ? { ...prev, enabled: false } : prev);
        setTimeout(() => setShow2FA(false), 1800);
      }
    } catch { setTwoFAMsg({ type: 'err', text: 'Failed to disable 2FA.' }); }
    finally { setTwoFALoading(false); }
  };

  // Password change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (!currentPw || !newPw || !confirmPw) { setPwError('All fields are required.'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }

    setPwLoading(true);
    try {
      await studentApi.changePassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err) {
      setPwError(err?.message || 'Failed to change password. Check current password.');
    }
    setPwLoading(false);
  };

  const initials = getInitials(profile?.fullName || '');
  const avatarColor = getAvatarColor(profile?.fullName || '');

  const InfoRow = ({ label, value, stacked }) => (
    <div className={`sprof-info-row ${stacked ? 'sprof-info-row--stacked' : ''}`}>
      <span className="sprof-info-row__label">{label}</span>
      <span className="sprof-info-row__value">{value || '—'}</span>
    </div>
  );

  return (
    <>
    <div className="sprof">
      {/* Hero */}
      <motion.div
        className="sprof-hero"
        custom={0}
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="sprof-avatar-wrap">
          <div className="sprof-avatar" style={{ background: `linear-gradient(135deg, ${avatarColor}, var(--student-primary))` }}>
            {loading ? '…' : initials}
          </div>
          <div className="sprof-active-dot" />
        </div>
        <div className="sprof-name">{loading ? '—' : (profile?.fullName || 'Student')}</div>
        <div className="sprof-id">{loading ? '—' : `ID: ${profile?.studentId || accountInfo?.studentId || 'N/A'}`}</div>
        <div className="sprof-tags">
          {profile?.classroom && (
            <span className="sprof-tag sprof-tag--class">{profile.classroom}</span>
          )}
          <span className="sprof-tag sprof-tag--active">Active</span>
        </div>
      </motion.div>

      {/* Read-only warning */}
      <motion.div className="sprof-warn-banner" custom={1} variants={sectionVariants} initial="hidden" animate="visible">
        <span className="material-symbols-outlined">info</span>
        <p>Profile information is in read-only mode. Please contact the school administration office to update your records.</p>
      </motion.div>

      {/* SMS code (Liberia low-bandwidth fallback) */}
      <motion.section className="sprof-section" custom={1.3} variants={sectionVariants} initial="hidden" animate="visible">
        <h3 className="sprof-section__title">
          <span className="material-symbols-outlined">sms</span>
          SMS Quick-Access
        </h3>
        <div className="sprof-sms-card">
          <p>
            From any phone, text <code>GRADES {profile?.studentNumber || 'STU-XXX'}</code> to the school's number to receive your latest term average via SMS.
            Useful when data is unavailable or the app is offline.
          </p>
          <div className="sprof-sms-code">
            <span>Your SMS code</span>
            <strong>{profile?.smsCode || `EK${(profile?.studentNumber || '').slice(-4) || '0000'}`}</strong>
          </div>
        </div>
      </motion.section>

      {/* Notification preferences */}
      <motion.section className="sprof-section" custom={1.6} variants={sectionVariants} initial="hidden" animate="visible">
        <ChannelPreferences />
      </motion.section>

      {/* Who's seen my data */}
      <motion.section className="sprof-section" custom={1.8} variants={sectionVariants} initial="hidden" animate="visible">
        <WhoSawMyData />
      </motion.section>

      {/* Academic info */}
      <motion.section className="sprof-section" custom={2} variants={sectionVariants} initial="hidden" animate="visible">
        <h3 className="sprof-section__title">
          <span className="material-symbols-outlined">school</span>
          Academic Info
        </h3>
        <div className="sprof-info-grid">
          <div className="sprof-info-tile sprof-info-tile--full">
            <div className="sprof-info-tile__label">Enrolled Program</div>
            <div className="sprof-info-tile__value">{loading ? '—' : (profile?.program || 'General Science')}</div>
          </div>
          <div className="sprof-info-tile">
            <div className="sprof-info-tile__label">Current GPA</div>
            <div className="sprof-info-tile__value sprof-info-tile__value--large">
              {loading ? '—' : (profile?.gpa != null ? `${profile.gpa.toFixed(2)} / 4.0` : 'N/A')}
            </div>
          </div>
          <div className="sprof-info-tile">
            <div className="sprof-info-tile__label">Attendance</div>
            <div className="sprof-info-tile__value sprof-info-tile__value--large">
              {loading ? '—' : (profile?.attendance != null ? `${profile.attendance}%` : 'N/A')}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Personal info */}
      <motion.section className="sprof-section" custom={3} variants={sectionVariants} initial="hidden" animate="visible">
        <h3 className="sprof-section__title">
          <span className="material-symbols-outlined">person</span>
          Personal Info
        </h3>
        <div className="sprof-info-list">
          <InfoRow label="Date of Birth" value={profile?.dateOfBirth} />
          <InfoRow label="Gender" value={profile?.gender} />
          <InfoRow label="Residential Address" value={profile?.address} stacked />
          <InfoRow label="Blood Group" value={profile?.bloodGroup} />
        </div>
      </motion.section>

      {/* Guardian info */}
      {profile?.guardian && (
        <motion.section className="sprof-section" custom={4} variants={sectionVariants} initial="hidden" animate="visible">
          <h3 className="sprof-section__title">
            <span className="material-symbols-outlined">family_history</span>
            Guardian Info
          </h3>
          <div className="sprof-guardian-card">
            <div className="sprof-guardian-top">
              <div>
                <div className="sprof-guardian-name">{profile.guardian.name}</div>
                <div className="sprof-guardian-role">{profile.guardian.relationship || 'Parent/Guardian'}</div>
              </div>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            </div>
            <div className="sprof-masked-phone">
              <span className="material-symbols-outlined">call</span>
              <p>{maskPhone(profile.guardian.phone)}</p>
            </div>
          </div>
        </motion.section>
      )}

      {/* Account & security */}
      <motion.section className="sprof-section" custom={5} variants={sectionVariants} initial="hidden" animate="visible">
        <h3 className="sprof-section__title">
          <span className="material-symbols-outlined">security</span>
          Account &amp; Security
        </h3>

        <div className="sprof-acct-card">
          <div className="sprof-acct-card__top">
            <div className="sprof-acct-card__label">Institutional Email</div>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94A3B8' }}>lock</span>
          </div>
          <div className="sprof-acct-card__email">
            {loading ? '—' : maskEmail(accountInfo?.email || profile?.email || '')}
          </div>
        </div>

        <div className="sprof-2fa-card">
          <div className="sprof-2fa-card__head">
            <span className="material-symbols-outlined">warning</span>
            <span className="sprof-2fa-card__title">Two-Factor Authentication</span>
          </div>
          <p className="sprof-2fa-card__text">Your account security is partially managed by your guardian's device.</p>
          <div className="sprof-2fa-badge">Status: Enforced</div>
        </div>
      </motion.section>

      {/* Change password */}
      <motion.section className="sprof-section" custom={6} variants={sectionVariants} initial="hidden" animate="visible">
        <div className="sprof-change-pw">
          <div className="sprof-change-pw__title">
            <span className="material-symbols-outlined">key</span>
            Change Password
          </div>

          {pwSuccess && (
            <div className="sprof-pw-success">
              <span className="material-symbols-outlined">check_circle</span>
              Password changed successfully
            </div>
          )}

          <form onSubmit={handleChangePassword} noValidate>
            <PwField
              label="Current Password"
              value={currentPw}
              onChange={setCurrentPw}
              show={showCurrent}
              onToggle={() => setShowCurrent((s) => !s)}
            />
            <PwField
              label="New Password"
              value={newPw}
              onChange={setNewPw}
              show={showNew}
              onToggle={() => setShowNew((s) => !s)}
              error={pwError && newPw.length > 0 && newPw.length < 8 ? pwError : ''}
            />
            <PwField
              label="Confirm New Password"
              value={confirmPw}
              onChange={setConfirmPw}
              show={showConfirm}
              onToggle={() => setShowConfirm((s) => !s)}
              error={pwError && confirmPw.length > 0 && newPw !== confirmPw ? 'Passwords do not match.' : ''}
            />

            {pwError && !pwError.includes('match') && !pwError.includes('characters') && (
              <p className="sprof-pw-error" style={{ marginBottom: 12 }}>{pwError}</p>
            )}

            <button className="sprof-pw-submit" type="submit" disabled={pwLoading}>
              {pwLoading ? (
                <>
                  <span className="material-symbols-outlined" style={{ animation: 'srep-spin 1s linear infinite' }}>autorenew</span>
                  Saving…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">lock_reset</span>
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>
      </motion.section>

      {/* Security Health */}
      <motion.section className="sprof-section" custom={7} variants={sectionVariants} initial="hidden" animate="visible">
        <h3 className="sprof-section__title">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          Security Health
        </h3>

        {secLoading ? (
          <div className="skeleton" style={{ height: 120, borderRadius: 12, background: '#F2F4F6' }} />
        ) : secHealth ? (
          <>
            {/* Strength meter */}
            <div className="sprof-sec-strength">
              <div className="sprof-sec-strength__top">
                <div>
                  <h4 className="sprof-sec-strength__label">Security Strength</h4>
                  <p className="sprof-sec-strength__desc">Keep your recovery phone updated to maintain this status.</p>
                </div>
                <div className="sprof-sec-strength__score">
                  <span className="sprof-sec-strength__pct">{secHealth.score}%</span>
                  <span className="sprof-sec-strength__level">{secHealth.level}</span>
                </div>
              </div>
              <div className="sprof-sec-gauge">
                <div className="sprof-sec-gauge__fill" style={{ width: `${secHealth.score}%` }} />
              </div>
            </div>

            {/* 2FA card */}
            <div className="sprof-2fa-dark">
              <div className="sprof-2fa-dark__top">
                <div className="sprof-2fa-dark__icon">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                </div>
                <span className={`sprof-2fa-dark__badge ${secHealth.twoFactorEnabled ? 'sprof-2fa-dark__badge--on' : 'sprof-2fa-dark__badge--off'}`}>
                  {secHealth.twoFactorEnabled ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h4 className="sprof-2fa-dark__title">Two-Factor Authentication</h4>
              <p className="sprof-2fa-dark__sub">
                {secHealth.twoFactorEnabled
                  ? `Enabled since ${secHealth.twoFactorSince || 'recently'}`
                  : 'Strongly recommended — not yet enabled'}
              </p>
              <button className="sprof-2fa-dark__btn" onClick={open2FA}>Manage Settings</button>
            </div>

            {/* Trusted devices */}
            {secHealth.trustedDevices?.length > 0 && (
              <div className="sprof-devices">
                <div className="sprof-devices__header">
                  <h4 className="sprof-devices__title">Trusted Devices</h4>
                  <button className="sprof-devices__revoke-all">Revoke All</button>
                </div>
                <div className="sprof-devices__list">
                  {secHealth.trustedDevices.map((dev) => (
                    <div key={dev.id} className="sprof-device">
                      <div className={`sprof-device__icon ${dev.isCurrent ? 'sprof-device__icon--current' : ''}`}>
                        <span className="material-symbols-outlined">{dev.type === 'mobile' ? 'smartphone' : 'laptop_mac'}</span>
                      </div>
                      <div className="sprof-device__info">
                        <p className="sprof-device__name">{dev.name}</p>
                        {dev.isCurrent
                          ? <p className="sprof-device__sub sprof-device__sub--current">Current Device</p>
                          : <p className="sprof-device__sub">{dev.location}</p>
                        }
                        <p className="sprof-device__last">Last active: {dev.lastActive}</p>
                      </div>
                      {!dev.isCurrent && (
                        <button
                          className="sprof-device__revoke"
                          onClick={() => handleRevokeDevice(dev.id)}
                          disabled={revoking === dev.id}
                        >
                          {revoking === dev.id ? '…' : 'Revoke'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Login activity */}
            {secHealth.loginHistory?.length > 0 && (
              <div className="sprof-logins">
                <h4 className="sprof-logins__title">Recent Login Activity</h4>
                <p className="sprof-logins__sub">Review your recent access history for potential threats.</p>
                <div className="sprof-logins__list">
                  {secHealth.loginHistory.map((entry, i) => (
                    <div key={i} className="sprof-login">
                      <div className={`sprof-login__dot ${entry.success ? 'sprof-login__dot--ok' : 'sprof-login__dot--fail'}`} />
                      <div className="sprof-login__info">
                        <p className="sprof-login__location">{entry.location}</p>
                        <p className="sprof-login__ip">IP: {entry.ip} · {entry.device}</p>
                      </div>
                      <div className="sprof-login__right">
                        <p className="sprof-login__time">{entry.time}</p>
                        <p className={`sprof-login__status ${entry.success ? 'sprof-login__status--ok' : 'sprof-login__status--fail'}`}>
                          {entry.success ? 'Successful' : 'Failed'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </motion.section>

      {/* Parental Access Log */}
      <motion.section className="sprof-section" custom={8} variants={sectionVariants} initial="hidden" animate="visible">
        <h3 className="sprof-section__title">
          <span className="material-symbols-outlined">family_history</span>
          Parental Access Log
        </h3>

        {parentalLoading ? (
          <div className="skeleton" style={{ height: 80, borderRadius: 12, background: '#F2F4F6' }} />
        ) : parentalLog ? (
          <div className="sprof-parental">
            <div className="sprof-parental__header">
              <p className="sprof-parental__desc">{parentalLog.guardianName} last accessed your records on {parentalLog.lastAccess}.</p>
            </div>
            <div className="sprof-parental__list">
              {parentalLog.entries.map((entry, i) => (
                <div key={i} className="sprof-parental-row">
                  <div className="sprof-parental-row__icon">
                    <span className="material-symbols-outlined">{entry.action === 'view_grades' ? 'grade' : entry.action === 'view_report' ? 'description' : 'visibility'}</span>
                  </div>
                  <div className="sprof-parental-row__info">
                    <p className="sprof-parental-row__action">{entry.actionLabel}</p>
                    <p className="sprof-parental-row__device">{entry.device} · {entry.location}</p>
                  </div>
                  <div className="sprof-parental-row__time">{formatRelativeTime(entry.accessedAt)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="sprof-empty">No parental access activity recorded.</p>
        )}
      </motion.section>
    </div>

    {/* ── 2FA Setup Modal ── */}
    {show2FA && (
      <div style={{ position:'fixed', inset:0, zIndex:1300, background:'rgba(0,0,0,0.72)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
           onClick={e => e.target === e.currentTarget && setShow2FA(false)}>
        <div style={{ width:'100%', maxWidth:420, background:'var(--student-surface, #1a2340)', borderRadius:20, padding:'28px 24px', boxShadow:'0 24px 64px rgba(0,0,0,0.5)', display:'flex', flexDirection:'column', gap:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ margin:0, fontSize:'1.1rem', fontWeight:800, color:'#fff' }}>Two-Factor Authentication</h3>
            <button onClick={() => setShow2FA(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', padding:4 }}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {twoFALoading && <p style={{ color:'rgba(255,255,255,0.5)', textAlign:'center', margin:0 }}>Loading…</p>}

          {twoFAMsg && (
            <div style={{ padding:'10px 14px', borderRadius:10, background: twoFAMsg.type === 'ok' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', color: twoFAMsg.type === 'ok' ? '#34d399' : '#f87171', fontSize:'0.85rem' }}>
              {twoFAMsg.text}
            </div>
          )}

          {!twoFALoading && twoFAData && (
            twoFAData.enabled ? (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(52,211,153,0.1)', borderRadius:12, padding:'14px 16px' }}>
                  <span className="material-symbols-outlined" style={{ color:'#34d399', fontVariationSettings:"'FILL' 1" }}>verified_user</span>
                  <div>
                    <p style={{ margin:0, fontWeight:700, color:'#34d399', fontSize:'0.9rem' }}>2FA is Active</p>
                    <p style={{ margin:'2px 0 0', fontSize:'0.78rem', color:'rgba(255,255,255,0.5)' }}>Your account is protected with a TOTP authenticator app.</p>
                  </div>
                </div>
                <button onClick={handle2FADisable} disabled={twoFALoading}
                  style={{ background:'rgba(248,113,113,0.15)', color:'#f87171', border:'1px solid rgba(248,113,113,0.3)', borderRadius:10, padding:'10px 16px', cursor:'pointer', fontWeight:700, fontSize:'0.875rem' }}>
                  Disable 2FA
                </button>
              </>
            ) : (
              <>
                <p style={{ margin:0, fontSize:'0.85rem', color:'rgba(255,255,255,0.6)', lineHeight:1.5 }}>
                  Scan the QR code below with an authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to activate 2FA.
                </p>
                {twoFAData.qr_code && (
                  <div style={{ display:'flex', justifyContent:'center' }}>
                    <img src={twoFAData.qr_code} alt="2FA QR Code" style={{ width:160, height:160, borderRadius:12, background:'#fff', padding:8 }} />
                  </div>
                )}
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <label style={{ fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'rgba(255,255,255,0.5)' }}>Enter 6-digit code</label>
                  <input
                    type="text" inputMode="numeric" maxLength={6}
                    value={twoFAOtp}
                    onChange={e => setTwoFAOtp(e.target.value.replace(/\D/g, '').slice(0,6))}
                    placeholder="000000"
                    style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'10px 14px', color:'#fff', fontSize:'1.1rem', letterSpacing:'0.3em', textAlign:'center', outline:'none', fontFamily:'monospace' }}
                  />
                </div>
                <button onClick={handle2FAEnable} disabled={twoFALoading || twoFAOtp.length !== 6}
                  style={{ background:'var(--student-primary, #4f8ef7)', color:'#fff', border:'none', borderRadius:10, padding:'12px 16px', cursor:'pointer', fontWeight:700, fontSize:'0.9rem', opacity: twoFAOtp.length !== 6 ? 0.5 : 1 }}>
                  {twoFALoading ? 'Verifying…' : 'Activate 2FA'}
                </button>
              </>
            )
          )}
        </div>
      </div>
    )}
    </>
  );
}
