import React from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Teacher Performance panel — overloaded count, pending grades,
 * underperforming teachers.
 */
export default function TeacherPanel({ data, onManage }) {
  const tiles = [
    {
      key: 'overloaded',
      icon: 'engineering',
      label: 'Overloaded',
      value: data.overloaded,
      tone: 'amber',
      hint: 'Teachers with > 28 periods/week',
    },
    {
      key: 'pending',
      icon: 'pending_actions',
      label: 'Pending Grades',
      value: data.pendingGrades,
      tone: 'primary',
      hint: 'Awaiting submission',
    },
    {
      key: 'under',
      icon: 'trending_down',
      label: 'Underperforming',
      value: data.underperforming,
      tone: 'error',
      hint: 'Class avg below threshold',
    },
  ];

  return (
    <div className="pu-card pu-teachers">
      <div className="pu-card__head">
        <div className="pu-card__title">
          <Ic name="group" size="sm" />
          <strong>Teacher Performance</strong>
        </div>
        {onManage && (
          <button type="button" className="pu-card__action" onClick={onManage}>
            Manage <Ic name="arrow_forward" size="sm" />
          </button>
        )}
      </div>
      <div className="pu-teachers__grid">
        {tiles.map(t => (
          <div key={t.key} className={`pu-teachers__tile pu-teachers__tile--${t.tone}`}>
            <div className="pu-teachers__icon">
              <Ic name={t.icon} />
            </div>
            <strong className="pu-teachers__value">{t.value}</strong>
            <span className="pu-teachers__label">{t.label}</span>
            <small className="pu-teachers__hint">{t.hint}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
