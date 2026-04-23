import React, { useState, useEffect, useCallback, useRef } from 'react';
import ApiClient from '../../api/client';

const Ic = ({ name, size, className = '' }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''} ${className}`} aria-hidden="true">
    {name}
  </span>
);

function InitialsAvatar({ name, size = 36, style = {} }) {
  const colors = ['#4d8eff','#4cd7f6','#ffb786','#4ade80','#8b5cf6'];
  const color  = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.38, color: '#fff', flexShrink: 0, ...style,
    }}>
      {name?.trim().charAt(0).toUpperCase() || 'S'}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="ska-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ska-modal">
        <div className="ska-modal-head">
          <h2 className="ska-modal-title">{title}</h2>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>
        <div className="ska-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────
const PWD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
const generatePassword = () =>
  Array.from({ length: 10 }, () => PWD_CHARS[Math.floor(Math.random() * PWD_CHARS.length)]).join('');

const previewUsername = admNo =>
  admNo ? `stu_${admNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`.slice(0, 30) : '—';

const copyText = text => navigator.clipboard?.writeText(text).catch(() => {});

// ── Credential Success Overlay ─────────────────────────────────────
function CredentialCard({ info, onDone, onLinkParent }) {
  const [copied,  setCopied]  = useState(false);
  const [showPwd, setShowPwd] = useState(true);
  const firstName = info.full_name?.split(' ')[0] || 'the student';

  const handleCopy = () => {
    copyText(
      `Student Portal Credentials\n` +
      `Name: ${info.full_name}\n` +
      `Admission No.: ${info.admission_number}\n` +
      `Username: ${info.student_username}\n` +
      `Password: ${info.student_initial_password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.68)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      animation: 'ska-fade-in 0.18s ease',
    }}>
      <div style={{
        background: 'var(--ska-surface)', borderRadius: 20, maxWidth: 480, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)', overflow: 'hidden',
        animation: 'ska-slide-up 0.22s ease',
      }}>

        {/* ── Header ── */}
        <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', background: '#dcfce7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <Ic name="check_circle" style={{ color: '#16a34a', fontSize: 34 }} />
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--ska-text)' }}>
            Student Registered!
          </h2>
          <p style={{ margin: '0 0 20px', color: 'var(--ska-text-3)', fontSize: '0.875rem' }}>
            {info.full_name} has been added to {info.school_name || 'the school'}.
          </p>
        </div>

        {/* ── Credential block ── */}
        <div style={{ padding: '0 28px' }}>
          <div style={{
            background: 'var(--ska-surface-high)', borderRadius: 12, padding: '16px 20px',
            border: '1px solid var(--ska-border)',
          }}>
            <p style={{
              margin: '0 0 12px', fontWeight: 700, fontSize: '0.75rem',
              color: 'var(--ska-primary)', textTransform: 'uppercase', letterSpacing: '0.07em',
            }}>
              Portal Login Credentials
            </p>
            {[
              { label: 'Admission No.', value: info.admission_number,        icon: 'badge' },
              { label: 'Username',      value: info.student_username,         icon: 'account_circle' },
              { label: 'Password',      value: info.student_initial_password, icon: 'lock', secret: true },
            ].map((row, idx, arr) => (
              <div key={row.label} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
                borderBottom: idx < arr.length - 1 ? '1px solid var(--ska-border)' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: 'var(--ska-primary-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Ic name={row.icon} size="sm" style={{ color: 'var(--ska-primary)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.label}</p>
                  <p style={{
                    margin: 0, fontWeight: 700, color: 'var(--ska-text)', fontSize: '0.9rem',
                    fontFamily: row.secret ? 'monospace' : 'inherit',
                    filter: (row.secret && !showPwd) ? 'blur(5px)' : 'none',
                    userSelect: (row.secret && !showPwd) ? 'none' : 'text',
                    letterSpacing: row.secret ? '0.04em' : 'inherit',
                  }}>
                    {row.value}
                  </p>
                </div>
                {row.secret ? (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => setShowPwd(p => !p)} title={showPwd ? 'Hide' : 'Show'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4 }}>
                      <Ic name={showPwd ? 'visibility_off' : 'visibility'} size="sm" />
                    </button>
                    <button onClick={() => copyText(row.value)} title="Copy password"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4 }}>
                      <Ic name="content_copy" size="sm" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {info.email_sent && (
            <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--ska-green)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Ic name="mail" size="sm" /> Credentials emailed to {firstName}.
            </p>
          )}
        </div>

        {/* ── What's next ── */}
        <div style={{ padding: '20px 28px 0', borderTop: '1px solid var(--ska-border)', marginTop: 20 }}>
          <p style={{
            margin: '0 0 12px', fontSize: '0.75rem', fontWeight: 700,
            color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            What would you like to do next?
          </p>

          {/* Link parent CTA — primary action */}
          <button
            onClick={onLinkParent}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 12, marginBottom: 10, cursor: 'pointer',
              background: 'var(--ska-primary)', border: 'none', textAlign: 'left',
              transition: 'filter 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'none'}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Ic name="family_restroom" style={{ color: '#fff', fontSize: 22 }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                Link Parent / Guardian
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.72)' }}>
                Give a parent access to {firstName}'s grades, attendance &amp; reports
              </p>
            </div>
            <Ic name="chevron_right" style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
          </button>
        </div>

        {/* ── Bottom row ── */}
        <div style={{ padding: '10px 28px 24px', display: 'flex', gap: 8 }}>
          <button className="ska-btn ska-btn--ghost" onClick={handleCopy} style={{ flex: 1, gap: 6 }}>
            <Ic name={copied ? 'check' : 'content_copy'} size="sm" />
            {copied ? 'Copied!' : 'Copy Credentials'}
          </button>
          <button className="ska-btn ska-btn--ghost" onClick={onDone} style={{ padding: '0 22px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────────
const RELATIONSHIP_OPTIONS = [
  'Father', 'Mother', 'Guardian', 'Stepfather', 'Stepmother',
  'Grandfather', 'Grandmother', 'Uncle', 'Aunt', 'Sibling', 'Other',
];

// ── Link Parent Drawer ─────────────────────────────────────────────
function LinkParentDrawer({ student, onClose, onLinked }) {
  const [tab,         setTab]         = useState('existing');
  // Existing-parent tab
  const [searchQ,     setSearchQ]     = useState('');
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [linkRel,     setLinkRel]     = useState('');
  const [linkPrimary, setLinkPrimary] = useState(false);
  const [linking,     setLinking]     = useState(false);
  const [linkErr,     setLinkErr]     = useState('');
  // New parent tab
  const [newForm, setNewForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    relationship: '', password: generatePassword(), rel_type: '', is_primary: false,
  });
  const [creating,    setCreating]    = useState(false);
  const [createErr,   setCreateErr]   = useState('');
  const [showNewPwd,  setShowNewPwd]  = useState(false);

  // Debounced parent search
  useEffect(() => {
    if (!searchQ.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      ApiClient.get(`/api/school/parents/?q=${encodeURIComponent(searchQ)}`)
        .then(d => setResults(d.parents || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 320);
    return () => clearTimeout(t);
  }, [searchQ]);

  const handleLink = async () => {
    if (!selected || !linkRel) return;
    setLinking(true); setLinkErr('');
    try {
      await ApiClient.post(`/api/school/students/${student.id}/parents/`, {
        parent_id: selected.id,
        relationship_type: linkRel,
        is_primary_contact: linkPrimary,
      });
      onLinked();
      onClose();
    } catch (e) { setLinkErr(e.message || 'Failed to link parent.'); }
    setLinking(false);
  };

  const handleCreate = async () => {
    const { first_name, last_name, email, phone, relationship, password, rel_type, is_primary } = newForm;
    if (!first_name || !last_name || !email || !relationship || !password) {
      setCreateErr('First name, last name, email, relationship and password are required.'); return;
    }
    setCreating(true); setCreateErr('');
    try {
      const parentRes = await ApiClient.post('/api/school/parents/', {
        first_name, last_name, email, phone_number: phone, relationship, password,
      });
      await ApiClient.post(`/api/school/students/${student.id}/parents/`, {
        parent_id: parentRes.id,
        relationship_type: rel_type || relationship,
        is_primary_contact: is_primary,
      });
      onLinked();
      onClose();
    } catch (e) { setCreateErr(e.message || 'Failed to create and link parent.'); }
    setCreating(false);
  };

  return (
    <div className="ska-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ska-modal ska-modal--wide">
        {/* Header */}
        <div className="ska-modal-head">
          <div>
            <h2 className="ska-modal-title">Link Parent / Guardian</h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--ska-text-3)' }}>
              Linking to <strong style={{ color: 'var(--ska-text)' }}>{student.full_name}</strong>
            </p>
          </div>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--ska-border)', padding: '0 24px' }}>
          {[
            ['existing', 'person_search', 'Link Existing Parent'],
            ['new',      'person_add',    'Create & Link New'],
          ].map(([key, icon, label]) => (
            <button key={key} type="button"
              onClick={() => { setTab(key); setSelected(null); setLinkErr(''); setCreateErr(''); }}
              style={{
                padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === key ? '2.5px solid var(--ska-primary)' : '2.5px solid transparent',
                color: tab === key ? 'var(--ska-primary)' : 'var(--ska-text-3)',
                fontWeight: tab === key ? 700 : 500, fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s',
                marginBottom: -1,
              }}>
              <Ic name={icon} size="sm" />{label}
            </button>
          ))}
        </div>

        <div className="ska-modal-body">
          {/* ── TAB: Link Existing ── */}
          {tab === 'existing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="ska-search">
                <Ic name="search" />
                <input className="ska-search-input" autoFocus
                  placeholder="Search parents by name, phone or email…"
                  value={searchQ}
                  onChange={e => { setSearchQ(e.target.value); setSelected(null); }} />
                {searching && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', paddingRight: 10, flexShrink: 0 }}>Searching…</span>
                )}
              </div>

              {/* Results list */}
              {!selected && results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 220, overflowY: 'auto' }}>
                  {results.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => { setSelected(p); setLinkRel(p.relationship || ''); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                        borderRadius: 10, border: '1.5px solid var(--ska-border)',
                        background: 'var(--ska-surface-high)', cursor: 'pointer', textAlign: 'left',
                        width: '100%', transition: 'border-color 0.12s, background 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ska-primary)'; e.currentTarget.style.background = 'var(--ska-primary-dim)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ska-border)'; e.currentTarget.style.background = 'var(--ska-surface-high)'; }}>
                      <InitialsAvatar name={p.name} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--ska-text)' }}>{p.name}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>
                          {p.relationship}
                          {p.phone ? ` · ${p.phone}` : ''}
                          {p.children?.length > 0 ? ` · ${p.children.length} child${p.children.length !== 1 ? 'ren' : ''} linked` : ''}
                        </p>
                      </div>
                      <Ic name="chevron_right" size="sm" style={{ color: 'var(--ska-text-3)', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}

              {/* No results */}
              {searchQ && !searching && results.length === 0 && !selected && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--ska-text-3)', fontSize: '0.875rem' }}>
                  No parents found.{' '}
                  <button type="button" onClick={() => setTab('new')}
                    style={{ background: 'none', border: 'none', color: 'var(--ska-primary)', fontWeight: 700, cursor: 'pointer', fontSize: 'inherit' }}>
                    Create a new parent instead
                  </button>
                </div>
              )}

              {!searchQ && (
                <p style={{ textAlign: 'center', color: 'var(--ska-text-3)', fontSize: '0.8125rem', margin: 0 }}>
                  Type a name to search parents registered in this school.
                </p>
              )}

              {/* Selected parent — confirm step */}
              {selected && (
                <div style={{
                  padding: 16, borderRadius: 12, border: '1.5px solid var(--ska-primary)',
                  background: 'var(--ska-primary-dim)', display: 'flex', flexDirection: 'column', gap: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <InitialsAvatar name={selected.name} size={42} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9375rem', color: 'var(--ska-text)' }}>{selected.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{selected.email} · {selected.phone || '—'}</p>
                    </div>
                    <button type="button" onClick={() => { setSelected(null); setLinkRel(''); setLinkPrimary(false); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4 }}>
                      <Ic name="close" size="sm" />
                    </button>
                  </div>
                  <div className="ska-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 0 }}>
                    <label className="ska-form-group" style={{ margin: 0 }}>
                      <span>Relationship to {student.full_name?.split(' ')[0]} *</span>
                      <select className="ska-input" value={linkRel} onChange={e => setLinkRel(e.target.value)}>
                        <option value="">— Select —</option>
                        {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 1 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 0' }}>
                        <input type="checkbox" checked={linkPrimary} onChange={e => setLinkPrimary(e.target.checked)}
                          style={{ accentColor: 'var(--ska-primary)', width: 16, height: 16 }} />
                        <span style={{ fontSize: '0.875rem', color: 'var(--ska-text)', fontWeight: 500 }}>Set as primary contact</span>
                      </label>
                    </div>
                  </div>
                  {linkErr && <p style={{ color: 'var(--ska-error)', fontSize: '0.8rem', margin: 0 }}>{linkErr}</p>}
                  <button className="ska-btn ska-btn--primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleLink} disabled={linking || !linkRel}>
                    <Ic name="link" size="sm" />
                    {linking ? 'Linking…' : `Link ${selected.name.split(' ')[0]} to ${student.full_name.split(' ')[0]}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Create & Link New ── */}
          {tab === 'new' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px',
                borderRadius: 10, background: 'var(--ska-surface-high)',
                fontSize: '0.8125rem', color: 'var(--ska-text-3)',
              }}>
                <Ic name="info" size="sm" style={{ color: 'var(--ska-primary)', flexShrink: 0, marginTop: 1 }} />
                A new parent portal account will be created and instantly linked to {student.full_name?.split(' ')[0]}.
              </div>
              <div className="ska-form-grid">
                <label className="ska-form-group">
                  <span>First Name *</span>
                  <input className="ska-input" value={newForm.first_name}
                    onChange={e => setNewForm(f => ({ ...f, first_name: e.target.value }))} />
                </label>
                <label className="ska-form-group">
                  <span>Last Name *</span>
                  <input className="ska-input" value={newForm.last_name}
                    onChange={e => setNewForm(f => ({ ...f, last_name: e.target.value }))} />
                </label>
                <label className="ska-form-group">
                  <span>Email Address *</span>
                  <input className="ska-input" type="email" value={newForm.email}
                    onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} />
                </label>
                <label className="ska-form-group">
                  <span>Phone Number</span>
                  <input className="ska-input" value={newForm.phone}
                    onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} />
                </label>
                <label className="ska-form-group">
                  <span>Parent Type *</span>
                  <select className="ska-input" value={newForm.relationship}
                    onChange={e => setNewForm(f => ({ ...f, relationship: e.target.value }))}>
                    <option value="">— Select —</option>
                    {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="ska-form-group">
                  <span>Relationship to {student.full_name?.split(' ')[0]}</span>
                  <select className="ska-input" value={newForm.rel_type}
                    onChange={e => setNewForm(f => ({ ...f, rel_type: e.target.value }))}>
                    <option value="">— Same as parent type —</option>
                    {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
              </div>
              {/* Portal Password */}
              <label className="ska-form-group">
                <span>Portal Password *</span>
                <div style={{ position: 'relative' }}>
                  <input className="ska-input"
                    type={showNewPwd ? 'text' : 'password'}
                    value={newForm.password}
                    onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))}
                    style={{ paddingRight: 88, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                  />
                  <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2 }}>
                    <button type="button" onClick={() => setShowNewPwd(p => !p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4 }}>
                      <Ic name={showNewPwd ? 'visibility_off' : 'visibility'} size="sm" />
                    </button>
                    <button type="button" onClick={() => setNewForm(f => ({ ...f, password: generatePassword() }))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4 }}>
                      <Ic name="refresh" size="sm" />
                    </button>
                    <button type="button" onClick={() => copyText(newForm.password)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4 }}>
                      <Ic name="content_copy" size="sm" />
                    </button>
                  </div>
                </div>
                <span style={{ fontSize: '0.71875rem', color: 'var(--ska-text-3)', marginTop: 2 }}>
                  The parent will use this password to log in to the parent portal.
                </span>
              </label>
              {/* Primary contact toggle */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                padding: '12px 14px', borderRadius: 10, background: 'var(--ska-surface-high)',
                border: newForm.is_primary ? '1.5px solid var(--ska-green)' : '1.5px solid var(--ska-border)',
                transition: 'border-color 0.15s',
              }}>
                <input type="checkbox" checked={newForm.is_primary}
                  onChange={e => setNewForm(f => ({ ...f, is_primary: e.target.checked }))}
                  style={{ accentColor: 'var(--ska-green)', width: 17, height: 17, flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--ska-text)' }}>Set as primary contact</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>This parent will be the main point of contact for emergencies.</p>
                </div>
              </label>
              {createErr && <p style={{ color: 'var(--ska-error)', fontSize: '0.8rem', margin: 0 }}>{createErr}</p>}
              <button className="ska-btn ska-btn--primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleCreate}
                disabled={creating || !newForm.first_name || !newForm.last_name || !newForm.email || !newForm.relationship || !newForm.password}>
                <Ic name="person_add" size="sm" />
                {creating ? 'Creating & Linking…' : 'Create Account & Link Parent'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function StudentsPage({ school, openAddSignal }) {
  const [students,            setStudents]            = useState([]);
  const [loading,             setLoading]             = useState(true);
  const [search,              setSearch]              = useState('');
  const [modal,               setModal]               = useState(null);
  const [classes,             setClasses]             = useState([]);
  const [form,                setForm]                = useState({});
  const [saving,              setSaving]              = useState(false);
  const [error,               setError]               = useState('');
  const [viewStudent,         setViewStudent]         = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [generatingAdmNo,     setGeneratingAdmNo]     = useState(false);
  const [showFormPwd,         setShowFormPwd]         = useState(false);
  const [credSuccess,         setCredSuccess]         = useState(null);
  const [linkedParents,       setLinkedParents]       = useState([]);
  const [parentsLoading,      setParentsLoading]      = useState(false);
  const [showLinkDrawer,      setShowLinkDrawer]      = useState(false);
  const [pendingLinkStudent,  setPendingLinkStudent]  = useState(null);
  const prevSignal = useRef(openAddSignal);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const data   = await ApiClient.get(`/api/school/students/${params}`);
      setStudents(data.students || []);
    } catch {
      setStudents([]);
    }
    setLoading(false);
  }, []);

  const loadLinkedParents = useCallback(async (studentId) => {
    if (!studentId) return;
    setParentsLoading(true);
    try {
      const data = await ApiClient.get(`/api/school/students/${studentId}/parents/`);
      setLinkedParents(data.parents || []);
    } catch { setLinkedParents([]); }
    setParentsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (viewStudent) loadLinkedParents(viewStudent.id);
    else setLinkedParents([]);
  }, [viewStudent, loadLinkedParents]);

  const emptyForm = {
    first_name: '', last_name: '', gender: '', date_of_birth: '', age: '', place_of_birth: '',
    nationality: '', religion: '', home_address: '', city: '', phone_number: '', email: '',
    admission_number: '', classroom_id: '',
    previous_school: '', last_class_completed: '', leaving_reason: '',
    student_password: '',
    father_name: '', father_occupation: '', father_phone: '', father_email: '',
    father_address: '', father_username: '', father_password: '',
    mother_name: '', mother_occupation: '', mother_phone: '', mother_email: '',
    mother_address: '', mother_username: '', mother_password: '',
    emergency_name: '', emergency_relationship: '', emergency_phone: '', emergency_address: '',
    blood_group: '', allergies: '', medical_conditions: '', doctor_name: '', doctor_phone: '',
    disciplinary_history: false, disciplinary_notes: '',
    documents_birth_certificate: false, documents_passport_photo: false,
    documents_previous_school_report: false, documents_transfer_letter: false,
    documents_medical_report: false, documents_other: false,
    profile_photo: null,
  };

  const openAdd = useCallback(() => {
    const pwd = generatePassword();
    setForm({ ...emptyForm, student_password: pwd });
    setProfilePhotoPreview(null);
    setShowFormPwd(true);
    setError('');
    setModal('add');

    // Fetch next admission number async — pre-fills the field
    setGeneratingAdmNo(true);
    ApiClient.get('/api/school/students/next-admission-number/')
      .then(d => { if (d.admission_number) setForm(f => ({ ...f, admission_number: d.admission_number })); })
      .catch(() => {})
      .finally(() => setGeneratingAdmNo(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (openAddSignal !== prevSignal.current && prevSignal.current !== undefined) openAdd();
    prevSignal.current = openAddSignal;
  }, [openAddSignal, openAdd]);

  const openEdit = s => {
    setForm({
      first_name: s.first_name || '', last_name: s.last_name || '', gender: s.gender || '',
      date_of_birth: s.date_of_birth || '', age: s.age || '', place_of_birth: s.place_of_birth || '',
      nationality: s.nationality || '', religion: s.religion || '',
      home_address: s.home_address || '', city: s.city || '',
      phone_number: s.phone_number || '', email: s.email || '',
      admission_number: s.admission_number || '', classroom_id: s.classroom_id || '',
      previous_school: s.previous_school || '', last_class_completed: s.last_class_completed || '',
      leaving_reason: s.leaving_reason || '',
      student_password: '',
      father_name: s.father_name || '', father_occupation: s.father_occupation || '',
      father_phone: s.father_phone || '', father_email: s.father_email || '',
      father_address: s.father_address || '', father_username: s.father_username || '', father_password: '',
      mother_name: s.mother_name || '', mother_occupation: s.mother_occupation || '',
      mother_phone: s.mother_phone || '', mother_email: s.mother_email || '',
      mother_address: s.mother_address || '', mother_username: s.mother_username || '', mother_password: '',
      emergency_name: s.emergency_name || '', emergency_relationship: s.emergency_relationship || '',
      emergency_phone: s.emergency_phone || '', emergency_address: s.emergency_address || '',
      blood_group: s.blood_group || '', allergies: s.allergies || '',
      medical_conditions: s.medical_conditions || '',
      doctor_name: s.doctor_name || '', doctor_phone: s.doctor_phone || '',
      disciplinary_history: !!s.disciplinary_history, disciplinary_notes: s.disciplinary_notes || '',
      documents_birth_certificate: !!s.documents_birth_certificate,
      documents_passport_photo: !!s.documents_passport_photo,
      documents_previous_school_report: !!s.documents_previous_school_report,
      documents_transfer_letter: !!s.documents_transfer_letter,
      documents_medical_report: !!s.documents_medical_report,
      documents_other: !!s.documents_other,
      profile_photo: null,
    });
    setProfilePhotoPreview(s.profile_photo_url || s.profile_photo || null);
    setError(''); setModal(s);
  };

  const handlePhotoChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setForm(f => ({ ...f, profile_photo: file }));
    setProfilePhotoPreview(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return preview; });
  };

  const removePhoto = () => {
    setForm(f => ({ ...f, profile_photo: null }));
    setProfilePhotoPreview(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return null; });
  };

  const buildPayload = data => {
    if (data.profile_photo instanceof File || data.profile_photo instanceof Blob) {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (v instanceof File || v instanceof Blob) fd.append(k, v);
        else if (typeof v === 'boolean') fd.append(k, v ? 'true' : 'false');
        else fd.append(k, v);
      });
      return fd;
    }
    return data;
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload = buildPayload(form);
      if (modal === 'add') {
        const res = await ApiClient.post('/api/school/students/', payload);
        setModal(null);
        load(search);
        setCredSuccess({
          id:                      res.id,
          full_name:               res.full_name || `${form.first_name} ${form.last_name}`.trim(),
          admission_number:        res.admission_number || form.admission_number,
          student_username:        res.student_username || previewUsername(res.admission_number || form.admission_number),
          student_initial_password: res.student_initial_password || form.student_password,
          email_sent:              !!form.email,
          school_name:             school?.name,
        });
      } else {
        await ApiClient.put(`/api/school/students/${modal.id}/`, payload);
        setModal(null);
        load(search);
      }
    } catch (e) {
      setError(e.message || 'Failed to save.');
    }
    setSaving(false);
  };

  const handleDelete = async id => {
    if (!window.confirm('Remove this student?')) return;
    try { await ApiClient.delete(`/api/school/students/${id}/`); load(search); }
    catch (e) { alert(e.message || 'Failed to remove.'); }
  };

  const handleSearch = e => { const q = e.target.value; setSearch(q); load(q); };

  const handleUnlinkParent = async (parentId, parentName) => {
    if (!window.confirm(`Unlink ${parentName} from ${viewStudent.full_name}?`)) return;
    try {
      await ApiClient.delete(`/api/school/students/${viewStudent.id}/parents/${parentId}/`);
      loadLinkedParents(viewStudent.id);
    } catch (e) { alert(e.message || 'Failed to unlink.'); }
  };

  const handleSetPrimary = async (parentId) => {
    try {
      await ApiClient.patch(`/api/school/students/${viewStudent.id}/parents/${parentId}/`, { is_primary_contact: true });
      loadLinkedParents(viewStudent.id);
    } catch (e) { alert(e.message || 'Failed to update.'); }
  };

  // ── Profile view ───────────────────────────────────────────────
  if (viewStudent) {
    const s = viewStudent;
    const infoRows = [
      { icon: 'badge',          label: 'Admission No.',  value: s.admission_number || '—' },
      { icon: 'class',          label: 'Class',          value: s.classroom || 'Not assigned' },
      { icon: 'cake',           label: 'Date of Birth',  value: s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
      { icon: 'mail',           label: 'Email',          value: s.email || '—' },
      { icon: 'phone',          label: 'Phone',          value: s.phone_number || '—' },
      { icon: 'calendar_today', label: 'Admission Date', value: s.admission_date ? new Date(s.admission_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
    ];
    return (
      <div className="ska-content">
        <div className="ska-page-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="ska-btn ska-btn--ghost" onClick={() => setViewStudent(null)}>
              <Ic name="arrow_back" size="sm" /> Back
            </button>
            <div>
              <h1 className="ska-page-title">Student Profile</h1>
              <p className="ska-page-sub">{school?.name}</p>
            </div>
          </div>
          <button className="ska-btn ska-btn--ghost" onClick={() => { setViewStudent(null); openEdit(s); }}>
            <Ic name="edit" size="sm" /> Edit
          </button>
        </div>

        <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: 'var(--ska-primary-dim)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 900, fontSize: '1.75rem', color: 'var(--ska-primary)',
            }}>
              {s.first_name?.[0]?.toUpperCase() || '?'}{s.last_name?.[0]?.toUpperCase() || ''}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--ska-text)' }}>{s.full_name}</h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span className="ska-badge ska-badge--cyan">{s.admission_number}</span>
                <span className="ska-badge ska-badge--green">{s.classroom || 'No class'}</span>
                <span className="ska-badge ska-badge--primary">Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ska-profile-info-grid">
          <div className="ska-card ska-card-pad">
            <h2 className="ska-card-title" style={{ marginBottom: 16 }}>Personal Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {infoRows.map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, background: 'var(--ska-primary-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Ic name={row.icon} size="sm" style={{ color: 'var(--ska-primary)' }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.label}</p>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--ska-text)' }}>{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="ska-card ska-card-pad">
              <h2 className="ska-card-title" style={{ marginBottom: 16 }}>Academic Summary</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: 'grade',             label: 'GPA',             value: '—', color: 'var(--ska-primary)' },
                  { icon: 'event_available',   label: 'Attendance Rate', value: '—', color: 'var(--ska-green)' },
                  { icon: 'workspace_premium', label: 'Class Rank',      value: '—', color: 'var(--ska-tertiary)' },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 8, background: 'var(--ska-surface-high)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Ic name={row.icon} size="sm" style={{ color: row.color }} />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--ska-text)' }}>{row.label}</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--ska-text-3)', textAlign: 'center' }}>
                Grades will appear here once entered in Grade Management.
              </p>
            </div>
            <div className="ska-card ska-card-pad">
              <h2 className="ska-card-title" style={{ marginBottom: 12 }}>Quick Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="ska-btn ska-btn--ghost" style={{ justifyContent: 'flex-start', gap: 10 }}
                  onClick={() => { setViewStudent(null); openEdit(s); }}>
                  <Ic name="edit" size="sm" /> Edit Student Details
                </button>
                <button className="ska-btn ska-btn--ghost" style={{ justifyContent: 'flex-start', gap: 10 }}
                  onClick={() => setShowLinkDrawer(true)}>
                  <Ic name="family_restroom" size="sm" /> Link Parent / Guardian
                </button>
                <button className="ska-btn ska-btn--ghost" style={{ justifyContent: 'flex-start', gap: 10 }}
                  onClick={() => setViewStudent(null)}>
                  <Ic name="arrow_back" size="sm" /> Back to Students List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Linked Parents / Guardians ─────────────────────── */}
        <div className="ska-card" style={{ marginTop: 20, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--ska-border)', flexWrap: 'wrap', gap: 10,
          }}>
            <div>
              <h2 className="ska-card-title" style={{ margin: 0 }}>Parents &amp; Guardians</h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>
                {linkedParents.length === 0 ? 'No parents linked yet' : `${linkedParents.length} parent${linkedParents.length !== 1 ? 's' : ''} linked`}
              </p>
            </div>
            <button className="ska-btn ska-btn--primary ska-btn--sm"
              onClick={() => setShowLinkDrawer(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Ic name="add" size="sm" /> Link Parent
            </button>
          </div>

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {parentsLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} style={{
                  height: 72, borderRadius: 12, background: 'var(--ska-surface-high)',
                  animation: 'ska-pulse 1.4s ease-in-out infinite',
                }} />
              ))
            ) : linkedParents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <Ic name="family_restroom" style={{ fontSize: 40, color: 'var(--ska-text-3)', display: 'block', margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--ska-text-3)' }}>No parents linked</p>
                <p style={{ margin: '4px 0 12px', fontSize: '0.8rem', color: 'var(--ska-text-3)' }}>
                  Link a parent or guardian to give them access to {s.first_name}'s records.
                </p>
                <button className="ska-btn ska-btn--primary" onClick={() => setShowLinkDrawer(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Ic name="add" size="sm" /> Link First Parent
                </button>
              </div>
            ) : linkedParents.map(p => (
              <div key={p.parent_id}
                className={`ska-parent-card${p.is_primary ? ' ska-parent-card--primary' : ''}`}>
                <InitialsAvatar name={p.full_name} size={42} />
                <div className="ska-parent-card__info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <p className="ska-parent-card__name">{p.full_name}</p>
                    {p.is_primary && (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 20,
                        background: 'var(--ska-green)', color: '#fff', textTransform: 'uppercase',
                        letterSpacing: '0.05em', flexShrink: 0,
                      }}>Primary</span>
                    )}
                  </div>
                  <div className="ska-parent-card__meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Ic name="badge" style={{ fontSize: 13, color: 'var(--ska-text-3)' }} />
                      {p.relationship_type || p.relationship || '—'}
                    </span>
                    {p.phone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Ic name="phone" style={{ fontSize: 13, color: 'var(--ska-text-3)' }} />
                        {p.phone}
                      </span>
                    )}
                    {p.email && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Ic name="mail" style={{ fontSize: 13, color: 'var(--ska-text-3)' }} />
                        {p.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ska-parent-card__actions">
                  {!p.is_primary && (
                    <button className="ska-btn ska-btn--ghost ska-btn--sm"
                      title="Set as primary contact"
                      onClick={() => handleSetPrimary(p.parent_id)}
                      style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                      <Ic name="star" size="sm" />
                    </button>
                  )}
                  <button className="ska-btn ska-btn--ghost ska-btn--sm ska-btn--danger"
                    title="Unlink parent"
                    onClick={() => handleUnlinkParent(p.parent_id, p.full_name)}>
                    <Ic name="link_off" size="sm" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Link Parent Drawer */}
        {showLinkDrawer && (
          <LinkParentDrawer
            student={s}
            onClose={() => setShowLinkDrawer(false)}
            onLinked={() => loadLinkedParents(s.id)}
          />
        )}
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────
  return (
    <div className="ska-content">
      {credSuccess && (
        <CredentialCard
          info={credSuccess}
          onDone={() => setCredSuccess(null)}
          onLinkParent={() => {
            const s = { id: credSuccess.id, full_name: credSuccess.full_name, admission_number: credSuccess.admission_number };
            setCredSuccess(null);
            setPendingLinkStudent(s);
          }}
        />
      )}

      {pendingLinkStudent && (
        <LinkParentDrawer
          student={pendingLinkStudent}
          onClose={() => setPendingLinkStudent(null)}
          onLinked={() => setPendingLinkStudent(null)}
        />
      )}

      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Students</h1>
          <p className="ska-page-sub">{school?.name} — {students.length} enrolled</p>
        </div>
        <button className="ska-btn ska-btn--primary" onClick={openAdd}>
          <Ic name="person_add" size="sm" /> Add Student
        </button>
      </div>

      <div className="ska-search ska-toolbar-search" style={{ marginBottom: 16 }}>
        <Ic name="search" />
        <input className="ska-search-input" placeholder="Search by name or admission number…"
          value={search} onChange={handleSearch} />
      </div>

      <div className="ska-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
        ) : students.length === 0 ? (
          <div className="ska-empty">
            <Ic name="group" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
            <p className="ska-empty-title">No students yet</p>
            <p className="ska-empty-desc">Add your first student to get started.</p>
          </div>
        ) : (
          <table className="ska-table">
            <thead>
              <tr>
                <th>Name</th><th>Admission No.</th><th>Class</th><th>Email</th><th>Phone</th><th></th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <InitialsAvatar name={s.full_name} size={32} />
                      <span>{s.full_name}</span>
                    </div>
                  </td>
                  <td><span className="ska-badge ska-badge--cyan">{s.admission_number}</span></td>
                  <td>{s.classroom || <span style={{ color: 'var(--ska-text-3)' }}>—</span>}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{s.email || '—'}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{s.phone_number || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => setViewStudent(s)} title="View Profile">
                        <Ic name="person" size="sm" />
                      </button>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => openEdit(s)}>
                        <Ic name="edit" size="sm" />
                      </button>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm ska-btn--danger" onClick={() => handleDelete(s.id)}>
                        <Ic name="delete" size="sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────── */}
      {modal && (
        <Modal title={modal === 'add' ? 'Register New Student' : 'Edit Student'} onClose={() => setModal(null)}>
          {error && <p className="ska-form-error">{error}</p>}

          {/* Profile photo */}
          <div className="ska-card ska-card-pad" style={{ marginBottom: 16 }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Profile Photo</h3>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{
                width: 96, height: 96, borderRadius: 16, background: '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {profilePhotoPreview
                  ? <img src={profilePhotoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Ic name="person" size="xl" style={{ color: 'var(--ska-text-3)' }} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label className="ska-btn ska-btn--ghost" style={{ width: 'fit-content', cursor: 'pointer' }}>
                  Upload Photo
                  <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                </label>
                {profilePhotoPreview && (
                  <button type="button" className="ska-btn ska-btn--ghost" onClick={removePhoto} style={{ width: 'fit-content' }}>
                    Remove photo
                  </button>
                )}
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
                  Optional passport-size photo.
                </p>
              </div>
            </div>
          </div>

          {/* Personal information */}
          <div className="ska-form-grid">
            <label className="ska-form-group">
              <span>First Name *</span>
              <input className="ska-input" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Last Name *</span>
              <input className="ska-input" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Gender</span>
              <select className="ska-input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">— Select —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
            <label className="ska-form-group">
              <span>Date of Birth</span>
              <input className="ska-input" type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Age</span>
              <input className="ska-input" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Place of Birth</span>
              <input className="ska-input" value={form.place_of_birth} onChange={e => setForm(f => ({ ...f, place_of_birth: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Nationality</span>
              <input className="ska-input" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Religion</span>
              <input className="ska-input" value={form.religion} onChange={e => setForm(f => ({ ...f, religion: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Home Address</span>
              <input className="ska-input" value={form.home_address} onChange={e => setForm(f => ({ ...f, home_address: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>City / Town</span>
              <input className="ska-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Email Address</span>
              <input className="ska-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Phone Number</span>
              <input className="ska-input" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} />
            </label>

            {/* Admission number — auto-generated on add, locked on edit */}
            <label className="ska-form-group">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Admission Number
                {modal === 'add' && (
                  <span style={{
                    fontSize: '0.625rem', fontWeight: 700, padding: '2px 6px', borderRadius: 20,
                    background: 'var(--ska-primary-dim)', color: 'var(--ska-primary)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>Auto</span>
                )}
              </span>
              <div style={{ position: 'relative' }}>
                <input
                  className="ska-input"
                  value={generatingAdmNo ? 'Generating…' : form.admission_number}
                  disabled={modal !== 'add'}
                  onChange={e => setForm(f => ({ ...f, admission_number: e.target.value }))}
                  placeholder="Auto-generated"
                  style={{ paddingRight: modal === 'add' ? 40 : undefined }}
                />
                {modal === 'add' && !generatingAdmNo && (
                  <button
                    type="button"
                    title="Refresh — get a new admission number"
                    onClick={() => {
                      setGeneratingAdmNo(true);
                      ApiClient.get('/api/school/students/next-admission-number/')
                        .then(d => { if (d.admission_number) setForm(f => ({ ...f, admission_number: d.admission_number })); })
                        .catch(() => {})
                        .finally(() => setGeneratingAdmNo(false));
                    }}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--ska-text-3)', padding: 4,
                    }}
                  >
                    <Ic name="refresh" size="sm" />
                  </button>
                )}
              </div>
              {modal === 'add' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', marginTop: 2 }}>
                  Format: SCHOOLCODE/YEAR/SEQ — e.g. GBHS/2026/0001. You may override it.
                </span>
              )}
            </label>

            <label className="ska-form-group">
              <span>Class / Grade</span>
              <select className="ska-input" value={form.classroom_id} onChange={e => setForm(f => ({ ...f, classroom_id: e.target.value }))}>
                <option value="">— No class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="ska-form-group">
              <span>Previous School Attended</span>
              <input className="ska-input" value={form.previous_school} onChange={e => setForm(f => ({ ...f, previous_school: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Last Class Completed</span>
              <input className="ska-input" value={form.last_class_completed} onChange={e => setForm(f => ({ ...f, last_class_completed: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>Reason for Leaving Previous School</span>
              <input className="ska-input" value={form.leaving_reason} onChange={e => setForm(f => ({ ...f, leaving_reason: e.target.value }))} />
            </label>
          </div>

          {/* ── Student Portal Credentials ────────────────────── */}
          {modal === 'add' && (
            <div className="ska-card ska-card-pad" style={{
              marginTop: 16,
              border: '1.5px solid var(--ska-primary)',
              background: 'var(--ska-primary-dim)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: 'var(--ska-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Ic name="key" size="sm" style={{ color: '#fff' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ska-text)' }}>
                    Student Portal Access
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>
                    Credentials for the student to log in to their dashboard
                  </p>
                </div>
              </div>

              {/* Username preview */}
              <div style={{ marginBottom: 12 }}>
                <p style={{
                  margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 600,
                  color: 'var(--ska-text-2)', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  Portal Username (auto-generated)
                </p>
                <div style={{
                  background: 'var(--ska-surface)', border: '1px solid var(--ska-border)',
                  borderRadius: 8, padding: '9px 14px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 8,
                }}>
                  <span style={{
                    fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9375rem',
                    color: 'var(--ska-primary)', letterSpacing: '0.04em',
                  }}>
                    {form.admission_number
                      ? previewUsername(form.admission_number)
                      : <span style={{ color: 'var(--ska-text-3)', fontFamily: 'inherit', fontWeight: 400 }}>Assigned after admission number</span>
                    }
                  </span>
                  {form.admission_number && (
                    <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--ska-text-3)', padding: 2 }}
                      title="Copy username"
                      onClick={() => copyText(previewUsername(form.admission_number))}
                    >
                      <Ic name="content_copy" size="sm" />
                    </button>
                  )}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.71875rem', color: 'var(--ska-text-3)' }}>
                  Username is derived from the admission number and cannot be changed here.
                </p>
              </div>

              {/* Password field */}
              <div>
                <p style={{
                  margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 600,
                  color: 'var(--ska-text-2)', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  Initial Password
                </p>
                <div style={{ position: 'relative' }}>
                  <input
                    className="ska-input"
                    type={showFormPwd ? 'text' : 'password'}
                    value={form.student_password}
                    onChange={e => setForm(f => ({ ...f, student_password: e.target.value }))}
                    placeholder="Auto-generated password"
                    style={{ paddingRight: 88, fontFamily: 'monospace', letterSpacing: '0.06em' }}
                  />
                  <div style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    display: 'flex', gap: 2,
                  }}>
                    <button type="button"
                      title={showFormPwd ? 'Hide' : 'Show'}
                      onClick={() => setShowFormPwd(p => !p)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ska-text-3)', padding: 4 }}
                    >
                      <Ic name={showFormPwd ? 'visibility_off' : 'visibility'} size="sm" />
                    </button>
                    <button type="button"
                      title="Generate new password"
                      onClick={() => setForm(f => ({ ...f, student_password: generatePassword() }))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ska-text-3)', padding: 4 }}
                    >
                      <Ic name="refresh" size="sm" />
                    </button>
                    <button type="button"
                      title="Copy password"
                      onClick={() => copyText(form.student_password)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--ska-text-3)', padding: 4 }}
                    >
                      <Ic name="content_copy" size="sm" />
                    </button>
                  </div>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.71875rem', color: 'var(--ska-text-3)' }}>
                  Leave as-is to use the auto-generated password, or type a custom one.
                  {form.email && ' Credentials will be emailed to the student.'}
                </p>
              </div>
            </div>
          )}

          {/* Parent / Guardian */}
          <div className="ska-card ska-card-pad" style={{ marginTop: 16 }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Parent / Guardian Information</h3>
            <div className="ska-form-grid">
              <label className="ska-form-group"><span>Father / Guardian Name</span>
                <input className="ska-input" value={form.father_name} onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Occupation</span>
                <input className="ska-input" value={form.father_occupation} onChange={e => setForm(f => ({ ...f, father_occupation: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Phone Number</span>
                <input className="ska-input" value={form.father_phone} onChange={e => setForm(f => ({ ...f, father_phone: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Email Address</span>
                <input className="ska-input" type="email" value={form.father_email} onChange={e => setForm(f => ({ ...f, father_email: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Address (if different)</span>
                <input className="ska-input" value={form.father_address} onChange={e => setForm(f => ({ ...f, father_address: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Parent Login Username</span>
                <input className="ska-input" value={form.father_username} onChange={e => setForm(f => ({ ...f, father_username: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Parent Login Password</span>
                <input className="ska-input" type="password" value={form.father_password} onChange={e => setForm(f => ({ ...f, father_password: e.target.value }))} /></label>

              <label className="ska-form-group"><span>Mother / Guardian Name</span>
                <input className="ska-input" value={form.mother_name} onChange={e => setForm(f => ({ ...f, mother_name: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Occupation</span>
                <input className="ska-input" value={form.mother_occupation} onChange={e => setForm(f => ({ ...f, mother_occupation: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Phone Number</span>
                <input className="ska-input" value={form.mother_phone} onChange={e => setForm(f => ({ ...f, mother_phone: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Email Address</span>
                <input className="ska-input" type="email" value={form.mother_email} onChange={e => setForm(f => ({ ...f, mother_email: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Address (if different)</span>
                <input className="ska-input" value={form.mother_address} onChange={e => setForm(f => ({ ...f, mother_address: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Parent Login Username</span>
                <input className="ska-input" value={form.mother_username} onChange={e => setForm(f => ({ ...f, mother_username: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Parent Login Password</span>
                <input className="ska-input" type="password" value={form.mother_password} onChange={e => setForm(f => ({ ...f, mother_password: e.target.value }))} /></label>
            </div>
          </div>

          {/* Emergency contact */}
          <div className="ska-card ska-card-pad" style={{ marginTop: 16 }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Emergency Contact</h3>
            <div className="ska-form-grid">
              <label className="ska-form-group"><span>Name</span>
                <input className="ska-input" value={form.emergency_name} onChange={e => setForm(f => ({ ...f, emergency_name: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Relationship</span>
                <input className="ska-input" value={form.emergency_relationship} onChange={e => setForm(f => ({ ...f, emergency_relationship: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Phone Number</span>
                <input className="ska-input" value={form.emergency_phone} onChange={e => setForm(f => ({ ...f, emergency_phone: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Address</span>
                <input className="ska-input" value={form.emergency_address} onChange={e => setForm(f => ({ ...f, emergency_address: e.target.value }))} /></label>
            </div>
          </div>

          {/* Medical */}
          <div className="ska-card ska-card-pad" style={{ marginTop: 16 }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Medical Information</h3>
            <div className="ska-form-grid">
              <label className="ska-form-group"><span>Blood Group</span>
                <input className="ska-input" value={form.blood_group} onChange={e => setForm(f => ({ ...f, blood_group: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Known Allergies</span>
                <input className="ska-input" value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Medical Conditions</span>
                <input className="ska-input" value={form.medical_conditions} onChange={e => setForm(f => ({ ...f, medical_conditions: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Doctor's Name</span>
                <input className="ska-input" value={form.doctor_name} onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Doctor's Phone</span>
                <input className="ska-input" value={form.doctor_phone} onChange={e => setForm(f => ({ ...f, doctor_phone: e.target.value }))} /></label>
            </div>
          </div>

          {/* Conduct */}
          <div className="ska-card ska-card-pad" style={{ marginTop: 16 }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Student Conduct &amp; Discipline</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <label className="ska-form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={form.disciplinary_history} onChange={e => setForm(f => ({ ...f, disciplinary_history: e.target.checked }))} />
                <span>Has the student ever been suspended/expelled?</span>
              </label>
              <label className="ska-form-group"><span>If yes, explain</span>
                <input className="ska-input" value={form.disciplinary_notes} onChange={e => setForm(f => ({ ...f, disciplinary_notes: e.target.value }))} /></label>
            </div>
          </div>

          {/* Documents */}
          <div className="ska-card ska-card-pad" style={{ marginTop: 16 }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Documents Submitted</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                ['documents_birth_certificate',       'Birth Certificate'],
                ['documents_passport_photo',           'Passport Photograph'],
                ['documents_previous_school_report',   'Previous School Report'],
                ['documents_transfer_letter',          'Transfer Letter'],
                ['documents_medical_report',           'Medical Report'],
                ['documents_other',                    'Others'],
              ].map(([key, label]) => (
                <label key={key} className="ska-form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="ska-modal-actions">
            <button className="ska-btn ska-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="ska-btn ska-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : modal === 'add' ? 'Register Student' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
