import React from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Class Performance Snapshot — top + low performing classes.
 * Pure presentation; data comes from classPerformance(summary, school).
 * When `onSelect` is passed, rows become real buttons (keyboard accessible)
 * that drill into the student-level view — the backend rows carry class
 * aggregates only (no student ids), so the drill-down target is the At-Risk
 * panel, not a per-student drawer.
 */
export default function ClassPerformance({ data, onSelect }) {
  const Row = ({ name, score, tone }) => {
    const color = tone === 'good' ? 'var(--ska-green)' : 'var(--ska-error)';
    const inner = (
      <>
        <span className="pu-class-row__name">{name}</span>
        <div className="pu-class-row__bar">
          <div style={{ width: `${score}%`, background: color }} />
        </div>
        <strong style={{ color }}>{score}%</strong>
      </>
    );
    if (onSelect) {
      return (
        <button type="button" className="pu-class-row pu-class-row--btn"
          onClick={() => onSelect({ name, score })}
          aria-label={`${name} — ${score}% average. Open student-level view.`}>
          {inner}
        </button>
      );
    }
    return <div className="pu-class-row">{inner}</div>;
  };

  return (
    <div className="pu-card pu-classes">
      <div className="pu-card__head">
        <div className="pu-card__title">
          <Ic name="leaderboard" size="sm" />
          <strong>Class Performance</strong>
        </div>
        <span className="pu-card__sub">By academic average</span>
      </div>

      <div className="pu-classes__col">
        <h5 className="pu-classes__title pu-classes__title--good">
          <Ic name="trending_up" size="sm" /> Top Performing
        </h5>
        {data.top.map(c => <Row key={c.name} name={c.name} score={c.score} tone="good" />)}
      </div>

      <div className="pu-classes__col">
        <h5 className="pu-classes__title pu-classes__title--bad">
          <Ic name="trending_down" size="sm" /> Needs Attention
        </h5>
        {data.low.map(c => <Row key={c.name} name={c.name} score={c.score} tone="bad" />)}
      </div>
    </div>
  );
}
