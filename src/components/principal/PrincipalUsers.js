import React, { useState, useEffect, useCallback } from 'react';
import { principalApi } from '../../api/adminApi';
import { PU_ROLE_KEYS, PU_ACCESS_LEVELS, PU_STATUS_OPTIONS } from '../schooladmin/Principal/principal.constants';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './GradeApprovals.css';
import './PrincipalUsers.css';

const Ic = ({ name, size }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true">{name}</span>
);

const ACCESS_LEVEL_KEYS = Object.keys(PU_ACCESS_LEVELS);

const EMPTY_FORM = {
  full_name: '', email: '', phone: '', username: '', password: '',
  role: PU_ROLE_KEYS[0], access_level: ACCESS_LEVEL_KEYS[0],
};

export default function PrincipalUsers({ schoolId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null); // null = add mode, user object = edit mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [toggleId, setToggleId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    principalApi.getPrincipalUsers()
      .then(res => {
        if (res?.success === false) { setError(res.message || 'Failed to load leadership team'); return; }
        setUsers(res.principal_users || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const filtered = users.filter(u => {
    if (statusFilter === 'active' && !u.is_active) return false;
    if (statusFilter === 'suspended' && u.is_active) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    return true;
  });

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const openAddForm = () => {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setEditUser(user);
    setForm({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      username: user.username || '',
      password: '',
      role: user.role || PU_ROLE_KEYS[0],
      access_level: user.access_level || ACCESS_LEVEL_KEYS[0],
    });
    setFormError(null);
    setShowForm(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      setFormError('Full name and email are required');
      return;
    }
    setSubmitLoading(true);
    setFormError(null);
    try {
      let res;
      if (editUser) {
        res = await principalApi.updatePrincipalUser(editUser.id, {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          role: form.role,
          access_level: form.access_level,
        });
      } else {
        const payload = {
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          username: form.username.trim() || form.email.trim(),
          role: form.role,
          access_level: form.access_level,
        };
        if (form.password.trim()) payload.password = form.password.trim();
        res = await principalApi.createPrincipalUser(payload);
      }

      if (res?.success === false) {
        setFormError(res.message || `Failed to ${editUser ? 'update' : 'add'} leadership member`);
      } else {
        setFeedback({ type: 'success', msg: res.message || `Leadership member ${editUser ? 'updated' : 'added'}` });
        setShowForm(false);
        setEditUser(null);
        load();
      }
    } catch (err) {
      setFormError(err.message || `Failed to ${editUser ? 'update' : 'add'} leadership member`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleActive = async (user) => {
    setToggleId(user.id);
    try {
      const res = await principalApi.updatePrincipalUser(user.id, {});
      if (res?.success === false) {
        setFeedback({ type: 'error', msg: res.message || 'Failed to update status' });
      } else {
        setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, is_active: !u.is_active } : u)));
        setFeedback({ type: 'success', msg: res.message || 'Status updated' });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to update status' });
    } finally {
      setToggleId(null);
    }
  };

  return (
    <div className="pu-page pru-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Leadership Team</h1>
          <p className="ska-page-sub">Manage principal &amp; vice-principal accounts for your school</p>
        </div>
        <button type="button" className="ga-btn ga-btn--primary" onClick={openAddForm}>
          <Ic name="person_add" size="sm" /> Add Member
        </button>
      </div>

      {feedback && (
        <div className={`ga-banner ga-banner--${feedback.type}`}>
          <Ic name={feedback.type === 'success' ? 'check_circle' : 'error'} size="sm" />
          {feedback.msg}
        </div>
      )}

      <div className="pru-filters">
        <div className="pu-chips">
          {PU_STATUS_OPTIONS.map(opt => (
            <button key={opt.key} type="button"
              className={`pu-chip${statusFilter === opt.key ? ' pu-chip--on' : ''}${opt.key === 'all' ? ' pu-chip--all' : ''}`}
              onClick={() => setStatusFilter(opt.key)}>
              {opt.label}
            </button>
          ))}
        </div>
        <select className="ga-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {PU_ROLE_KEYS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="ga-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ga-modal pru-modal" onClick={e => e.stopPropagation()}>
            <h3>{editUser ? `Edit — ${editUser.full_name}` : 'Add Leadership Member'}</h3>
            <form className="pru-form" onSubmit={submitForm}>
              {formError && <div className="ga-banner ga-banner--error"><Ic name="error" size="sm" />{formError}</div>}

              <label className="pru-field">
                <span>Full Name *</span>
                <input className="pru-input" type="text" value={form.full_name} onChange={e => updateForm('full_name', e.target.value)} required />
              </label>

              <label className="pru-field">
                <span>Email *</span>
                <input className="pru-input" type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} required />
              </label>

              <div className="pru-field-row">
                <label className="pru-field">
                  <span>Phone</span>
                  <input className="pru-input" type="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)} />
                </label>
                {!editUser && (
                  <label className="pru-field">
                    <span>Username</span>
                    <input className="pru-input" type="text" value={form.username} onChange={e => updateForm('username', e.target.value)} placeholder="defaults to email" />
                  </label>
                )}
              </div>

              <div className="pru-field-row">
                <label className="pru-field">
                  <span>Role</span>
                  <select className="ga-select pru-input" value={form.role} onChange={e => updateForm('role', e.target.value)}>
                    {PU_ROLE_KEYS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="pru-field">
                  <span>Access Level</span>
                  <select className="ga-select pru-input" value={form.access_level} onChange={e => updateForm('access_level', e.target.value)}>
                    {ACCESS_LEVEL_KEYS.map(a => <option key={a} value={a}>{PU_ACCESS_LEVELS[a].label}</option>)}
                  </select>
                </label>
              </div>

              {!editUser && (
                <label className="pru-field">
                  <span>Temporary Password</span>
                  <input className="pru-input" type="text" value={form.password} onChange={e => updateForm('password', e.target.value)} placeholder="defaults to Principal@123" />
                </label>
              )}

              <div className="ga-modal__actions">
                <button type="button" className="ga-btn ga-btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="ga-btn ga-btn--primary" disabled={submitLoading}>
                  {submitLoading
                    ? (editUser ? 'Saving…' : 'Adding…')
                    : (editUser ? 'Save Changes' : 'Add Member')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="pu-empty">
          <Ic name="error" size="xl" />
          <p className="pu-empty__title">Couldn't load leadership team</p>
          <p className="pu-empty__desc">{error}</p>
        </div>
      )}

      {!error && loading && (
        <div className="pu-empty">
          <Ic name="hourglass_empty" size="xl" />
          <p className="pu-empty__title">Loading…</p>
        </div>
      )}

      {!error && !loading && filtered.length === 0 && (
        <div className="pu-empty">
          <Ic name="group" size="xl" />
          <p className="pu-empty__title">No leadership members found</p>
          <p className="pu-empty__desc">Adjust the filters or add a new member.</p>
        </div>
      )}

      {!error && !loading && filtered.length > 0 && (
        <div className="pru-grid">
          {filtered.map(u => (
            <div key={u.id} className="pru-card">
              <div className="pru-card__avatar">
                <Ic name="account_circle" size="xl" />
              </div>
              <div className="pru-card__body">
                <div className="pru-card__head">
                  <strong>{u.full_name}</strong>
                  <span className={`ga-badge ${u.is_active ? 'ga-badge--approved' : 'ga-badge--rejected'}`}>
                    {u.is_active ? 'Active' : 'Suspended'}
                  </span>
                </div>
                <span className="pru-card__role">{u.role} · {u.access_level} Access</span>
                <span className="pru-card__contact"><Ic name="mail" size="sm" /> {u.email || '—'}</span>
                {u.phone && <span className="pru-card__contact"><Ic name="call" size="sm" /> {u.phone}</span>}
                <span className="pru-card__contact"><Ic name="badge" size="sm" /> {u.username}</span>
              </div>
              <div className="pru-card__actions">
                <button type="button" className="ga-btn ga-btn--ghost" onClick={() => openEditForm(u)}>
                  <Ic name="edit" size="sm" />
                  Edit
                </button>
                <button type="button" className={`ga-btn ${u.is_active ? 'ga-btn--reject' : 'ga-btn--approve'}`}
                  disabled={toggleId === u.id} onClick={() => toggleActive(u)}>
                  <Ic name={u.is_active ? 'block' : 'check_circle'} size="sm" />
                  {u.is_active ? 'Suspend' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
