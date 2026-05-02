import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ApiClient from '../../api/client';
import PhoneInput from '../shared/PhoneInput';
import { PHONE_COUNTRIES } from '../shared/phone-countries';
import AddStudentWizard from './Students/AddStudentWizard';
import BulkImportModal from './Students/BulkImportModal';
import DraftManager from './Students/DraftManager';
import { listDrafts } from './Students/students.utils';
import ResendCredentialsButton from './ResendCredentialsButton';
import './Students/Students.css';

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

function calculateAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}


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

  const handlePrintSlip = () => {
    const win = window.open('', '_blank', 'width=794,height=1123');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Admission Slip — ${info.full_name}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Georgia,serif;padding:60px 70px;color:#1a1a1a;font-size:14px}
  .header{text-align:center;border-bottom:3px double #1B3FAF;padding-bottom:24px;margin-bottom:32px}
  .school{font-size:26px;font-weight:800;color:#1B3FAF;letter-spacing:.02em}
  .slip-title{margin-top:14px;font-size:16px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#333}
  .slip-sub{font-size:12px;color:#777;margin-top:4px}
  .section{margin-bottom:28px}
  .section-label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#1B3FAF;margin-bottom:8px}
  table{width:100%;border-collapse:collapse}
  td{padding:13px 8px;border-bottom:1px solid #e5e7eb;font-size:14px}
  td:first-child{font-weight:600;color:#555;width:210px}
  td:last-child{color:#111;font-weight:500}
  .footer{margin-top:60px;display:flex;justify-content:space-between}
  .sig{border-top:1px solid #333;width:190px;text-align:center;padding-top:8px;font-size:12px;color:#555}
  .notice{margin-top:36px;font-size:11px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:14px}
  @media print{body{padding:40px 50px}}
</style>
</head>
<body>
  <div class="header">
    <div class="school">${info.school_name || 'School Name'}</div>
    <div class="slip-title">Admission Slip</div>
    <div class="slip-sub">Official Admission Record</div>
  </div>
  <div class="section">
    <div class="section-label">Student Information</div>
    <table>
      <tr><td>Full Name</td><td>${info.full_name || '—'}</td></tr>
      <tr><td>Admission Number</td><td>${info.admission_number || '—'}</td></tr>
      <tr><td>Class / Grade</td><td>${info.classroom || '—'}</td></tr>
      <tr><td>Date of Enrollment</td><td>${info.enrollment_date || '—'}</td></tr>
    </table>
  </div>
  <div class="footer">
    <div class="sig">Date</div>
    <div class="sig">Authorized Signature</div>
  </div>
  <div class="notice">This slip serves as official confirmation of admission. Please retain for your records.</div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
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
          {info.parent_warnings?.length > 0 && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--ska-tertiary-dim)', borderRadius: 8, border: '1px solid rgba(255,183,134,0.3)' }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--ska-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Guardian note</p>
              {info.parent_warnings.map((w, i) => (
                <p key={i} style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-tertiary)' }}>{w}</p>
              ))}
            </div>
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
        <div style={{ padding: '10px 28px 24px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="ska-btn ska-btn--ghost" onClick={handleCopy} style={{ flex: 1, gap: 6, minWidth: 140 }}>
            <Ic name={copied ? 'check' : 'content_copy'} size="sm" />
            {copied ? 'Copied!' : 'Copy Credentials'}
          </button>
          <button className="ska-btn ska-btn--ghost" onClick={handlePrintSlip} style={{ flex: 1, gap: 6, minWidth: 140 }}>
            <Ic name="print" size="sm" />
            Print Admission Slip
          </button>
          <button className="ska-btn ska-btn--ghost" onClick={onDone} style={{ padding: '0 22px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ParentSearchInline ─────────────────────────────────────────────
function ParentSearchInline({ value, onChange }) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [searching,setSearching]= useState(false);
  const [selected, setSelected] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      ApiClient.get(`/api/school/parents/?q=${encodeURIComponent(query)}`)
        .then(d => setResults(d.parents || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 320);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (results.length === 0) return;
    const close = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setResults([]); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [results]);

  const select = p => {
    setSelected(p); setResults([]); setQuery('');
    onChange(String(p.id));
  };

  const clear = () => {
    setSelected(null); setQuery(''); setResults([]);
    onChange('');
  };

  if (selected || (value && !selected)) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        borderRadius: 8, border: '1.5px solid var(--ska-primary)',
        background: 'var(--ska-primary-dim)',
      }}>
        <InitialsAvatar name={selected?.name || `#${value}`} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--ska-text)' }}>
            {selected?.name || `Parent ID ${value}`}
          </p>
          {selected && (
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>
              {selected.relationship}{selected.phone ? ` · ${selected.phone}` : ''}
              {selected.children?.length > 0 ? ` · ${selected.children.length} child${selected.children.length !== 1 ? 'ren' : ''} linked` : ''}
            </p>
          )}
        </div>
        <button type="button" onClick={clear} title="Remove"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4, flexShrink: 0 }}>
          <Ic name="close" size="sm" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div className="ska-search" style={{ margin: 0 }}>
        <Ic name="search" />
        <input className="ska-search-input" value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search parents by name, phone or email…" />
        {searching && (
          <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', paddingRight: 10, flexShrink: 0 }}>
            Searching…
          </span>
        )}
      </div>
      {results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--ska-surface)', border: '1px solid var(--ska-border)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
          maxHeight: 220, overflowY: 'auto', marginTop: 4,
        }}>
          {results.map(p => (
            <button key={p.id} type="button" onClick={() => select(p)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 14px', border: 'none', background: 'transparent',
              cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--ska-surface-high)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <InitialsAvatar name={p.name} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--ska-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>
                  {p.relationship}{p.phone ? ` · ${p.phone}` : ''}
                  {p.children?.length > 0 ? ` · ${p.children.length} child${p.children.length !== 1 ? 'ren' : ''} linked` : ''}
                </p>
              </div>
              <Ic name="chevron_right" size="sm" style={{ color: 'var(--ska-text-3)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}
      {query.trim() && !searching && results.length === 0 && (
        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>
          No parents found — leave empty to create a new account below.
        </p>
      )}
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
                  <PhoneInput value={newForm.phone} onChange={v => setNewForm(f => ({ ...f, phone: v }))} />
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

const FORM_STEPS = [
  { label: 'Personal',   icon: 'person'           },
  { label: 'Enrollment', icon: 'school'            },
  { label: 'Guardian',   icon: 'family_restroom'   },
  { label: 'Health',     icon: 'medical_services'  },
  { label: 'Documents',  icon: 'folder_open'       },
  { label: 'Review',     icon: 'task_alt'          },
];

function StepBar({ steps, current }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      paddingBottom: 20, marginBottom: 4,
      overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none',
    }}>
      {steps.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 52 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'var(--ska-green)' : active ? 'var(--ska-primary)' : 'var(--ska-surface-high)',
                border: `2px solid ${done ? 'var(--ska-green)' : active ? 'var(--ska-primary)' : 'var(--ska-border)'}`,
                transition: 'background 0.2s, border-color 0.2s',
              }}>
                {done
                  ? <Ic name="check" style={{ color: '#fff', fontSize: 16 }} />
                  : <Ic name={step.icon} style={{ color: active ? '#fff' : 'var(--ska-text-3)', fontSize: 16 }} />
                }
              </div>
              <span style={{
                fontSize: '0.625rem', fontWeight: active ? 700 : 500, textAlign: 'center',
                color: active ? 'var(--ska-primary)' : done ? 'var(--ska-green)' : 'var(--ska-text-3)',
                whiteSpace: 'nowrap',
              }}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '16px 4px 0', minWidth: 8,
                background: done ? 'var(--ska-green)' : 'var(--ska-border)',
                transition: 'background 0.2s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const DRAFT_KEY = 'ek_sms_student_form_draft';


// ── Main Component ─────────────────────────────────────────────────
export function StudentsPage({ school, openAddSignal }) {
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
  const [showFatherPwd,       setShowFatherPwd]       = useState(false);
  const [showGuardian2Pwd,    setShowGuardian2Pwd]    = useState(false);
  const [showGuardian2,       setShowGuardian2]       = useState(false);
  const [credSuccess,         setCredSuccess]         = useState(null);
  const [linkedParents,       setLinkedParents]       = useState([]);
  const [parentsLoading,      setParentsLoading]      = useState(false);
  const [showLinkDrawer,      setShowLinkDrawer]      = useState(false);
  const [pendingLinkStudent,  setPendingLinkStudent]  = useState(null);
  const [loadFailed,          setLoadFailed]          = useState(false);
  const [fieldErrors,         setFieldErrors]         = useState({});
  const [draftRestored,       setDraftRestored]       = useState(false);
  const [formStep,            setFormStep]            = useState(0);
  const [stats,               setStats]               = useState(null);
  const [showBulkImport,      setShowBulkImport]      = useState(false);
  const [showDrafts,          setShowDrafts]          = useState(false);
  const [draftToRestore,      setDraftToRestore]      = useState(null);
  const [savedDraftCount,     setSavedDraftCount]     = useState(() => listDrafts().length);
  const prevSignal = useRef(openAddSignal);

  const loadStats = useCallback(async () => {
    try { const d = await ApiClient.get('/api/school/student-stats/'); setStats(d); }
    catch { /* stats are non-critical */ }
  }, []);

  useEffect(() => {
    if (modal !== 'add') return;
    const { profile_photo, student_password, admission_number, father_password, guardian2_password, ...saveable } = form;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(saveable)); } catch { /* quota exceeded */ }
    }, 600);
    return () => clearTimeout(t);
  }, [form, modal]);

  const schoolCountryCode = useMemo(() => {
    if (!school?.country) return null;
    const q = school.country.toLowerCase().trim();
    return PHONE_COUNTRIES.find(c =>
      c.name.toLowerCase() === q || c.code.toLowerCase() === q
    )?.code || null;
  }, [school]);

  const closeModal = () => {
    setModal(null); setError(''); setFieldErrors({});
    setShowFatherPwd(false); setShowGuardian2Pwd(false); setShowGuardian2(false);
    setFormStep(0);
  };

  const [loadError, setLoadError] = useState('');
  const load = useCallback(async (q = '') => {
    setLoading(true);
    setLoadFailed(false);
    setLoadError('');
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const data   = await ApiClient.get(`/api/school/students/${params}`);
      setStudents(data.students || []);
    } catch (err) {
      setStudents([]);
      setLoadFailed(true);
      // Surface in DevTools so users / testers can paste the actual error
      // when filing bug reports — the human-readable line below may hide details.
      console.error('[Students] Failed to load:', {
        status: err?.status, message: err?.message, data: err?.data, error: err,
      });
      const msg = err?.message || '';
      if (err?.status === 401 || err?.status === 403) {
        setLoadError('Your session has expired or you don\'t have permission. Please sign out and sign in again.');
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || err?.status === 0) {
        setLoadError('Cannot reach the server. Confirm the backend is online.');
      } else if (err?.status >= 500) {
        setLoadError(`Server error (${err.status}). ${msg || 'See backend logs for details.'}`);
      } else if (err?.status === 404) {
        setLoadError('Endpoint not found (404). The backend may be on an older version.');
      } else {
        setLoadError(msg || 'Unknown error loading students. Open DevTools → Console for details.');
      }
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

  useEffect(() => { load(); loadStats(); }, [load, loadStats]);
  useEffect(() => {
    ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])).catch(() => {});
  }, []);
  useEffect(() => {
    if (viewStudent) loadLinkedParents(viewStudent.id);
    else setLinkedParents([]);
  }, [viewStudent, loadLinkedParents]);

  const emptyForm = {
    first_name: '', middle_name: '', last_name: '', gender: '', date_of_birth: '', place_of_birth: '',
    nationality: '', religion: '', home_address: '', city: '', phone_number: '', email: '',
    admission_number: '', classroom_id: '', student_status: 'active', enrollment_date: '',
    student_type: '', fee_category: '', home_language: '', intake_term: '', is_repeater: false,
    hostel_house: '', transport_route: '',
    is_transfer: false, previous_school: '', last_class_completed: '', leaving_reason: '',
    student_username: '', student_password: '',
    father_relationship: 'Father', father_name: '', father_occupation: '', father_phone: '', father_email: '',
    father_address: '', father_whatsapp: '', father_username: '', father_password: '', father_existing_id: '',
    guardian2_relationship: 'Mother', guardian2_name: '', guardian2_occupation: '', guardian2_phone: '', guardian2_email: '',
    guardian2_address: '', guardian2_whatsapp: '', guardian2_username: '', guardian2_password: '', guardian2_existing_id: '',
    emergency_name: '', emergency_relationship: '', emergency_phone: '', emergency_address: '',
    blood_group: '', allergies: '', medical_conditions: '', doctor_name: '', doctor_phone: '',
    sen_notes: '', sen_iep: false,
    disciplinary_history: false, disciplinary_notes: '',
    documents_birth_certificate: false, documents_passport_photo: false,
    documents_previous_school_report: false, documents_transfer_letter: false,
    documents_medical_report: false, documents_other: false,
    profile_photo: null,
  };

  const openAdd = useCallback(() => {
    const pwd = generatePassword();
    let base = { ...emptyForm, student_password: pwd, father_password: generatePassword(), guardian2_password: generatePassword() };
    let hasDraft = false;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        const validKeys = new Set(Object.keys(emptyForm));
        const safeDraft = Object.fromEntries(Object.entries(draft).filter(([k]) => validKeys.has(k)));
        base = { ...base, ...safeDraft, student_password: pwd, father_password: base.father_password, guardian2_password: base.guardian2_password };
        hasDraft = true;
      }
    } catch { /* corrupt draft — ignore */ }

    setForm(base);
    setDraftRestored(hasDraft);
    setProfilePhotoPreview(null);
    setShowFormPwd(true);
    setShowFatherPwd(false); setShowGuardian2Pwd(false); setShowGuardian2(false);
    setError('');
    setFieldErrors({});
    setFormStep(0);
    setModal('add');

    // Always refresh admission number from API regardless of draft
    setGeneratingAdmNo(true);
    Promise.race([
      ApiClient.get('/api/school/students/next-admission-number/'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('adm-timeout')), 5000)),
    ])
      .then(d => { if (d.admission_number) setForm(f => ({ ...f, admission_number: d.admission_number })); })
      .catch(() => {
        const y = new Date().getFullYear();
        const seq = String(Date.now()).slice(-4);
        setForm(f => ({ ...f, admission_number: `STU/${y}/${seq}` }));
      })
      .finally(() => setGeneratingAdmNo(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (openAddSignal !== prevSignal.current && prevSignal.current !== undefined) openAdd();
    prevSignal.current = openAddSignal;
  }, [openAddSignal, openAdd]);

  const openEdit = s => {
    setForm({
      first_name: s.first_name || '', middle_name: s.middle_name || '', last_name: s.last_name || '',
      gender: s.gender === 'M' ? 'Male' : s.gender === 'F' ? 'Female' : s.gender === 'O' ? 'Other' : '',
      date_of_birth: s.date_of_birth || '', place_of_birth: s.place_of_birth || '',
      nationality: s.nationality || '', religion: s.religion || '',
      home_address: s.home_address || '', city: s.city || '',
      phone_number: s.phone_number || '', email: s.email || '',
      admission_number: s.admission_number || '', classroom_id: s.classroom_id || '',
      student_status: s.status || 'active',
      enrollment_date: s.admission_date || '',
      student_type: s.student_type === 'day' ? 'Day' : s.student_type === 'boarding' ? 'Boarding' : '',
      fee_category: s.fee_category || '', home_language: s.home_language || '',
      intake_term: s.intake_term || '', is_repeater: !!s.is_repeater,
      hostel_house: s.hostel_house || '', transport_route: s.transport_route || '',
      is_transfer: !!(s.previous_school || s.last_class_completed || s.leaving_reason),
      previous_school: s.previous_school || '', last_class_completed: s.last_class_completed || '',
      leaving_reason: s.leaving_reason || '',
      student_username: '', student_password: '',
      father_relationship: 'Father', father_name: '', father_occupation: '',
      father_phone: '', father_email: '', father_address: '', father_whatsapp: '',
      father_username: '', father_password: '', father_existing_id: '',
      guardian2_relationship: 'Mother', guardian2_name: '', guardian2_occupation: '',
      guardian2_phone: '', guardian2_email: '', guardian2_address: '', guardian2_whatsapp: '',
      guardian2_username: '', guardian2_password: '', guardian2_existing_id: '',
      emergency_name: s.emergency_name || '', emergency_relationship: s.emergency_relationship || '',
      emergency_phone: s.emergency_phone || '', emergency_address: s.emergency_address || '',
      blood_group: s.blood_type || '', allergies: s.allergies || '',
      medical_conditions: s.medical_notes || '',
      doctor_name: s.doctor_name || '', doctor_phone: s.doctor_phone || '',
      sen_notes: s.sen_notes || '', sen_iep: !!s.sen_iep,
      disciplinary_history: !!s.disciplinary_history, disciplinary_notes: s.disciplinary_notes || '',
      documents_birth_certificate: !!s.documents_birth_certificate,
      documents_passport_photo: !!s.documents_passport_photo,
      documents_previous_school_report: !!s.documents_previous_school_report,
      documents_transfer_letter: !!s.documents_transfer_letter,
      documents_medical_report: !!s.documents_medical_report,
      documents_other: !!s.documents_other,
      profile_photo: null,
    });
    setProfilePhotoPreview(s.passport_picture || null);
    setDraftRestored(false);
    setShowFatherPwd(false); setShowGuardian2Pwd(false); setShowGuardian2(false);
    setError(''); setFieldErrors({}); setModal(s); setFormStep(0);
  };

  const handlePhotoChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-selecting the same file
    const reader = new FileReader();
    reader.onload = ev => {
      setForm(f => ({ ...f, profile_photo: file }));
      setProfilePhotoPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setForm(f => ({ ...f, profile_photo: null }));
    setProfilePhotoPreview(null);
  };

  const buildPayload = data => {
    const clean = { ...data };
    if (!clean.student_username) delete clean.student_username;
    if (clean.student_status !== undefined) {
      clean.status    = clean.student_status;
      clean.is_active = ['active', 'suspended'].includes(clean.student_status);
      delete clean.student_status;
    }
    // Frontend-only fields — strip before sending
    delete clean.is_transfer;
    // Remap guardian2_* → mother_* for API compatibility
    ['relationship','name','occupation','phone','email','address','whatsapp','username','password','existing_id'].forEach(k => {
      if (`guardian2_${k}` in clean) { clean[`mother_${k}`] = clean[`guardian2_${k}`]; delete clean[`guardian2_${k}`]; }
    });

    if (clean.profile_photo instanceof File || clean.profile_photo instanceof Blob) {
      const fd = new FormData();
      Object.entries(clean).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (v instanceof File || v instanceof Blob) fd.append(k, v);
        else if (typeof v === 'boolean') fd.append(k, v ? 'true' : 'false');
        else fd.append(k, v);
      });
      return fd;
    }
    return clean;
  };

  const validate = () => {
    const errs = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Step 0 required
    if (!form.first_name?.trim())   errs.first_name   = 'First name is required';
    if (!form.last_name?.trim())    errs.last_name    = 'Last name is required';
    if (!form.gender)               errs.gender       = 'Gender is required';
    if (!form.date_of_birth)        errs.date_of_birth = 'Date of birth is required';
    if (form.email?.trim() && !emailRe.test(form.email.trim())) errs.email = 'Enter a valid email address';
    if (form.date_of_birth) {
      const dob = new Date(form.date_of_birth), now = new Date();
      if (dob > now) errs.date_of_birth = 'Date of birth cannot be in the future';
      else {
        const yrs = (now - dob) / (365.25 * 24 * 3600 * 1000);
        if (yrs < 3)  errs.date_of_birth = 'Student appears too young for enrolment';
        if (yrs > 30) errs.date_of_birth = 'Please verify — age is over 30 years';
      }
    }
    // Step 1 required
    if (!form.classroom_id)         errs.classroom_id    = 'Class / Grade must be assigned before enrolling';
    if (!form.enrollment_date)      errs.enrollment_date = 'Enrollment date is required';
    // Guardian emails
    if (form.father_email?.trim() && !emailRe.test(form.father_email.trim())) errs.father_email = 'Enter a valid email address';
    if (form.guardian2_email?.trim() && !emailRe.test(form.guardian2_email.trim())) errs.guardian2_email = 'Enter a valid email address';
    setFieldErrors(errs);
    return errs;
  };

  const scrollStepTop = () => requestAnimationFrame(() =>
    document.querySelector('.ska-modal')?.scrollTo({ top: 0, behavior: 'smooth' })
  );

  const handleStepNext = () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (formStep === 0) {
      const errs = {};
      if (!form.first_name?.trim())  errs.first_name   = 'First name is required';
      if (!form.last_name?.trim())   errs.last_name    = 'Last name is required';
      if (!form.gender)              errs.gender       = 'Gender is required';
      if (!form.date_of_birth)       errs.date_of_birth = 'Date of birth is required';
      if (form.email?.trim() && !emailRe.test(form.email.trim())) errs.email = 'Enter a valid email address';
      if (form.date_of_birth) {
        const dob = new Date(form.date_of_birth), now = new Date();
        if (dob > now) errs.date_of_birth = 'Date of birth cannot be in the future';
        else {
          const yrs = (now - dob) / (365.25 * 24 * 3600 * 1000);
          if (yrs < 3)  errs.date_of_birth = 'Student appears too young for enrolment';
          if (yrs > 30) errs.date_of_birth = 'Please verify — age is over 30 years';
        }
      }
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        setError(Object.keys(errs).length === 1
          ? 'Please fix the highlighted field below.'
          : `Please fix ${Object.keys(errs).length} highlighted fields below.`);
        return;
      }
    }

    if (formStep === 1) {
      const errs = {};
      if (!form.classroom_id)    errs.classroom_id    = 'Class / Grade must be assigned';
      if (!form.enrollment_date) errs.enrollment_date = 'Enrollment date is required';
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        setError(Object.keys(errs).length === 1
          ? 'Please fix the highlighted field below.'
          : `Please fix ${Object.keys(errs).length} highlighted fields below.`);
        return;
      }
    }

    if (formStep === 2) {
      const errs = {};
      if (form.father_email?.trim() && !emailRe.test(form.father_email.trim())) errs.father_email = 'Enter a valid email address';
      if (form.guardian2_email?.trim() && !emailRe.test(form.guardian2_email.trim())) errs.guardian2_email = 'Enter a valid email address';
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        setError(Object.keys(errs).length === 1
          ? 'Please fix the highlighted field below.'
          : `Please fix ${Object.keys(errs).length} highlighted fields below.`);
        return;
      }
    }

    setError(''); setFieldErrors({});
    setFormStep(s => s + 1);
    scrollStepTop();
  };

  const handleStepBack = () => {
    setError(''); setFieldErrors({});
    setFormStep(s => s - 1);
    scrollStepTop();
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setError(Object.keys(errs).length === 1 ? 'Please fix the highlighted field below.' : `Please fix ${Object.keys(errs).length} highlighted fields below.`);
      return;
    }
    setSaving(true); setError(''); setFieldErrors({});
    try {
      const payload = buildPayload(form);
      if (modal === 'add') {
        const res = await ApiClient.post('/api/school/students/', payload);
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
        closeModal();
        load(search);
        loadStats();
        setCredSuccess({
          id:                       res.id,
          full_name:                res.full_name || [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' '),
          admission_number:         res.admission_number || form.admission_number,
          student_username:         res.student_username || previewUsername(res.admission_number || form.admission_number),
          student_initial_password: res.student_initial_password || form.student_password,
          email_sent:               !!form.email,
          school_name:              school?.name,
          classroom:                classes.find(c => String(c.id) === String(form.classroom_id))?.name || '',
          enrollment_date:          new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          parent_warnings:          res.parent_warnings || [],
        });
      } else {
        await ApiClient.put(`/api/school/students/${modal.id}/`, payload);
        closeModal();
        load(search);
        loadStats();
      }
    } catch (e) {
      const msg = e.message || '';
      setError(
        msg === 'Load failed' || msg.includes('Failed to fetch') || msg.includes('NetworkError')
          ? 'Unable to reach the server. Please check your internet connection.'
          : msg || 'Failed to save student.'
      );
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

      <div className="ska-page-head ska-page-head--action">
        <div>
          <h1 className="ska-page-title">Students</h1>
          <p className="ska-page-sub">{school?.name} — {students.length} enrolled</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {savedDraftCount > 0 && (
            <button className="ska-btn ska-btn--ghost" onClick={() => setShowDrafts(true)}>
              <Ic name="drafts" size="sm" /> Drafts ({savedDraftCount})
            </button>
          )}
          <button className="ska-btn ska-btn--ghost" onClick={() => setShowBulkImport(true)}>
            <Ic name="upload_file" size="sm" /> Bulk import
          </button>
          <button className="ska-btn ska-btn--primary" onClick={openAdd}>
            <Ic name="person_add" size="sm" /> Add Student
          </button>
        </div>
      </div>

      {/* ── Metrics bar ─────────────────────────────────────── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { icon: 'group',           color: 'var(--ska-primary)',   bg: 'var(--ska-primary-dim)',      label: 'Total',          value: stats.total ?? '—' },
            { icon: 'person_check',    color: 'var(--ska-secondary)', bg: 'var(--ska-secondary-dim)',    label: 'Active',         value: stats.active ?? '—' },
            { icon: 'person_add',      color: '#4b8eff',              bg: 'rgba(75,142,255,0.12)',       label: 'New This Term',  value: stats.new_this_term ?? '—' },
            { icon: 'warning',         color: 'var(--ska-error)',     bg: 'var(--ska-error-dim)',        label: 'Flagged',        value: stats.flagged ?? '—' },
            { icon: 'event_available', color: '#4cd7f6',              bg: 'rgba(76,215,246,0.12)',       label: 'Avg Attendance', value: stats.avg_attendance != null ? `${stats.avg_attendance}%` : '—' },
          ].map(m => (
            <div key={m.label} className="ska-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ic name={m.icon} style={{ color: m.color, fontSize: 20 }} />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ska-text)', lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', marginTop: 2 }}>{m.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ska-search ska-toolbar-search" style={{ marginBottom: 16 }}>
        <Ic name="search" />
        <input className="ska-search-input" placeholder="Search by name or admission number…"
          value={search} onChange={handleSearch} />
      </div>

      <div className="ska-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
        ) : loadFailed ? (
          <div className="ska-empty">
            <Ic name="wifi_off" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
            <p className="ska-empty-title">Could not load students</p>
            <p className="ska-empty-desc">{loadError || 'Check your connection and try again.'}</p>
            <button className="ska-btn ska-btn--ghost" style={{ marginTop: 14 }} onClick={() => load(search)}>
              <Ic name="refresh" size="sm" /> Retry
            </button>
          </div>
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
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => setViewStudent(s)} title="View Profile">
                        <Ic name="person" size="sm" />
                      </button>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => openEdit(s)}>
                        <Ic name="edit" size="sm" />
                      </button>
                      <ResendCredentialsButton userId={s.user_id} label="" />
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

      {/* ── Add Wizard (new architecture, replaces inline form) ── */}
      {modal === 'add' && (
        <AddStudentWizard
          mode="add"
          school={school}
          classes={classes}
          allStudents={students}
          schoolCountryCode={schoolCountryCode}
          draftToRestore={draftToRestore}
          onClose={() => {
            setModal(null);
            setDraftToRestore(null);
            setSavedDraftCount(listDrafts().length);
          }}
          onSaved={(info) => {
            setModal(null);
            setDraftToRestore(null);
            setSavedDraftCount(listDrafts().length);
            load(search);
            loadStats();
            setCredSuccess(info);
            if (info.addAnother) {
              /* Re-open the wizard fresh after a brief delay */
              setTimeout(() => {
                setCredSuccess(null);
                openAdd();
              }, 600);
            }
          }}
        />
      )}

      {/* ── Bulk Import ────────────────────────────────────────── */}
      {showBulkImport && (
        <BulkImportModal
          existingStudents={students}
          classes={classes}
          onClose={() => setShowBulkImport(false)}
          onImported={() => { load(search); loadStats(); }}
        />
      )}

      {/* ── Draft Manager ──────────────────────────────────────── */}
      {showDrafts && (
        <DraftManager
          onClose={() => { setShowDrafts(false); setSavedDraftCount(listDrafts().length); }}
          onRestore={(draft) => {
            setDraftToRestore(draft);
            setShowDrafts(false);
            setModal('add');
          }}
        />
      )}

      {/* ── Edit Modal (legacy inline form, only for non-add) ──── */}
      {modal && modal !== 'add' && (
        <Modal title="Edit Student" onClose={closeModal}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <p className="ska-form-error" style={{ margin: 0, flex: 1 }}>{error}</p>
              {(error.includes('reach the server') || error.includes('connection')) && (
                <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm" onClick={handleSave} style={{ flexShrink: 0 }}>
                  <Ic name="refresh" size="sm" /> Retry
                </button>
              )}
            </div>
          )}

          {/* Draft-restored banner */}
          {draftRestored && modal === 'add' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              background: 'var(--ska-primary-dim)', border: '1px solid var(--ska-primary)',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <Ic name="restore" size="sm" style={{ color: 'var(--ska-primary)', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ska-primary)', flex: 1 }}>
                Draft restored — your unsaved progress was recovered.
              </p>
              <button type="button"
                onClick={() => {
                  const pwd = generatePassword();
                  setForm({ ...emptyForm, student_password: pwd });
                  try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
                  setDraftRestored(false);
                  setGeneratingAdmNo(true);
                  Promise.race([
                    ApiClient.get('/api/school/students/next-admission-number/'),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('adm-timeout')), 5000)),
                  ])
                    .then(d => { if (d.admission_number) setForm(f => ({ ...f, admission_number: d.admission_number })); })
                    .catch(() => {
                      const y = new Date().getFullYear();
                      const seq = String(Date.now()).slice(-4);
                      setForm(f => ({ ...f, admission_number: `STU/${y}/${seq}` }));
                    })
                    .finally(() => setGeneratingAdmNo(false));
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-primary)', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', padding: 0 }}>
                Start fresh
              </button>
            </div>
          )}

          <StepBar steps={FORM_STEPS} current={formStep} />

          {/* ── Step 0: Personal Information ── */}
          {formStep === 0 && <>

          {/* Profile photo */}
          <div id="s-photo" className="ska-card ska-card-pad" style={{ marginBottom: 16 }}>
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

          {/* ── Student Portal Credentials ────────────────────── */}
          {modal === 'add' && (
            <div id="s-creds" className="ska-card ska-card-pad" style={{
              marginTop: 16, marginBottom: 4,
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

              {/* Auto-generated credential preview — read-only */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  {
                    label: 'Username',
                    value: form.admission_number ? previewUsername(form.admission_number) : 'Generated after admission number',
                    icon: 'account_circle',
                  },
                  {
                    label: 'Password',
                    value: form.student_password,
                    icon: 'lock',
                    secret: true,
                  },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--ska-surface)', borderRadius: 10,
                    padding: '10px 14px', border: '1px solid var(--ska-border)',
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
                        margin: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--ska-text)',
                        fontFamily: 'monospace', letterSpacing: '0.04em',
                        filter: (row.secret && !showFormPwd) ? 'blur(5px)' : 'none',
                        userSelect: (row.secret && !showFormPwd) ? 'none' : 'text',
                      }}>{row.value}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      {row.secret && (
                        <button type="button" title={showFormPwd ? 'Hide' : 'Show'} onClick={() => setShowFormPwd(p => !p)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4 }}>
                          <Ic name={showFormPwd ? 'visibility_off' : 'visibility'} size="sm" />
                        </button>
                      )}
                      {row.secret && (
                        <button type="button" title="Regenerate password" onClick={() => setForm(f => ({ ...f, student_password: generatePassword() }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4 }}>
                          <Ic name="refresh" size="sm" />
                        </button>
                      )}
                      <button type="button" title="Copy" onClick={() => copyText(row.value)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4 }}>
                        <Ic name="content_copy" size="sm" />
                      </button>
                    </div>
                  </div>
                ))}
                <p style={{ margin: 0, fontSize: '0.71875rem', color: 'var(--ska-text-3)' }}>
                  These credentials are auto-generated. Share them with the student — they can change their password after first login.
                  {form.email && ' They will also be emailed to the student.'}
                </p>
              </div>
            </div>
          )}

          {/* ── Personal Information ─────────────────────────── */}
          <div id="s-personal" className="ska-card ska-card-pad" style={{ marginTop: 16, background: 'var(--ska-surface-high)' }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Personal Information</h3>
            <div className="ska-form-grid">
              <label className="ska-form-group">
                <span>First Name *</span>
                <input className="ska-input" autoComplete="given-name" value={form.first_name}
                  style={fieldErrors.first_name ? { borderColor: 'var(--ska-error)' } : {}}
                  onChange={e => { setForm(f => ({ ...f, first_name: e.target.value })); setFieldErrors(p => ({ ...p, first_name: '' })); }} />
                {fieldErrors.first_name && <span style={{ fontSize: '0.71875rem', color: 'var(--ska-error)', marginTop: 2 }}>{fieldErrors.first_name}</span>}
              </label>
              <label className="ska-form-group">
                <span>Middle Name</span>
                <input className="ska-input" autoComplete="additional-name" value={form.middle_name}
                  placeholder="Optional"
                  onChange={e => setForm(f => ({ ...f, middle_name: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Last Name *</span>
                <input className="ska-input" autoComplete="family-name" value={form.last_name}
                  style={fieldErrors.last_name ? { borderColor: 'var(--ska-error)' } : {}}
                  onChange={e => { setForm(f => ({ ...f, last_name: e.target.value })); setFieldErrors(p => ({ ...p, last_name: '' })); }} />
                {fieldErrors.last_name && <span style={{ fontSize: '0.71875rem', color: 'var(--ska-error)', marginTop: 2 }}>{fieldErrors.last_name}</span>}
              </label>
              <label className="ska-form-group">
                <span>Gender *</span>
                <select className="ska-input" value={form.gender}
                  style={fieldErrors.gender ? { borderColor: 'var(--ska-error)' } : {}}
                  onChange={e => { setForm(f => ({ ...f, gender: e.target.value })); setFieldErrors(p => ({ ...p, gender: '' })); }}>
                  <option value="">— Select gender —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other / Prefer not to say</option>
                </select>
                {fieldErrors.gender && <span style={{ fontSize: '0.71875rem', color: 'var(--ska-error)', marginTop: 2 }}>{fieldErrors.gender}</span>}
              </label>
              <label className="ska-form-group">
                <span>Date of Birth *</span>
                <input className="ska-input" type="date" value={form.date_of_birth}
                  max={new Date().toISOString().split('T')[0]}
                  style={fieldErrors.date_of_birth ? { borderColor: 'var(--ska-error)' } : {}}
                  onChange={e => { setForm(f => ({ ...f, date_of_birth: e.target.value })); setFieldErrors(p => ({ ...p, date_of_birth: '' })); }} />
                {fieldErrors.date_of_birth && <span style={{ fontSize: '0.71875rem', color: 'var(--ska-error)', marginTop: 2 }}>{fieldErrors.date_of_birth}</span>}
                {form.date_of_birth && !fieldErrors.date_of_birth && (() => {
                  const age = calculateAge(form.date_of_birth);
                  return age !== null ? (
                    <span className="ska-age-display">
                      <Ic name="cake" size="sm" />
                      Age: {age} year{age !== 1 ? 's' : ''}
                    </span>
                  ) : null;
                })()}
              </label>
              <label className="ska-form-group">
                <span>Place of Birth</span>
                <input className="ska-input" value={form.place_of_birth} onChange={e => setForm(f => ({ ...f, place_of_birth: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Nationality</span>
                <input className="ska-input" autoComplete="country-name" value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Religion</span>
                <input className="ska-input" value={form.religion} onChange={e => setForm(f => ({ ...f, religion: e.target.value }))} />
              </label>
              <label className="ska-form-group" style={{ gridColumn: '1 / -1' }}>
                <span>Home Address</span>
                <textarea className="ska-input" rows={2} autoComplete="street-address" value={form.home_address}
                  onChange={e => setForm(f => ({ ...f, home_address: e.target.value }))}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              </label>
              <label className="ska-form-group">
                <span>City / Town</span>
                <input className="ska-input" autoComplete="address-level2" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Student Email Address</span>
                <input className="ska-input" type="email" autoComplete="email" value={form.email}
                  style={fieldErrors.email ? { borderColor: 'var(--ska-error)' } : {}}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFieldErrors(p => ({ ...p, email: '' })); }} />
                {fieldErrors.email && <span style={{ fontSize: '0.71875rem', color: 'var(--ska-error)', marginTop: 2 }}>{fieldErrors.email}</span>}
              </label>
              <label className="ska-form-group">
                <span>Student Phone Number</span>
                <PhoneInput value={form.phone_number} onChange={v => setForm(f => ({ ...f, phone_number: v }))} defaultCountry={schoolCountryCode} autoComplete="tel" />
              </label>
            </div>
          </div>

          </>}

          {/* ── Step 1: Enrollment ── */}
          {formStep === 1 && <>

          {/* ── Enrollment Details ───────────────────────────── */}
          <div id="s-enroll" className="ska-card ska-card-pad" style={{ marginTop: 16, background: 'var(--ska-surface-high)' }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Enrollment Details</h3>
            <div className="ska-form-grid">

              {/* Admission number — auto-generated, read-only */}
              <label className="ska-form-group" style={{ gridColumn: '1 / -1' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Admission Number
                  <span style={{
                    fontSize: '0.625rem', fontWeight: 700, padding: '2px 6px', borderRadius: 20,
                    background: 'var(--ska-primary-dim)', color: 'var(--ska-primary)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>Auto-generated</span>
                </span>
                <div style={{ position: 'relative', maxWidth: 320 }}>
                  <input
                    className="ska-input"
                    value={generatingAdmNo ? 'Generating…' : form.admission_number}
                    readOnly={generatingAdmNo}
                    placeholder="Auto-generated — or type your own"
                    style={{ paddingRight: 40, fontFamily: 'monospace', letterSpacing: '0.04em' }}
                    onChange={e => !generatingAdmNo && setForm(f => ({ ...f, admission_number: e.target.value }))}
                  />
                  {modal === 'add' && !generatingAdmNo && (
                    <button
                      type="button"
                      title="Re-generate admission number"
                      onClick={() => {
                        setGeneratingAdmNo(true);
                        Promise.race([
                          ApiClient.get('/api/school/students/next-admission-number/'),
                          new Promise((_, rej) => setTimeout(() => rej(new Error('adm-timeout')), 5000)),
                        ])
                          .then(d => { if (d.admission_number) setForm(f => ({ ...f, admission_number: d.admission_number })); })
                          .catch(() => {
                            const y = new Date().getFullYear();
                            const seq = String(Date.now()).slice(-4);
                            setForm(f => ({ ...f, admission_number: `STU/${y}/${seq}` }));
                          })
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
              </label>

              <label className="ska-form-group">
                <span>Class / Grade *</span>
                <select className="ska-input" value={form.classroom_id}
                  style={fieldErrors.classroom_id ? { borderColor: 'var(--ska-error)' } : {}}
                  onChange={e => { setForm(f => ({ ...f, classroom_id: e.target.value })); setFieldErrors(p => ({ ...p, classroom_id: '' })); }}>
                  <option value="">— Assign a class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {fieldErrors.classroom_id && <span style={{ fontSize: '0.71875rem', color: 'var(--ska-error)', marginTop: 2 }}>{fieldErrors.classroom_id}</span>}
              </label>
              {modal !== 'add' && (
                <label className="ska-form-group">
                  <span>Student Status</span>
                  <select className="ska-input" value={form.student_status} onChange={e => setForm(f => ({ ...f, student_status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="transferred">Transferred</option>
                    <option value="graduated">Graduated</option>
                  </select>
                </label>
              )}
              <label className="ska-form-group">
                <span>Enrollment Date *</span>
                <input className="ska-input" type="date" value={form.enrollment_date}
                  max={new Date().toISOString().split('T')[0]}
                  style={fieldErrors.enrollment_date ? { borderColor: 'var(--ska-error)' } : {}}
                  onChange={e => { setForm(f => ({ ...f, enrollment_date: e.target.value })); setFieldErrors(p => ({ ...p, enrollment_date: '' })); }} />
                {fieldErrors.enrollment_date && <span style={{ fontSize: '0.71875rem', color: 'var(--ska-error)', marginTop: 2 }}>{fieldErrors.enrollment_date}</span>}
              </label>
              <label className="ska-form-group">
                <span>Student Type</span>
                <select className="ska-input" value={form.student_type}
                  onChange={e => setForm(f => ({ ...f, student_type: e.target.value, hostel_house: e.target.value !== 'Boarding' ? '' : f.hostel_house }))}>
                  <option value="">— Select —</option>
                  <option value="Day">Day</option>
                  <option value="Boarding">Boarding</option>
                </select>
              </label>
              {form.student_type === 'Boarding' && (
                <label className="ska-form-group">
                  <span>House / Hostel</span>
                  <input className="ska-input" value={form.hostel_house}
                    placeholder="e.g. Harmony House, Lion House"
                    onChange={e => setForm(f => ({ ...f, hostel_house: e.target.value }))} />
                </label>
              )}
              <label className="ska-form-group">
                <span>Fee Category</span>
                <select className="ska-input" value={form.fee_category} onChange={e => setForm(f => ({ ...f, fee_category: e.target.value }))}>
                  <option value="">— Select —</option>
                  <option value="full_paying">Full-Paying</option>
                  <option value="partial_scholarship">Partial Scholarship</option>
                  <option value="full_scholarship">Full Scholarship</option>
                  <option value="government_sponsored">Government-Sponsored</option>
                  <option value="bursary">Bursary</option>
                </select>
              </label>
              <label className="ska-form-group">
                <span>Intake Term</span>
                <select className="ska-input" value={form.intake_term} onChange={e => setForm(f => ({ ...f, intake_term: e.target.value }))}>
                  <option value="">— Select —</option>
                  <option value="TERM1">Term 1</option>
                  <option value="TERM2">Term 2</option>
                  <option value="TERM3">Term 3</option>
                </select>
              </label>
              <label className="ska-form-group">
                <span>Home Language</span>
                <input className="ska-input" value={form.home_language} placeholder="e.g. Krio, Temne, Mende"
                  onChange={e => setForm(f => ({ ...f, home_language: e.target.value }))} />
              </label>
              <label className="ska-form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={form.is_repeater}
                  onChange={e => setForm(f => ({ ...f, is_repeater: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--ska-primary)', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem' }}>Repeating year / retained student</span>
              </label>
              <label className="ska-form-group">
                <span>Transport Route</span>
                <input className="ska-input" value={form.transport_route}
                  placeholder="e.g. Route 3 — Waterloo, Morning Bus"
                  onChange={e => setForm(f => ({ ...f, transport_route: e.target.value }))} />
              </label>
            </div>
          </div>

          {/* ── Previous Schooling ───────────────────────────── */}
          <div id="s-prev" className="ska-card ska-card-pad" style={{ marginTop: 16, background: 'var(--ska-surface-high)' }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Previous Schooling</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: form.is_transfer ? 16 : 0 }}>
              <input type="checkbox" checked={!!form.is_transfer}
                onChange={e => setForm(f => ({
                  ...f, is_transfer: e.target.checked,
                  ...(e.target.checked ? {} : { previous_school: '', last_class_completed: '', leaving_reason: '' }),
                }))}
                style={{ width: 16, height: 16, accentColor: 'var(--ska-primary)', cursor: 'pointer', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem' }}>Transfer / returning student (attended another school before)</span>
            </label>
            {form.is_transfer && (
            <div className="ska-form-grid">
              <label className="ska-form-group">
                <span>Previous School Attended</span>
                <input className="ska-input" value={form.previous_school} onChange={e => setForm(f => ({ ...f, previous_school: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Last Class Completed</span>
                <input className="ska-input" value={form.last_class_completed} onChange={e => setForm(f => ({ ...f, last_class_completed: e.target.value }))} />
              </label>
              <label className="ska-form-group" style={{ gridColumn: '1 / -1' }}>
                <span>Reason for Leaving Previous School</span>
                <textarea className="ska-input" rows={2} value={form.leaving_reason}
                  onChange={e => setForm(f => ({ ...f, leaving_reason: e.target.value }))}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              </label>
            </div>
            )}
          </div>

          </>}

          {/* ── Step 2: Guardian & Emergency ── */}
          {formStep === 2 && <>

          {/* Parent / Guardian */}
          <div id="s-guardian" className="ska-card ska-card-pad" style={{ marginTop: 16, background: 'var(--ska-surface-high)' }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Parent / Guardian Information</h3>
            <div className="ska-form-grid">

              {/* Guardian 1 */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ska-primary)' }}>Guardian 1</span>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: 'var(--ska-primary)', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Contact</span>
              </div>

              {/* Link existing parent — search by name */}
              <div className="ska-form-group" style={{ gridColumn: '1 / -1' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Link Existing Parent Account
                  <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--ska-text-3)' }}>optional — search by name to link instead of creating new</span>
                </span>
                <ParentSearchInline
                  value={form.father_existing_id}
                  onChange={id => setForm(f => ({ ...f, father_existing_id: id }))}
                />
              </div>

              {!form.father_existing_id && (<>
                <label className="ska-form-group">
                  <span>Relationship</span>
                  <select className="ska-input" value={form.father_relationship}
                    onChange={e => setForm(f => ({ ...f, father_relationship: e.target.value }))}>
                    <option value="">— Select —</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Uncle">Uncle</option>
                    <option value="Aunt">Aunt</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                    <option value="Stepfather">Stepfather</option>
                    <option value="Stepmother">Stepmother</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="ska-form-group"><span>{form.father_relationship || 'Guardian 1'} Name</span>
                  <input className="ska-input" value={form.father_name} onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))} /></label>
                <label className="ska-form-group"><span>Occupation</span>
                  <input className="ska-input" value={form.father_occupation} onChange={e => setForm(f => ({ ...f, father_occupation: e.target.value }))} /></label>
                <label className="ska-form-group"><span>Phone Number</span>
                  <PhoneInput value={form.father_phone} onChange={v => setForm(f => ({ ...f, father_phone: v }))} defaultCountry={schoolCountryCode} /></label>
                <label className="ska-form-group"><span>WhatsApp Number</span>
                  <PhoneInput value={form.father_whatsapp} onChange={v => setForm(f => ({ ...f, father_whatsapp: v }))} defaultCountry={schoolCountryCode} /></label>
                <label className="ska-form-group"><span>Email Address</span>
                  <input className="ska-input" type="email" value={form.father_email}
                    style={fieldErrors.father_email ? { borderColor: 'var(--ska-error)' } : {}}
                    onChange={e => { setForm(f => ({ ...f, father_email: e.target.value })); setFieldErrors(p => ({ ...p, father_email: '' })); }} />
                  {fieldErrors.father_email && <span style={{ fontSize: '0.71875rem', color: 'var(--ska-error)', marginTop: 2 }}>{fieldErrors.father_email}</span>}
                </label>
                <label className="ska-form-group"><span>Address (if different)</span>
                  <textarea className="ska-input" rows={2} value={form.father_address}
                    onChange={e => setForm(f => ({ ...f, father_address: e.target.value }))}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }} /></label>
                <label className="ska-form-group">
                  <span>Parent Login Username</span>
                  <input className="ska-input" autoComplete="off" value={form.father_username}
                    placeholder={form.father_name ? `e.g. par_${form.father_name.split(' ').pop().toLowerCase().replace(/[^a-z0-9]/g, '')}` : 'e.g. par_smith'}
                    onChange={e => setForm(f => ({ ...f, father_username: e.target.value }))} />
                  <span style={{ fontSize: '0.71875rem', color: 'var(--ska-text-3)', marginTop: 2 }}>Used to log in to the parent portal. Must be unique.</span>
                </label>
                <label className="ska-form-group">
                  <span>Parent Login Password</span>
                  <div style={{ position: 'relative' }}>
                    <input className="ska-input" type={showFatherPwd ? 'text' : 'password'} autoComplete="new-password" value={form.father_password}
                      style={{ paddingRight: 72 }}
                      onChange={e => setForm(f => ({ ...f, father_password: e.target.value }))} />
                    <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 0 }}>
                      <button type="button" title="Regenerate password" onClick={() => setForm(f => ({ ...f, father_password: generatePassword() }))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4 }}>
                        <Ic name="refresh" size="sm" />
                      </button>
                      <button type="button" title={showFatherPwd ? 'Hide' : 'Show'} onClick={() => setShowFatherPwd(p => !p)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4 }}>
                        <Ic name={showFatherPwd ? 'visibility_off' : 'visibility'} size="sm" />
                      </button>
                    </div>
                  </div>
                </label>
              </>)}

              {/* Guardian 2 toggle */}
              <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                <button type="button"
                  onClick={() => setShowGuardian2(p => !p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ska-primary)', padding: 0 }}>
                  <Ic name={showGuardian2 ? 'expand_less' : 'expand_more'} size="sm" />
                  {showGuardian2 ? 'Hide Guardian 2' : 'Add Guardian 2 (optional)'}
                </button>
              </div>

              {showGuardian2 && (<>
                <div style={{ gridColumn: '1 / -1', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ska-primary)', marginTop: 4 }}>
                  Guardian 2
                </div>

                {/* Link existing parent — search by name */}
                <div className="ska-form-group" style={{ gridColumn: '1 / -1' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Link Existing Parent Account
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--ska-text-3)' }}>optional — search by name to link instead of creating new</span>
                  </span>
                  <ParentSearchInline
                    value={form.guardian2_existing_id}
                    onChange={id => setForm(f => ({ ...f, guardian2_existing_id: id }))}
                  />
                </div>

                {!form.guardian2_existing_id && (<>
                  <label className="ska-form-group">
                    <span>Relationship</span>
                    <select className="ska-input" value={form.guardian2_relationship}
                      onChange={e => setForm(f => ({ ...f, guardian2_relationship: e.target.value }))}>
                      <option value="">— Select —</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Uncle">Uncle</option>
                      <option value="Aunt">Aunt</option>
                      <option value="Grandparent">Grandparent</option>
                      <option value="Legal Guardian">Legal Guardian</option>
                      <option value="Stepfather">Stepfather</option>
                      <option value="Stepmother">Stepmother</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label className="ska-form-group"><span>{form.guardian2_relationship || 'Guardian 2'} Name</span>
                    <input className="ska-input" value={form.guardian2_name} onChange={e => setForm(f => ({ ...f, guardian2_name: e.target.value }))} /></label>
                  <label className="ska-form-group"><span>Occupation</span>
                    <input className="ska-input" value={form.guardian2_occupation} onChange={e => setForm(f => ({ ...f, guardian2_occupation: e.target.value }))} /></label>
                  <label className="ska-form-group"><span>Phone Number</span>
                    <PhoneInput value={form.guardian2_phone} onChange={v => setForm(f => ({ ...f, guardian2_phone: v }))} defaultCountry={schoolCountryCode} /></label>
                  <label className="ska-form-group"><span>WhatsApp Number</span>
                    <PhoneInput value={form.guardian2_whatsapp} onChange={v => setForm(f => ({ ...f, guardian2_whatsapp: v }))} defaultCountry={schoolCountryCode} /></label>
                  <label className="ska-form-group"><span>Email Address</span>
                    <input className="ska-input" type="email" value={form.guardian2_email}
                      style={fieldErrors.guardian2_email ? { borderColor: 'var(--ska-error)' } : {}}
                      onChange={e => { setForm(f => ({ ...f, guardian2_email: e.target.value })); setFieldErrors(p => ({ ...p, guardian2_email: '' })); }} />
                    {fieldErrors.guardian2_email && <span style={{ fontSize: '0.71875rem', color: 'var(--ska-error)', marginTop: 2 }}>{fieldErrors.guardian2_email}</span>}
                  </label>
                  <label className="ska-form-group"><span>Address (if different)</span>
                    <textarea className="ska-input" rows={2} value={form.guardian2_address}
                      onChange={e => setForm(f => ({ ...f, guardian2_address: e.target.value }))}
                      style={{ resize: 'vertical', fontFamily: 'inherit' }} /></label>
                  <label className="ska-form-group">
                    <span>Parent Login Username</span>
                    <input className="ska-input" autoComplete="off" value={form.guardian2_username}
                      placeholder={form.guardian2_name ? `e.g. par_${form.guardian2_name.split(' ').pop().toLowerCase().replace(/[^a-z0-9]/g, '')}` : 'e.g. par_johnson'}
                      onChange={e => setForm(f => ({ ...f, guardian2_username: e.target.value }))} />
                    <span style={{ fontSize: '0.71875rem', color: 'var(--ska-text-3)', marginTop: 2 }}>Used to log in to the parent portal. Must be unique.</span>
                  </label>
                  <label className="ska-form-group">
                    <span>Parent Login Password</span>
                    <div style={{ position: 'relative' }}>
                      <input className="ska-input" type={showGuardian2Pwd ? 'text' : 'password'} autoComplete="new-password" value={form.guardian2_password}
                        style={{ paddingRight: 72 }}
                        onChange={e => setForm(f => ({ ...f, guardian2_password: e.target.value }))} />
                      <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 0 }}>
                        <button type="button" title="Regenerate password" onClick={() => setForm(f => ({ ...f, guardian2_password: generatePassword() }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4 }}>
                          <Ic name="refresh" size="sm" />
                        </button>
                        <button type="button" title={showGuardian2Pwd ? 'Hide' : 'Show'} onClick={() => setShowGuardian2Pwd(p => !p)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', padding: 4 }}>
                          <Ic name={showGuardian2Pwd ? 'visibility_off' : 'visibility'} size="sm" />
                        </button>
                      </div>
                    </div>
                  </label>
                </>)}
              </>)}
            </div>
          </div>

          {/* Emergency contact */}
          <div id="s-emergency" className="ska-card ska-card-pad" style={{ marginTop: 16, background: 'var(--ska-surface-high)' }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Emergency Contact</h3>
            <div className="ska-form-grid">
              <label className="ska-form-group"><span>Name</span>
                <input className="ska-input" value={form.emergency_name} onChange={e => setForm(f => ({ ...f, emergency_name: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Relationship</span>
                <input className="ska-input" value={form.emergency_relationship} onChange={e => setForm(f => ({ ...f, emergency_relationship: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Phone Number</span>
                <PhoneInput value={form.emergency_phone} onChange={v => setForm(f => ({ ...f, emergency_phone: v }))} defaultCountry={schoolCountryCode} /></label>
              <label className="ska-form-group"><span>Address</span>
                <textarea className="ska-input" rows={2} value={form.emergency_address}
                  onChange={e => setForm(f => ({ ...f, emergency_address: e.target.value }))}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }} /></label>
            </div>
          </div>

          </>}

          {/* ── Step 3: Health & SEN ── */}
          {formStep === 3 && <>

          {/* Medical */}
          <div id="s-medical" className="ska-card ska-card-pad" style={{ marginTop: 16, background: 'var(--ska-surface-high)' }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Medical Information</h3>
            <div className="ska-form-grid">
              <label className="ska-form-group"><span>Blood Group</span>
                <select className="ska-input" value={form.blood_group} onChange={e => setForm(f => ({ ...f, blood_group: e.target.value }))}>
                  <option value="">— Unknown —</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select></label>
              <label className="ska-form-group"><span>Known Allergies</span>
                <input className="ska-input" value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Medical Conditions</span>
                <input className="ska-input" value={form.medical_conditions} onChange={e => setForm(f => ({ ...f, medical_conditions: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Doctor's Name</span>
                <input className="ska-input" value={form.doctor_name} onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))} /></label>
              <label className="ska-form-group"><span>Doctor's Phone</span>
                <PhoneInput value={form.doctor_phone} onChange={v => setForm(f => ({ ...f, doctor_phone: v }))} defaultCountry={schoolCountryCode} /></label>
            </div>
          </div>

          {/* Special Educational Needs */}
          <div id="s-sen" className="ska-card ska-card-pad" style={{ marginTop: 16, background: 'var(--ska-surface-high)' }}>
            <h3 className="ska-card-title" style={{ marginBottom: 4 }}>Special Educational Needs (SEN)</h3>
            <p style={{ margin: '0 0 12px', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
              Learning disabilities, assistive technology needs, accommodation plans. Kept separate from medical records.
            </p>
            <div style={{ display: 'grid', gap: 12 }}>
              <label className="ska-form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={form.sen_iep}
                  onChange={e => setForm(f => ({ ...f, sen_iep: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--ska-primary)', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem' }}>Student has an active Individualized Education Plan (IEP)</span>
              </label>
              <label className="ska-form-group">
                <span>SEN Notes</span>
                <textarea
                  className="ska-input"
                  rows={4}
                  value={form.sen_notes}
                  placeholder="Describe any learning disabilities, assistive needs, accommodations required, or other relevant SEN information…"
                  onChange={e => setForm(f => ({ ...f, sen_notes: e.target.value }))}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </label>
            </div>
          </div>

          {/* Conduct */}
          <div id="s-conduct" className="ska-card ska-card-pad" style={{ marginTop: 16, background: 'var(--ska-surface-high)' }}>
            <h3 className="ska-card-title" style={{ marginBottom: 12 }}>Student Conduct &amp; Discipline</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <label className="ska-form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={form.disciplinary_history}
                  onChange={e => setForm(f => ({ ...f, disciplinary_history: e.target.checked, disciplinary_notes: e.target.checked ? f.disciplinary_notes : '' }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--ska-primary)', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: '0.875rem' }}>Has the student ever been suspended/expelled?</span>
              </label>
              {form.disciplinary_history && (
                <label className="ska-form-group"><span>Provide details</span>
                  <textarea className="ska-input" rows={3} value={form.disciplinary_notes}
                    onChange={e => setForm(f => ({ ...f, disciplinary_notes: e.target.value }))}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </label>
              )}
            </div>
          </div>

          </>}

          {/* ── Step 4: Documents ── */}
          {formStep === 4 && <>

          {/* Documents */}
          <div id="s-docs" className="ska-card ska-card-pad" style={{ marginTop: 16, background: 'var(--ska-surface-high)' }}>
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
                  <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: 'var(--ska-primary)', cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          </>}

          {/* ── Step 5: Review & Submit ── */}
          {formStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Summary header card */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                background: 'var(--ska-primary-dim)', borderRadius: 12,
                border: '1px solid var(--ska-primary)',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', background: 'var(--ska-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
                }}>
                  {profilePhotoPreview
                    ? <img src={profilePhotoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Ic name="person" style={{ color: '#fff', fontSize: 28 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1.0625rem', color: 'var(--ska-text)' }}>
                    {[form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ') || '—'}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
                    {form.admission_number && (
                      <><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--ska-primary)' }}>{form.admission_number}</span>{' · '}</>
                    )}
                    {classes.find(c => String(c.id) === String(form.classroom_id))?.name || 'No class assigned'}
                  </p>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: '0.6875rem', fontWeight: 700,
                  background: 'var(--ska-primary)', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
                }}>
                  {modal === 'add' ? 'New Student' : 'Editing'}
                </span>
              </div>

              {/* Per-step review cards */}
              {[
                {
                  step: 0, title: 'Personal Information', icon: 'person',
                  rows: [
                    ['Gender', form.gender],
                    ['Date of Birth', form.date_of_birth ? new Date(form.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null],
                    ['Place of Birth', form.place_of_birth],
                    ['Nationality', form.nationality],
                    ['Religion', form.religion],
                    ['Home Language', form.home_language],
                    ['City / Town', form.city],
                    ['Email', form.email],
                    ['Phone', form.phone_number],
                  ].filter(([, v]) => v),
                },
                {
                  step: 1, title: 'Enrollment', icon: 'school',
                  rows: [
                    ['Student Type', form.student_type],
                    ['Fee Category', form.fee_category?.replace(/_/g, ' ')],
                    ['Intake Term', form.intake_term],
                    ['House / Hostel', form.hostel_house],
                    ['Transport Route', form.transport_route],
                    ['Repeating Year', form.is_repeater ? 'Yes' : null],
                    ['Transfer Student', form.is_transfer ? 'Yes' : null],
                    ['Previous School', form.previous_school],
                  ].filter(([, v]) => v),
                },
                {
                  step: 2, title: 'Guardian & Emergency', icon: 'family_restroom',
                  rows: [
                    ['Guardian 1', form.father_name ? `${form.father_name} (${form.father_relationship})` : form.father_existing_id ? 'Existing account linked' : null],
                    ['G1 Phone', form.father_phone],
                    ['Guardian 2', form.guardian2_name ? `${form.guardian2_name} (${form.guardian2_relationship})` : form.guardian2_existing_id ? 'Existing account linked' : null],
                    ['Emergency Contact', form.emergency_name ? `${form.emergency_name} · ${form.emergency_phone || '—'}` : null],
                  ].filter(([, v]) => v),
                },
                {
                  step: 3, title: 'Health & SEN', icon: 'medical_services',
                  rows: [
                    ['Blood Group', form.blood_group],
                    ['Allergies', form.allergies],
                    ['Medical Conditions', form.medical_conditions],
                    ['IEP Active', form.sen_iep ? 'Yes' : null],
                    ['SEN Notes', form.sen_notes ? 'On file' : null],
                    ['Disciplinary History', form.disciplinary_history ? 'Yes — notes on file' : null],
                  ].filter(([, v]) => v),
                },
                {
                  step: 4, title: 'Documents', icon: 'folder_open',
                  rows: [
                    ['Birth Certificate', form.documents_birth_certificate ? 'Submitted' : null],
                    ['Passport Photo', form.documents_passport_photo ? 'Submitted' : null],
                    ['School Report', form.documents_previous_school_report ? 'Submitted' : null],
                    ['Transfer Letter', form.documents_transfer_letter ? 'Submitted' : null],
                    ['Medical Report', form.documents_medical_report ? 'Submitted' : null],
                    ['Other Docs', form.documents_other ? 'Submitted' : null],
                  ].filter(([, v]) => v),
                },
              ].map(section => (
                <div key={section.title} className="ska-card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: section.rows.length ? 12 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, background: 'var(--ska-primary-dim)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Ic name={section.icon} style={{ color: 'var(--ska-primary)', fontSize: 15 }} />
                      </div>
                      <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--ska-text)' }}>{section.title}</h4>
                    </div>
                    <button type="button" onClick={() => { setFormStep(section.step); scrollStepTop(); }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: '0.75rem', fontWeight: 600, color: 'var(--ska-primary)',
                        padding: '4px 8px', borderRadius: 6, transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--ska-primary-dim)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <Ic name="edit" style={{ fontSize: 14 }} /> Edit
                    </button>
                  </div>
                  {section.rows.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px 20px' }}>
                      {section.rows.map(([label, value]) => (
                        <div key={label}>
                          <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ska-text-3)' }}>{label}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ska-text)', wordBreak: 'break-word' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
                      Nothing entered —{' '}
                      <button type="button" onClick={() => { setFormStep(section.step); scrollStepTop(); }}
                        style={{ background: 'none', border: 'none', color: 'var(--ska-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>
                        go back to fill in
                      </button>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Step navigation footer ── */}
          <div className="ska-modal-actions" style={{ marginTop: 20 }}>
            {formStep > 0 ? (
              <button className="ska-btn ska-btn--ghost" onClick={handleStepBack}>
                <Ic name="arrow_back" size="sm" /> Back
              </button>
            ) : (
              <button className="ska-btn ska-btn--ghost" onClick={closeModal}>Cancel</button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', fontWeight: 600 }}>
                {formStep + 1} / {FORM_STEPS.length}
              </span>
              {formStep < FORM_STEPS.length - 1 ? (
                <button className="ska-btn ska-btn--primary" onClick={handleStepNext}>
                  Next <Ic name="arrow_forward" size="sm" />
                </button>
              ) : (
                <button className="ska-btn ska-btn--primary" onClick={handleSave} disabled={saving}>
                  <Ic name="how_to_reg" size="sm" />
                  {saving ? 'Saving…' : modal === 'add' ? 'Confirm & Register Student' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
