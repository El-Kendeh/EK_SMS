import React from 'react';
import { FU_ROLES, FU_PERMISSIONS } from './finance.constants';
import { fmtUsd, fmtUsdCompact, fmtMins } from './finance.utils';
import { FuRoleBadge, FuRiskPill } from './FinanceUserCard';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Full-detail modal for a finance user. Reuses the role badge + risk pill
 * from the card so visual identity stays consistent.
 */
export default function FinanceUserDetails({ u, onClose, onEdit, onToggle }) {
  const r = FU_ROLES[u.role] || FU_ROLES.Cashier;
  const initials = (u.full_name || u.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal ska-modal--wide fu-detail" onClick={e => e.stopPropagation()}>
        <div className="ska-modal-head fu-detail__head">
          <div className="fu-detail__head-id">
            <div className="fu-card__avatar fu-detail__avatar"
              style={{ background: `${r.color}1a`, color: r.color, borderColor: `${r.color}40` }}>
              {initials}
            </div>
            <div className="fu-detail__head-text">
              <h3 className="ska-modal-title">{u.full_name || '—'}</h3>
              <div className="fu-detail__head-meta">
                <FuRoleBadge role={u.role} size="sm" />
                <FuRiskPill risk={u.risk} />
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: u.is_active ? 'var(--ska-green)' : 'var(--ska-error)',
                }}>
                  ● {u.is_active ? 'Active' : 'Suspended'}
                </span>
              </div>
            </div>
          </div>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>

        <div className="ska-modal-body fu-detail__body">

          {(u.flagged || u.highVol) && (
            <div className={`fu-alert ${u.flagged ? 'fu-alert--critical' : 'fu-alert--warning'}`}>
              <Ic name="warning" />
              <div className="fu-alert__body">
                <strong>{u.flagged ? 'Unusual transaction detected' : 'High transaction volume'}</strong>
                <p>Review this user's recent activity for irregularities.</p>
              </div>
            </div>
          )}

          {/* Profile */}
          <h4 className="fu-detail__section-title">Profile</h4>
          <div className="fu-detail__kv">
            <div><span>Email</span><strong>{u.email || '—'}</strong></div>
            <div><span>Phone</span><strong>{u.phone || '—'}</strong></div>
            <div><span>Role</span><strong>{r.label} · {r.sub}</strong></div>
            <div><span>Status</span>
              <strong style={{ color: u.is_active ? 'var(--ska-green)' : 'var(--ska-error)' }}>
                {u.is_active ? 'Active' : 'Suspended'}
              </strong>
            </div>
            <div><span>Working Hours</span><strong>{u.hours}</strong></div>
            <div><span>Tx Limit</span>
              <strong>{u.limit ? `${fmtUsd(u.limit)} / tx` : '—'}</strong>
            </div>
          </div>

          {/* Permissions */}
          <h4 className="fu-detail__section-title">Permissions</h4>
          <div className="fu-detail__perm-grid">
            {FU_PERMISSIONS.map(p => {
              const on = u.perms.includes(p.key);
              return (
                <div key={p.key} className={`fu-detail__perm-row ${on ? 'is-on' : 'is-off'}`}>
                  <Ic name={on ? 'check_circle' : 'cancel'} size="sm" />
                  <span>{p.label}</span>
                </div>
              );
            })}
          </div>

          {/* Scope */}
          <h4 className="fu-detail__section-title">Assigned Scope</h4>
          <div className="fu-detail__chips">
            {u.scope.map(s => <span key={s} className="fu-chip">{s}</span>)}
          </div>

          {/* Transaction summary */}
          <h4 className="fu-detail__section-title">Transaction Summary</h4>
          <div className="fu-detail__summary">
            <div>
              <span>Today</span>
              <strong>{u.txToday} tx</strong>
            </div>
            <div>
              <span>Today's Volume</span>
              <strong>{fmtUsd(u.txAmount)}</strong>
            </div>
            <div>
              <span>Total Handled</span>
              <strong>{fmtUsdCompact(u.txTotal)}</strong>
            </div>
            <div>
              <span>Last Active</span>
              <strong>{fmtMins(u.lastMins)}</strong>
            </div>
          </div>

          {/* Activity log */}
          <h4 className="fu-detail__section-title">Recent Activity</h4>
          <ul className="fu-detail__activity">
            {u.activity.map((a, i) => (
              <li key={i}>
                <span className={`fu-detail__activity-dot fu-detail__activity-dot--${a.kind}`} />
                <div>
                  <p>{a.text}</p>
                  <span>{a.at}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="ska-modal-actions">
            <button className="ska-btn ska-btn--ghost" onClick={onClose}>Close</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ska-btn ska-btn--ghost" onClick={() => onEdit(u)}>
                <Ic name="edit" size="sm" /> Edit Role
              </button>
              <button
                className={`ska-btn ${u.is_active ? 'ska-btn--danger' : 'ska-btn--approve'}`}
                onClick={() => onToggle(u)}>
                <Ic name={u.is_active ? 'block' : 'check_circle'} size="sm" />
                {u.is_active ? 'Suspend User' : 'Activate User'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
