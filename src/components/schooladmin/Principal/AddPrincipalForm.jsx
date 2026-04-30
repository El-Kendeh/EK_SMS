import React, { useState } from 'react';
import {
  PU_ROLES, PU_ROLE_KEYS, PU_ACCESS_LEVELS, PU_PERMISSIONS,
  PU_NOTIFICATIONS, PU_PERMS_BY_ACCESS, PU_SCOPE_OPTIONS,
} from './principal.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Smart, role/access-aware Add Principal form. Backend payload shape is
 * unchanged from the previous inline implementation.
 */
export default function AddPrincipalForm({ existingEmails = [], onSubmit, onCancel, saving }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '',
    role: 'Principal',
    access: 'Full',
    perms: PU_PERMS_BY_ACCESS.Full,
    scope: ['Entire School'],
    notifs: ['grade_alerts','attendance_alerts','finance_alerts'],
  });
  const [showPass, setShowPass] = useState(false);
  const [touched, setTouched]   = useState({});

  const setRole = (role) => {
    const access = role === 'Principal' ? 'Full' : 'Restricted';
    setForm(f => ({
      ...f, role, access,
      perms: PU_PERMS_BY_ACCESS[access],
      scope: role === 'Principal' ? ['Entire School'] : [],
    }));
  };
  const setAccess   = (access) => setForm(f => ({ ...f, access, perms: PU_PERMS_BY_ACCESS[access] }));
  const togglePerm  = (key)    => setForm(f => ({ ...f, perms: f.perms.includes(key) ? f.perms.filter(k => k !== key) : [...f.perms, key] }));
  const toggleNotif = (key)    => setForm(f => ({ ...f, notifs: f.notifs.includes(key) ? f.notifs.filter(k => k !== key) : [...f.notifs, key] }));
  const toggleScope = (cls)    => setForm(f => {
    const isEntire = cls === 'Entire School';
    const has = f.scope.includes(cls);
    let next;
    if (isEntire) next = has ? [] : ['Entire School'];
    else          next = has ? f.scope.filter(c => c !== cls) : [...f.scope.filter(c => c !== 'Entire School'), cls];
    return { ...f, scope: next };
  });

  const emailLower = (form.email || '').trim().toLowerCase();
  const dupEmail   = emailLower && existingEmails.includes(emailLower);
  const emailErr   = touched.email && (!emailLower ? 'Email is required' : dupEmail ? 'Email already in use' : null);
  const passErr    = touched.password && (form.password.length < 8 ? 'Password must be at least 8 characters' : null);
  const nameErr    = touched.first_name && !form.first_name.trim() ? 'First name is required' : null;
  const valid      = !dupEmail && emailLower && form.password.length >= 8 && form.first_name.trim();

  const submit = e => {
    e.preventDefault();
    setTouched({ first_name: true, email: true, password: true });
    if (!valid) return;
    onSubmit({
      first_name: form.first_name.trim(),
      last_name:  form.last_name.trim(),
      email:      emailLower,
      phone:      form.phone.trim(),
      password:   form.password,
      role:           form.role,
      access_level:   form.access,
      permissions:    form.perms,
      scope:          form.scope,
      notifications:  form.notifs,
    });
  };

  return (
    <div className="ska-card ska-card-pad pu-form">
      <div className="pu-form__head">
        <h3>
          <Ic name="person_add" size="sm" /> New Principal
        </h3>
        <button type="button" className="ska-modal-close" onClick={onCancel} aria-label="Cancel">
          <Ic name="close" size="sm" />
        </button>
      </div>

      <form onSubmit={submit}>
        <h4 className="pu-form__sec-title">Basic Info</h4>
        <div className="pu-form__grid">
          <label className="ska-form-group">
            <span>First Name <em>*</em></span>
            <input className="ska-input" value={form.first_name}
              onBlur={() => setTouched(t => ({ ...t, first_name: true }))}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              placeholder="First name" />
            {nameErr && <small className="pu-form__err">{nameErr}</small>}
          </label>
          <label className="ska-form-group">
            <span>Last Name</span>
            <input className="ska-input" value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              placeholder="Last name" />
          </label>
          <label className="ska-form-group">
            <span>Email <em>*</em></span>
            <input className="ska-input" type="email" value={form.email}
              onBlur={() => setTouched(t => ({ ...t, email: true }))}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="principal@school.com" />
            {emailErr && <small className="pu-form__err">{emailErr}</small>}
          </label>
          <label className="ska-form-group">
            <span>Phone</span>
            <input className="ska-input" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+xxx-xxx-xxxx" />
          </label>
          <label className="ska-form-group" style={{ gridColumn: '1 / -1' }}>
            <span>Password <em>*</em></span>
            <div style={{ position: 'relative' }}>
              <input className="ska-input" type={showPass ? 'text' : 'password'}
                value={form.password}
                onBlur={() => setTouched(t => ({ ...t, password: true }))}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
                style={{ paddingRight: 44 }} />
              <button type="button"
                onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--ska-text-3)', padding: 0, lineHeight: 1,
                }}>
                <Ic name={showPass ? 'visibility_off' : 'visibility'} size="sm" />
              </button>
            </div>
            {passErr && <small className="pu-form__err">{passErr}</small>}
          </label>
        </div>

        {/* Role type */}
        <h4 className="pu-form__sec-title">Role Type</h4>
        <div className="pu-form__roles">
          {PU_ROLE_KEYS.map(rk => {
            const r = PU_ROLES[rk];
            const active = form.role === rk;
            return (
              <button type="button" key={rk}
                className={`pu-form__role ${active ? 'is-on' : ''}`}
                onClick={() => setRole(rk)}
                style={active ? { borderColor: r.color, background: `${r.color}1a` } : undefined}>
                <Ic name={r.icon} style={{ color: r.color, fontSize: 22 }} />
                <div>
                  <strong>{r.label}</strong>
                  <span>{r.sub}</span>
                </div>
                {active && <Ic name="check_circle" size="sm" style={{ color: r.color, marginLeft: 'auto' }} />}
              </button>
            );
          })}
        </div>

        {/* Access level */}
        <h4 className="pu-form__sec-title">Access Level</h4>
        <div className="pu-form__access">
          {Object.keys(PU_ACCESS_LEVELS).map(ak => {
            const a = PU_ACCESS_LEVELS[ak];
            const active = form.access === ak;
            return (
              <button type="button" key={ak}
                className={`pu-form__access-pill ${active ? 'is-on' : ''}`}
                onClick={() => setAccess(ak)}
                style={active ? { borderColor: a.color, background: `${a.color}1a`, color: a.color } : undefined}>
                {active && <Ic name="check" size="sm" />}
                <strong>{a.label}</strong>
                <small>{a.sub}</small>
              </button>
            );
          })}
        </div>
        {form.access === 'Full' && (
          <div className="pu-form__warn">
            <Ic name="security" size="sm" /> <strong>This account has full system control.</strong> Grant only to verified leadership staff.
          </div>
        )}

        {/* Permissions */}
        <h4 className="pu-form__sec-title">
          Permissions <small>(auto-filled from access level — editable)</small>
        </h4>
        <div className="pu-form__perm-check">
          {PU_PERMISSIONS.map(p => {
            const on = form.perms.includes(p.key);
            return (
              <label key={p.key} className={`pu-form__perm-item ${on ? 'is-on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => togglePerm(p.key)} />
                <Ic name={p.icon} size="sm" />
                <span>{p.label}</span>
              </label>
            );
          })}
        </div>

        {/* Scope */}
        <h4 className="pu-form__sec-title">Scope Assignment</h4>
        <div className="pu-form__chips">
          {['Entire School', ...PU_SCOPE_OPTIONS].map(c => {
            const on = form.scope.includes(c);
            return (
              <button type="button" key={c}
                className={`pu-chip ${on ? 'pu-chip--on' : ''} ${c === 'Entire School' ? 'pu-chip--all' : ''}`}
                onClick={() => toggleScope(c)}>
                {on && <Ic name="check" size="sm" />}{c}
              </button>
            );
          })}
        </div>

        {/* Notifications */}
        <h4 className="pu-form__sec-title">Notification Preferences</h4>
        <div className="pu-form__perm-check">
          {PU_NOTIFICATIONS.map(n => {
            const on = form.notifs.includes(n.key);
            return (
              <label key={n.key} className={`pu-form__perm-item ${on ? 'is-on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => toggleNotif(n.key)} />
                <Ic name={n.icon} size="sm" />
                <span>{n.label}</span>
              </label>
            );
          })}
        </div>

        <div className="pu-form__actions">
          <button type="button" className="ska-btn ska-btn--ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="ska-btn ska-btn--primary" disabled={saving || !valid}>
            <Ic name="person_add" size="sm" /> {saving ? 'Creating…' : 'Create Principal'}
          </button>
        </div>
      </form>
    </div>
  );
}
