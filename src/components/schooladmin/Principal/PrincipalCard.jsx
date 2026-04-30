import React from 'react';
import { PU_ROLES, PU_FINANCE_STYLE } from './principal.constants';
import { fmtMins } from './principal.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/* ── Reusable role badge ───────────────────────────────────── */
export function PuRoleBadge({ role, size = 'md' }) {
  const r = PU_ROLES[role] || PU_ROLES.Principal;
  const small = size === 'sm';
  return (
    <span className={`pu-role-badge ${small ? 'pu-role-badge--sm' : ''}`}
      style={{
        background: `${r.color}15`,
        color: r.color,
        borderColor: `${r.color}33`,
      }}>
      <Ic name={r.icon} size="sm" /> {r.label}
    </span>
  );
}

/**
 * Per-principal card — identity, role, scope, school snapshot,
 * academic / attendance / finance metrics, last login, actions.
 */
export default function PrincipalCard({ u, onView, onEdit, onToggle }) {
  const r           = PU_ROLES[u.role] || PU_ROLES.Principal;
  const fs          = PU_FINANCE_STYLE[u.finance] || PU_FINANCE_STYLE.Stable;
  const statusColor = u.is_active ? 'var(--ska-green)' : 'var(--ska-error)';
  const initials    = (u.full_name || u.email || '?').trim().charAt(0).toUpperCase();
  const academicC   = u.academic >= 80 ? 'var(--ska-green)' : u.academic >= 65 ? 'var(--ska-tertiary)' : 'var(--ska-error)';
  const attendC     = u.attendance >= 90 ? 'var(--ska-green)' : u.attendance >= 80 ? 'var(--ska-tertiary)' : 'var(--ska-error)';

  return (
    <div className="pu-staff">
      <div className="pu-staff__accent" style={{ background: r.color }} />

      <div className="pu-staff__head">
        <div className="pu-staff__avatar"
          style={{ background: `${r.color}1a`, color: r.color, borderColor: `${r.color}40` }}>
          {initials}
        </div>
        <div className="pu-staff__id">
          <strong className="pu-staff__name" title={u.full_name}>{u.full_name || '—'}</strong>
          <span className="pu-staff__email" title={u.email}>{u.email}</span>
        </div>
        <span className="pu-staff__status-dot"
          style={{ background: statusColor, boxShadow: `0 0 0 4px ${statusColor}25` }}
          title={u.is_active ? 'Active' : 'Suspended'} />
      </div>

      <div className="pu-staff__rolebar">
        <PuRoleBadge role={u.role} />
        <span className="pu-staff__rolesub">{r.sub}</span>
      </div>

      <div className="pu-staff__scope">
        <Ic name="account_tree" size="sm" />
        <span>Manages: <strong>{u.scope.length === 1
          ? u.scope[0]
          : u.scope.length === 6 ? 'Entire School' : u.scope.join(', ')}</strong></span>
      </div>

      <div className="pu-staff__snapshot">
        <div><Ic name="groups" /><strong>{u.totalStudents}</strong><span>Students</span></div>
        <div><Ic name="school" /><strong>{u.totalTeachers}</strong><span>Teachers</span></div>
        <div><Ic name="meeting_room" /><strong>{u.totalClasses}</strong><span>Classes</span></div>
      </div>

      <div className="pu-staff__metrics">
        <div>
          <span className="pu-staff__metric-lbl">Academic</span>
          <div className="pu-progress">
            <div style={{ width: `${u.academic}%`, background: academicC }} />
          </div>
          <strong>{u.academic}%</strong>
        </div>
        <div>
          <span className="pu-staff__metric-lbl">Attendance</span>
          <div className="pu-progress">
            <div style={{ width: `${u.attendance}%`, background: attendC }} />
          </div>
          <strong>{u.attendance}%</strong>
        </div>
        <div className="pu-staff__finance"
          style={{ background: fs.bg, color: fs.color }}>
          <Ic name="payments" size="sm" />
          <span>Finance: <strong>{u.finance}</strong></span>
        </div>
      </div>

      <div className="pu-staff__last">
        <Ic name="schedule" size="sm" /> Last login: {fmtMins(u.lastMins)}
      </div>

      <div className="pu-staff__actions">
        <button className="ska-btn ska-btn--sm ska-btn--ghost" onClick={() => onView(u)}>
          <Ic name="dashboard" size="sm" /> Dashboard
        </button>
        <button className="ska-btn ska-btn--sm ska-btn--ghost" onClick={() => onEdit(u)}>
          <Ic name="edit" size="sm" /> Edit
        </button>
        <button
          className={`ska-btn ska-btn--sm ${u.is_active ? 'ska-btn--danger' : 'ska-btn--approve'}`}
          onClick={() => onToggle(u)}>
          <Ic name={u.is_active ? 'block' : 'check_circle'} size="sm" />
          {u.is_active ? 'Suspend' : 'Activate'}
        </button>
      </div>
    </div>
  );
}
