import React, { useState, useEffect, useCallback } from 'react';
import financeApi from '../../api/financeApi';
import { fmtDate, initials } from './bursar.utils';

import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './Bursar.css';
import './FinanceTeam.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const TEAM_ROLES = ['Bursar', 'Finance Officer', 'Accounts Clerk'];
const ACCESS_LEVELS = [
  { value: 'Full',     label: 'Full Access' },
  { value: 'ReadOnly', label: 'Read Only' },
];

/* ── Add finance user modal ───────────────────────────────── */
function AddUserModal({ onClose, onSuccess }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Bursar');
  const [accessLevel, setAccessLevel] = useState('Full');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = fullName.trim() && email.trim() && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await financeApi.createFinanceUser({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        username: username.trim() || email.trim(),
        password: password.trim() || undefined,
        role,
        accessLevel,
      });
      if (res?.success === false) throw new Error(res.message || 'Failed to create finance user');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create finance user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal ska-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="ska-modal-head">
          <h3 className="ska-modal-title">Add Finance User</h3>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>
        <div className="ska-modal-body">
          <form className="bur-modal-form" onSubmit={handleSubmit}>
            {error && <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{error}</div>}

            <label className="bur-field">
              <span>Full Name *</span>
              <input className="bur-input" type="text" required autoFocus
                value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>

            <div className="bur-field-row">
              <label className="bur-field">
                <span>Email *</span>
                <input className="bur-input" type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="bur-field">
                <span>Phone</span>
                <input className="bur-input" type="tel"
                  value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
            </div>

            <div className="bur-field-row">
              <label className="bur-field">
                <span>Username</span>
                <input className="bur-input" type="text" placeholder="defaults to email"
                  value={username} onChange={(e) => setUsername(e.target.value)} />
              </label>
              <label className="bur-field">
                <span>Temporary Password</span>
                <input className="bur-input" type="text" placeholder="defaults to Finance@123"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            </div>

            <div className="bur-field-row">
              <label className="bur-field">
                <span>Role</span>
                <select className="bur-input" value={role} onChange={(e) => setRole(e.target.value)}>
                  {TEAM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="bur-field">
                <span>Access Level</span>
                <select className="bur-input" value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)}>
                  {ACCESS_LEVELS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </label>
            </div>

            <span className="bur-field-hint">
              The new user signs in with the finance portal role and should change their password on first login.
            </span>

            <div className="bur-modal__actions">
              <button type="button" className="ska-btn ska-btn--ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="ska-btn ska-btn--primary" disabled={!canSubmit}>
                {submitting ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function FinanceTeam() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);  // user object

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    financeApi.getFinanceUsers()
      .then((res) => setUsers(res.finance_users || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!banner) return undefined;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  const doToggle = async (user) => {
    setTogglingId(user.id);
    setError(null);
    try {
      const res = await financeApi.toggleFinanceUser(user.id);
      if (res?.success === false) throw new Error(res.message || 'Failed to update status');
      setBanner(`${user.full_name || 'User'} ${user.is_active ? 'suspended' : 'activated'}`);
      load();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setTogglingId(null);
      setConfirmToggle(null);
    }
  };

  return (
    <div className="pu-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Finance Team</h1>
          <p className="ska-page-sub">Finance office accounts with access to this school's money workflows</p>
        </div>
        <div className="bur-head-actions">
          <button className="ska-btn ska-btn--primary" onClick={() => setAddOpen(true)}>
            <Ic name="person_add" size="sm" /> Add Finance User
          </button>
        </div>
      </div>

      {banner && <div className="bur-banner bur-banner--success"><Ic name="check_circle" size="sm" />{banner}</div>}
      {error && <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{error}</div>}

      {loading ? (
        <div className="pu-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="pu-card" key={i}>
              <div className="bur-skel" style={{ width: '55%' }} />
              <div className="bur-skel" style={{ width: '70%' }} />
              <div className="bur-skel" style={{ width: '40%' }} />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="pu-empty pu-empty--cta">
          <div className="pu-empty__icon-wrap"><Ic name="group" /></div>
          <p className="pu-empty__title">No finance users yet</p>
          <p className="pu-empty__desc">
            Add bursars, finance officers, or accounts clerks so your team can record payments and expenses.
          </p>
          <button className="ska-btn ska-btn--primary" onClick={() => setAddOpen(true)}>
            <Ic name="person_add" size="sm" /> Add Finance User
          </button>
        </div>
      ) : (
        <div className="pu-grid">
          {users.map((u) => {
            const active = u.is_active !== false;
            return (
              <div className="pu-card burt-card" key={u.id}>
                <div className="burt-card__head">
                  <div className="burt-card__avatar">{initials(u.full_name)}</div>
                  <div className="burt-card__id">
                    <strong className="burt-card__name">{u.full_name || u.username || '—'}</strong>
                    <span className="burt-card__email">{u.email || '—'}</span>
                  </div>
                  <span className={`burt-card__dot${active ? ' is-active' : ''}`}
                    title={active ? 'Active' : 'Suspended'} />
                </div>

                <div className="burt-card__badges">
                  <span className="ska-badge ska-badge--primary">{u.role || 'Bursar'}</span>
                  <span className="ska-badge ska-badge--cyan">
                    {u.access_level === 'ReadOnly' ? 'Read Only' : `${u.access_level || 'Full'} Access`}
                  </span>
                  <span className={`ska-badge ska-badge--${active ? 'active' : 'inactive'}`}>
                    {active ? 'Active' : 'Suspended'}
                  </span>
                </div>

                <div className="burt-card__meta">
                  {u.phone && <span><Ic name="call" size="sm" /> {u.phone}</span>}
                  {u.username && <span><Ic name="badge" size="sm" /> {u.username}</span>}
                  <span><Ic name="event" size="sm" /> Added {fmtDate(u.created_at)}</span>
                </div>

                <div className="burt-card__actions">
                  <button
                    className={`ska-btn ska-btn--sm ${active ? 'ska-btn--danger' : 'ska-btn--approve'}`}
                    disabled={togglingId === u.id}
                    onClick={() => setConfirmToggle(u)}>
                    <Ic name={active ? 'block' : 'how_to_reg'} size="sm" />
                    {togglingId === u.id ? 'Updating…' : active ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addOpen && (
        <AddUserModal
          onClose={() => setAddOpen(false)}
          onSuccess={() => { setBanner('Finance user created'); load(); }}
        />
      )}

      {confirmToggle && (
        <div className="ska-modal-overlay" onClick={() => setConfirmToggle(null)}>
          <div className="ska-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ska-modal-head">
              <h3 className="ska-modal-title">
                {confirmToggle.is_active !== false ? 'Suspend' : 'Activate'} {confirmToggle.full_name || 'user'}?
              </h3>
              <button className="ska-modal-close" onClick={() => setConfirmToggle(null)} aria-label="Close">
                <Ic name="close" size="sm" />
              </button>
            </div>
            <div className="ska-modal-body">
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ska-text-2)' }}>
                {confirmToggle.is_active !== false
                  ? 'They will lose access to the finance portal until reactivated.'
                  : 'They will regain access to the finance portal.'}
              </p>
              <div className="bur-modal__actions">
                <button className="ska-btn ska-btn--ghost" onClick={() => setConfirmToggle(null)}>Cancel</button>
                <button
                  className={`ska-btn ${confirmToggle.is_active !== false ? 'ska-btn--danger' : 'ska-btn--approve'}`}
                  disabled={togglingId === confirmToggle.id}
                  onClick={() => doToggle(confirmToggle)}>
                  {confirmToggle.is_active !== false ? 'Suspend' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
