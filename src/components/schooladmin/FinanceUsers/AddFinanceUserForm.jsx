import React, { useState } from 'react';
import { FU_ROLES, FU_ROLE_KEYS, FU_PERMISSIONS, FU_SCOPE_OPTIONS } from './finance.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Smart, role-aware Add Finance User form.
 * Backend payload shape unchanged from the previous inline implementation —
 * keeps `record_payments`, `issue_receipts`, etc. perm keys.
 */
export default function AddFinanceUserForm({ existingEmails = [], saving, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '',
    role: 'Cashier',
    perms: FU_ROLES.Cashier.defaults,
    scope: [],
    limit: 500,
    hours_from: '08:00',
    hours_to:   '16:00',
  });
  const [showPass, setShowPass] = useState(false);
  const [touched, setTouched]   = useState({});

  const setRole = (role) =>
    setForm(f => ({
      ...f, role,
      perms: FU_ROLES[role].defaults,
      limit: role === 'Bursar' ? 5000 : role === 'Cashier' ? 500 : 0,
    }));

  const togglePerm  = (key) => setForm(f => ({ ...f,
    perms: f.perms.includes(key) ? f.perms.filter(p => p !== key) : [...f.perms, key],
  }));
  const toggleScope = (cls) => setForm(f => ({ ...f,
    scope: f.scope.includes(cls) ? f.scope.filter(c => c !== cls) : [...f.scope, cls],
  }));

  const emailLower = (form.email || '').trim().toLowerCase();
  const dupEmail   = emailLower && existingEmails.includes(emailLower);
  const emailErr   = touched.email && (!emailLower ? 'Email is required' : dupEmail ? 'Email already in use' : null);
  const passErr    = touched.password && (form.password.length < 8 ? 'Password must be at least 8 characters' : null);
  const nameErr    = touched.first_name && !form.first_name.trim() ? 'First name is required' : null;
  const valid      = !dupEmail && emailLower && form.password.length >= 8 && form.first_name.trim();

  const submit = (e) => {
    e.preventDefault();
    setTouched({ first_name: true, email: true, password: true });
    if (!valid) return;
    onSubmit({
      first_name: form.first_name.trim(),
      last_name:  form.last_name.trim(),
      email:      emailLower,
      phone:      form.phone.trim(),
      password:   form.password,
      role:       form.role,
      permissions: form.perms,
      scope:       form.scope,
      transaction_limit: form.limit,
      working_hours: `${form.hours_from} – ${form.hours_to}`,
    });
  };

  return (
    <div className="ska-card ska-card-pad fu-form">
      <div className="fu-form__head">
        <h3>
          <Ic name="person_add" size="sm" /> New Finance User
        </h3>
        <button type="button" className="ska-modal-close" onClick={onCancel} aria-label="Cancel">
          <Ic name="close" size="sm" />
        </button>
      </div>

      <form onSubmit={submit}>
        {/* Basic info */}
        <h4 className="fu-form__section-title">Basic Info</h4>
        <div className="fu-form__grid">
          <label className="ska-form-group">
            <span>First Name <em>*</em></span>
            <input className="ska-input" value={form.first_name}
              onBlur={() => setTouched(t => ({ ...t, first_name: true }))}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              placeholder="First name" />
            {nameErr && <small className="fu-form__err">{nameErr}</small>}
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
              placeholder="finance@school.com" />
            {emailErr && <small className="fu-form__err">{emailErr}</small>}
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
            {passErr && <small className="fu-form__err">{passErr}</small>}
          </label>
        </div>

        {/* Role assignment */}
        <h4 className="fu-form__section-title">Role Assignment</h4>
        <div className="fu-form__roles">
          {FU_ROLE_KEYS.map(rk => {
            const r = FU_ROLES[rk];
            const active = form.role === rk;
            return (
              <button type="button" key={rk}
                className={`fu-form__role ${active ? 'is-on' : ''}`}
                onClick={() => setRole(rk)}
                style={active
                  ? { borderColor: r.color, background: `${r.color}1a` }
                  : undefined}>
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

        {form.role === 'Bursar' && (
          <div className="fu-form__warn">
            <Ic name="security" size="sm" /> <strong>High privilege role selected.</strong> Bursars can approve refunds and manage all fees.
          </div>
        )}

        {/* Permissions checklist */}
        <h4 className="fu-form__section-title">
          Permissions <small>(auto-filled from role — editable)</small>
        </h4>
        <div className="fu-form__perm-check">
          {FU_PERMISSIONS.map(p => {
            const on = form.perms.includes(p.key);
            return (
              <label key={p.key} className={`fu-form__perm-item ${on ? 'is-on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => togglePerm(p.key)} />
                <Ic name={p.icon} size="sm" />
                <span>{p.label}</span>
              </label>
            );
          })}
        </div>

        {/* Scope */}
        <h4 className="fu-form__section-title">
          Assigned Scope <small>(classes this user can collect from)</small>
        </h4>
        <div className="fu-form__chips">
          {FU_SCOPE_OPTIONS.map(c => {
            const on = form.scope.includes(c);
            return (
              <button type="button" key={c}
                className={`fu-chip ${on ? 'fu-chip--on' : ''}`}
                onClick={() => toggleScope(c)}>
                {on && <Ic name="check" size="sm" />}{c}
              </button>
            );
          })}
        </div>

        {/* Limits + working hours */}
        <div className="fu-form__grid" style={{ marginTop: 16 }}>
          <label className="ska-form-group">
            <span>Max per Transaction (USD)</span>
            <input className="ska-input" type="number" min="0" step="50" value={form.limit}
              onChange={e => setForm(f => ({ ...f, limit: Number(e.target.value || 0) }))}
              placeholder="500" />
          </label>
          <label className="ska-form-group">
            <span>Working Hours (from)</span>
            <input className="ska-input" type="time" value={form.hours_from}
              onChange={e => setForm(f => ({ ...f, hours_from: e.target.value }))} />
          </label>
          <label className="ska-form-group">
            <span>Working Hours (to)</span>
            <input className="ska-input" type="time" value={form.hours_to}
              onChange={e => setForm(f => ({ ...f, hours_to: e.target.value }))} />
          </label>
        </div>

        <div className="fu-form__actions">
          <button type="button" className="ska-btn ska-btn--ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="ska-btn ska-btn--primary" disabled={saving || !valid}>
            <Ic name="person_add" size="sm" /> {saving ? 'Creating…' : 'Create Finance User'}
          </button>
        </div>
      </form>
    </div>
  );
}
