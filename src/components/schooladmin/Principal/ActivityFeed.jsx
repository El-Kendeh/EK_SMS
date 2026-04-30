import React from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const KIND_META = {
  grade:      { icon: 'grade',          color: 'var(--ska-primary)'   },
  payment:    { icon: 'payments',       color: 'var(--ska-green)'     },
  request:    { icon: 'edit_note',      color: '#f59e0b'              },
  attendance: { icon: 'event_available',color: '#06b6d4'              },
  announce:   { icon: 'campaign',       color: 'var(--ska-secondary)' },
  admin:      { icon: 'admin_panel_settings', color: 'var(--ska-tertiary)' },
};

/**
 * Recent Activity feed — chronological list of school events
 * (grade submissions, payments, modification requests, announcements).
 */
export default function ActivityFeed({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="pu-card pu-feed">
      <div className="pu-card__head">
        <div className="pu-card__title">
          <Ic name="history" size="sm" />
          <strong>Recent Activity</strong>
        </div>
        <span className="pu-card__sub">{items.length} event{items.length !== 1 ? 's' : ''}</span>
      </div>
      <ul className="pu-feed__list">
        {items.map((it, i) => {
          const m = KIND_META[it.kind] || KIND_META.admin;
          return (
            <li key={i} className="pu-feed__item">
              <div className="pu-feed__icon"
                style={{ background: `${m.color}1a`, color: m.color }}>
                <Ic name={m.icon} size="sm" />
              </div>
              <div className="pu-feed__body">
                <p>{it.text}</p>
                <span>{it.at}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
