import React from 'react';
import { FU_ROLES, FU_PERMISSIONS, FU_RISK } from './finance.constants';
import { fmtUsd, fmtUsdCompact, fmtMinsCompact } from './finance.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/* ── Reusable role badge ───────────────────────────────────── */
export function FuRoleBadge({ role, size = 'md' }) {
  const r = FU_ROLES[role] || FU_ROLES.Cashier;
  const small = size === 'sm';
  return (
    <span className={`fu-role-badge ${small ? 'fu-role-badge--sm' : ''}`}
      style={{
        background: `${r.color}15`,
        color: r.color,
        borderColor: `${r.color}33`,
      }}>
      <Ic name={r.icon} size="sm" /> {r.label}
    </span>
  );
}

/* ── Risk pill ─────────────────────────────────────────────── */
export function FuRiskPill({ risk }) {
  const r = FU_RISK[risk] || FU_RISK.low;
  return (
    <span className={`fu-risk fu-risk--${risk}`}>
      <Ic name={r.icon} size="sm" /> {r.label}
    </span>
  );
}

/**
 * Banking-grade Finance User card.
 *
 *   Identity  →  Role / Risk  →  Permission Summary  →
 *   Today's Activity  →  Total Activity  →  Last Active  →
 *   Actions
 */
export default function FinanceUserCard({ u, onView, onEdit, onToggle }) {
  const r           = FU_ROLES[u.role] || FU_ROLES.Cashier;
  const allowed     = u.perms || [];
  const allowedList = FU_PERMISSIONS.filter(p => allowed.includes(p.key));
  const denied      = FU_PERMISSIONS.filter(p => !allowed.includes(p.key));
  const status      = u.is_active ? 'Active' : 'Suspended';
  const statusColor = u.is_active ? 'var(--ska-green)' : 'var(--ska-error)';
  const initials    = (u.full_name || u.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className={`fu-card ${u.risk === 'high' ? 'fu-card--at-risk' : ''}`}>
      {/* Top accent strip — color tracks role */}
      <div className="fu-card__accent" style={{ background: r.color }} />

      {/* A. Identity */}
      <div className="fu-card__head">
        <div className="fu-card__avatar"
          style={{ background: `${r.color}1a`, color: r.color, borderColor: `${r.color}40` }}>
          {initials}
        </div>
        <div className="fu-card__id">
          <strong className="fu-card__name" title={u.full_name}>{u.full_name || '—'}</strong>
          <span className="fu-card__email" title={u.email}>{u.email}</span>
        </div>
        <span className="fu-card__status-dot"
          style={{ background: statusColor, boxShadow: `0 0 0 4px ${statusColor}25` }}
          title={status} />
      </div>

      {/* B. Role + Risk */}
      <div className="fu-card__rolebar">
        <FuRoleBadge role={u.role} />
        <FuRiskPill risk={u.risk} />
      </div>

      {/* C. Permission summary — tick / cross */}
      <div className="fu-card__perms">
        {allowedList.slice(0, 3).map(p => (
          <span key={p.key} className="fu-perm fu-perm--on">
            <Ic name="check" size="sm" /> {p.label}
          </span>
        ))}
        {denied.slice(0, 1).map(p => (
          <span key={p.key} className="fu-perm fu-perm--off">
            <Ic name="close" size="sm" /> {p.label}
          </span>
        ))}
        {allowedList.length > 3 && (
          <span className="fu-perm fu-perm--more">+{allowedList.length - 3}</span>
        )}
      </div>

      {/* D. Today's Financial Activity (the headline KPI block) */}
      <div className="fu-card__kpi">
        <div className="fu-card__kpi-main">
          <span className="fu-card__kpi-label">Today</span>
          <strong className="fu-card__kpi-amount">{fmtUsd(u.txAmount)}</strong>
          <span className="fu-card__kpi-tx">{u.txToday} transaction{u.txToday !== 1 ? 's' : ''}</span>
        </div>
        <div className="fu-card__kpi-side">
          <div>
            <span>Total handled</span>
            <strong>{fmtUsdCompact(u.txTotal)}</strong>
          </div>
          <div>
            <span>Last active</span>
            <strong>{fmtMinsCompact(u.lastMins)}</strong>
          </div>
        </div>
      </div>

      {/* Inline alert if flagged */}
      {(u.flagged || u.highVol) && (
        <div className="fu-card__alert">
          <Ic name="warning" size="sm" />
          {u.flagged ? 'Suspicious activity flagged' : 'High transaction volume'}
        </div>
      )}

      {/* G. Actions */}
      <div className="fu-card__actions">
        <button className="ska-btn ska-btn--sm ska-btn--ghost" onClick={() => onView(u)}>
          <Ic name="visibility" size="sm" /> View
        </button>
        <button className="ska-btn ska-btn--sm ska-btn--ghost" onClick={() => onEdit(u)}>
          <Ic name="manage_accounts" size="sm" /> Edit Role
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
