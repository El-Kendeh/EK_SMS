import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTeacherProfile } from '../../hooks/useTeacherProfile';
import { teacherApi } from '../../api/teacherApi';
import { formatRelativeTime } from '../../utils/teacherUtils';
import './TeacherProfile.css';

export default function TeacherProfile({ navigateTo }) {
  const { profile, loading } = useTeacherProfile();
  const [creds, setCreds] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  useEffect(() => {
    teacherApi.getCredentials().then((d) => {
      if (d && d.success !== false) setCreds(d);
    }).catch(() => {});
  }, []);

  const updateField = (key, value) =>
    setCreds((c) => ({ ...(c || {}), [key]: value }));
  const addRow = (key, blank) =>
    setCreds((c) => ({ ...(c || {}), [key]: [...((c || {})[key] || []), blank] }));
  const updateRow = (key, idx, patch) =>
    setCreds((c) => ({
      ...(c || {}),
      [key]: ((c || {})[key] || []).map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));
  const removeRow = (key, idx) =>
    setCreds((c) => ({
      ...(c || {}),
      [key]: ((c || {})[key] || []).filter((_, i) => i !== idx),
    }));

  const handleSave = async () => {
    if (!creds) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await teacherApi.updateCredentials({
        qualification:    creds.qualification || '',
        degrees:          creds.degrees || [],
        certifications:   creds.certifications || [],
        years_experience: creds.years_experience || 0,
        bio:              creds.bio || '',
        linkedin_url:     creds.linkedin_url || '',
      });
      if (res.success) {
        setSaveMsg({ type: 'ok', text: 'Profile updated.' });
        setEditing(false);
      } else {
        setSaveMsg({ type: 'err', text: res.message || 'Save failed.' });
      }
    } catch (err) {
      setSaveMsg({ type: 'err', text: err.message || 'Network error.' });
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 4000);
  };

  if (loading) {
    return (
      <div>
        <h1 className="tch-page-title">My Profile</h1>
        <div className="tch-skeleton" style={{ height: 120, marginTop: 20 }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <h1 className="tch-page-title">My Profile</h1>
        <div className="tch-empty">
          <span className="material-symbols-outlined">person</span>
          <p>Profile not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tp-root">
      <h1 className="tch-page-title">My Profile</h1>
      <p className="tch-page-sub">Account information and security settings</p>

      {/* Hero card */}
      <motion.div
        className="tp-hero-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="tp-avatar">{profile.initials}</div>
        <div className="tp-hero-info">
          <h2 className="tp-name">{profile.fullName}</h2>
          <p className="tp-role">{profile.qualification || (profile.subjects?.length ? profile.subjects.slice(0,2).join(', ') + ' Teacher' : 'Teacher')}</p>
          <div className="tp-hero-chips">
            {profile.specializations.map(s => (
              <span key={s} className="tch-badge tch-badge--primary">{s}</span>
            ))}
          </div>
        </div>
        <span className={`tch-badge ${profile.status === 'active' ? 'tch-badge--green' : 'tch-badge--grey'} tp-status-badge`}>
          {profile.status}
        </span>
      </motion.div>

      {/* Details */}
      <div className="tp-sections">
        <div className="tp-section">
          <p className="tp-section-title">
            <span className="material-symbols-outlined">badge</span>
            Employee Information
          </p>
          <div className="tch-card">
            {[
              ['Employee Number', profile.employeeNumber],
              ['Email', profile.email],
              ['Phone', profile.phone],
              ['School', profile.school],
              ['Joined', new Date(profile.joinedDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })],
            ].map(([label, value]) => (
              <div key={label} className="tp-info-row">
                <span className="tp-info-label">{label}</span>
                <span className="tp-info-value">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tp-section">
          <p className="tp-section-title">
            <span className="material-symbols-outlined">security</span>
            Security &amp; Sessions
          </p>
          <div className="tch-card">
            <div className="tp-info-row">
              <span className="tp-info-label">Last Login</span>
              <span className="tp-info-value">{formatRelativeTime(profile.lastLogin)}</span>
            </div>
            <div className="tp-info-row">
              <span className="tp-info-label">Active Sessions</span>
              <span className="tp-info-value">
                <span className="tch-badge tch-badge--primary">{profile.activeSessions} session{profile.activeSessions !== 1 ? 's' : ''}</span>
              </span>
            </div>
            <div className="tp-info-row">
              <span className="tp-info-label">Two-Factor Auth</span>
              <span className="tp-info-value">
                <span className={`tch-badge ${profile.twoFactorEnabled ? 'tch-badge--green' : 'tch-badge--amber'}`}>
                  {profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </span>
            </div>
          </div>

          {!profile.twoFactorEnabled && (
            <div className="tp-2fa-prompt">
              <span className="material-symbols-outlined">shield</span>
              <div>
                <p className="tp-2fa-prompt__title">Enable Two-Factor Authentication</p>
                <p className="tp-2fa-prompt__text">
                  Add an extra layer of security to protect your grades and account.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Academic credentials (degrees, certifications, experience) ── */}
        <div className="tp-section">
          <p className="tp-section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span><span className="material-symbols-outlined">school</span> Academic Credentials</span>
            {!editing ? (
              <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => setEditing(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                Edit
              </button>
            ) : (
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="tch-btn tch-btn--ghost tch-btn--sm"
                        onClick={() => { setEditing(false); setSaveMsg(null); }}>
                  Cancel
                </button>
                <button className="tch-btn tch-btn--primary tch-btn--sm"
                        disabled={saving} onClick={handleSave}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </span>
            )}
          </p>

          {saveMsg && (
            <p style={{
              padding: '8px 12px', borderRadius: 8, fontSize: '0.825rem', marginBottom: 12,
              background: saveMsg.type === 'ok' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
              color: saveMsg.type === 'ok' ? '#059669' : '#dc2626',
            }}>{saveMsg.text}</p>
          )}

          <div className="tch-card">
            {/* Years of experience */}
            <div className="tp-info-row">
              <span className="tp-info-label">Years of experience</span>
              <span className="tp-info-value">
                {editing ? (
                  <input type="number" min="0" max="60" className="tch-input"
                         style={{ width: 100 }}
                         value={creds?.years_experience ?? 0}
                         onChange={(e) => updateField('years_experience', e.target.value)} />
                ) : (
                  <span className="tch-badge tch-badge--primary">
                    {creds?.years_experience ?? 0} year{(creds?.years_experience ?? 0) === 1 ? '' : 's'}
                  </span>
                )}
              </span>
            </div>

            {/* Qualification (single string) */}
            <div className="tp-info-row">
              <span className="tp-info-label">Primary qualification</span>
              <span className="tp-info-value">
                {editing ? (
                  <input className="tch-input" style={{ minWidth: 200 }}
                         placeholder="e.g. M.Sc. Mathematics"
                         value={creds?.qualification || ''}
                         onChange={(e) => updateField('qualification', e.target.value)} />
                ) : (creds?.qualification || profile.qualification || '—')}
              </span>
            </div>

            {/* Bio */}
            <div className="tp-info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <span className="tp-info-label">Professional bio</span>
              {editing ? (
                <textarea className="tch-input" rows={3} style={{ width: '100%' }}
                          placeholder="A short bio shown to school admin and parents."
                          value={creds?.bio || ''}
                          onChange={(e) => updateField('bio', e.target.value)} />
              ) : (
                <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
                  {creds?.bio || <em style={{ color: 'var(--tch-text-secondary)' }}>No bio yet.</em>}
                </p>
              )}
            </div>

            {/* LinkedIn */}
            <div className="tp-info-row">
              <span className="tp-info-label">LinkedIn</span>
              <span className="tp-info-value">
                {editing ? (
                  <input className="tch-input" style={{ minWidth: 240 }}
                         placeholder="https://linkedin.com/in/..."
                         value={creds?.linkedin_url || ''}
                         onChange={(e) => updateField('linkedin_url', e.target.value)} />
                ) : (creds?.linkedin_url
                      ? <a href={creds.linkedin_url} target="_blank" rel="noreferrer">{creds.linkedin_url}</a>
                      : '—')}
              </span>
            </div>
          </div>

          {/* Degrees list */}
          <p className="tp-section-title" style={{ marginTop: 16 }}>
            <span className="material-symbols-outlined">workspace_premium</span> Degrees
          </p>
          <div className="tch-card">
            {(creds?.degrees || []).length === 0 && !editing && (
              <p style={{ margin: 0, color: 'var(--tch-text-secondary)', fontSize: '0.875rem' }}>
                No degrees recorded.
              </p>
            )}
            {(creds?.degrees || []).map((d, i) => (
              <div key={i} className="tp-info-row" style={{ alignItems: 'flex-start' }}>
                {editing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <input className="tch-input" placeholder="Degree (e.g. B.Ed.)"
                           value={d.degree || ''}
                           onChange={(e) => updateRow('degrees', i, { degree: e.target.value })} />
                    <input className="tch-input" placeholder="Field (e.g. Mathematics)"
                           value={d.field || ''}
                           onChange={(e) => updateRow('degrees', i, { field: e.target.value })} />
                    <input className="tch-input" placeholder="Institution"
                           value={d.institution || ''}
                           onChange={(e) => updateRow('degrees', i, { institution: e.target.value })} />
                    <input className="tch-input" placeholder="Year (e.g. 2018)" type="number"
                           value={d.year || ''}
                           onChange={(e) => updateRow('degrees', i, { year: e.target.value })} />
                    <button className="tch-btn tch-btn--ghost tch-btn--sm"
                            onClick={() => removeRow('degrees', i)}>Remove</button>
                  </div>
                ) : (
                  <span className="tp-info-value" style={{ flex: 1 }}>
                    <strong>{d.degree || '—'}</strong>
                    {d.field ? `, ${d.field}` : ''}
                    {d.institution ? <><br /><span style={{ color: 'var(--tch-text-secondary)' }}>{d.institution}</span></> : null}
                    {d.year ? <span style={{ marginLeft: 8 }} className="tch-badge tch-badge--grey">{d.year}</span> : null}
                  </span>
                )}
              </div>
            ))}
            {editing && (
              <button className="tch-btn tch-btn--ghost tch-btn--sm" style={{ marginTop: 8 }}
                      onClick={() => addRow('degrees', { degree: '', field: '', institution: '', year: '' })}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span> Add degree
              </button>
            )}
          </div>

          {/* Certifications list */}
          <p className="tp-section-title" style={{ marginTop: 16 }}>
            <span className="material-symbols-outlined">verified</span> Certifications
          </p>
          <div className="tch-card">
            {(creds?.certifications || []).length === 0 && !editing && (
              <p style={{ margin: 0, color: 'var(--tch-text-secondary)', fontSize: '0.875rem' }}>
                No certifications recorded.
              </p>
            )}
            {(creds?.certifications || []).map((c, i) => (
              <div key={i} className="tp-info-row" style={{ alignItems: 'flex-start' }}>
                {editing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <input className="tch-input" placeholder="Certification name"
                           value={c.name || ''}
                           onChange={(e) => updateRow('certifications', i, { name: e.target.value })} />
                    <input className="tch-input" placeholder="Issuer"
                           value={c.issuer || ''}
                           onChange={(e) => updateRow('certifications', i, { issuer: e.target.value })} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="tch-input" placeholder="Year" type="number"
                             value={c.year || ''}
                             onChange={(e) => updateRow('certifications', i, { year: e.target.value })} />
                      <input className="tch-input" placeholder="Expires (year, optional)" type="number"
                             value={c.expires || ''}
                             onChange={(e) => updateRow('certifications', i, { expires: e.target.value })} />
                    </div>
                    <button className="tch-btn tch-btn--ghost tch-btn--sm"
                            onClick={() => removeRow('certifications', i)}>Remove</button>
                  </div>
                ) : (
                  <span className="tp-info-value" style={{ flex: 1 }}>
                    <strong>{c.name || '—'}</strong>
                    {c.issuer ? <><br /><span style={{ color: 'var(--tch-text-secondary)' }}>{c.issuer}</span></> : null}
                    {c.year ? <span style={{ marginLeft: 8 }} className="tch-badge tch-badge--grey">{c.year}</span> : null}
                    {c.expires ? <span style={{ marginLeft: 4 }} className="tch-badge tch-badge--amber">expires {c.expires}</span> : null}
                  </span>
                )}
              </div>
            ))}
            {editing && (
              <button className="tch-btn tch-btn--ghost tch-btn--sm" style={{ marginTop: 8 }}
                      onClick={() => addRow('certifications', { name: '', issuer: '', year: '', expires: '' })}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span> Add certification
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
