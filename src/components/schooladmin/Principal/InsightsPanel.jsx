import React from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * AI Insights panel — gives the school admin actionable recommendations
 * derived from the school summary (mock heuristics in principal.utils).
 */
export default function InsightsPanel({ insights }) {
  return (
    <div className="pu-card pu-insights">
      <div className="pu-card__head">
        <div className="pu-card__title">
          <Ic name="auto_awesome" size="sm" />
          <strong>AI Insights</strong>
        </div>
        <span className="pu-insights__pulse">SMART</span>
      </div>
      <ul className="pu-insights__list">
        {insights.map((t, i) => (
          <li key={i} className="pu-insights__item">
            <Ic name="lightbulb" size="sm" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
