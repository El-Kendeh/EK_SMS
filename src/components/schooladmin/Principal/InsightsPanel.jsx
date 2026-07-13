import React from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Insights panel — actionable recommendations derived from the school
 * summary by simple rule-based heuristics. Honestly labelled: these are
 * threshold rules, not an AI model (the old "AI Insights"/"SMART" branding
 * oversold static if-statements).
 */
export default function InsightsPanel({ insights }) {
  return (
    <div className="pu-card pu-insights">
      <div className="pu-card__head">
        <div className="pu-card__title">
          <Ic name="lightbulb" size="sm" />
          <strong>Insights</strong>
        </div>
        <span className="pu-insights__pulse">RULES</span>
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
