import React from 'react';
import { puHealthColor } from './principal.utils';
import { PU_FINANCE_STYLE } from './principal.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Hero School Health Score card. Shows overall score, breakdown bars
 * for Academics / Attendance / Finance, and verdict text.
 */
export default function HealthScoreCard({ summary, loading }) {
  const score = loading ? 0 : summary.healthScore;
  const color = puHealthColor(score);
  const fs    = PU_FINANCE_STYLE[summary.finance] || PU_FINANCE_STYLE.Stable;

  /* Map finance status → numeric for breakdown bar (0-100) */
  const finPct = summary.finance === 'Stable'           ? 95
              :  summary.finance === 'Needs Attention' ? 60
              :  30;

  const verdict = score >= 80 ? { label: 'Healthy', sub: 'School performing strongly' }
                : score >= 65 ? { label: 'Watch',   sub: 'Some areas need attention' }
                :               { label: 'Critical',sub: 'Immediate action required' };

  const breakdowns = [
    { key: 'academic',   label: 'Academic',   value: summary.avgAcademic,   suffix: '%', color: puHealthColor(summary.avgAcademic) },
    { key: 'attendance', label: 'Attendance', value: summary.avgAttendance, suffix: '%', color: puHealthColor(summary.avgAttendance) },
    { key: 'finance',    label: 'Finance',    value: finPct,                suffix: '',  color: fs.color, displayValue: summary.finance },
  ];

  /* SVG circular ring math — radius 60 */
  const R = 60, C = 2 * Math.PI * R;
  const offset = C * (1 - score / 100);

  return (
    <div className="pu-health" style={{ '--pu-health-color': color }}>

      {/* Left — circular ring with score */}
      <div className="pu-health__ring-wrap">
        <svg className="pu-health__ring" viewBox="0 0 144 144" width="144" height="144">
          <circle cx="72" cy="72" r={R}
            stroke="var(--ska-surface-high)" strokeWidth="10" fill="none" />
          <circle cx="72" cy="72" r={R}
            stroke={color} strokeWidth="10" fill="none"
            strokeDasharray={C} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        </svg>
        <div className="pu-health__score">
          <strong>{loading ? '…' : score}<small>%</small></strong>
          <span>health</span>
        </div>
      </div>

      {/* Right — title, verdict, breakdown bars */}
      <div className="pu-health__body">
        <div className="pu-health__head">
          <Ic name="favorite" size="sm" />
          <strong>School Health Score</strong>
          <span className="pu-health__verdict" style={{ background: `${color}20`, color }}>
            {verdict.label}
          </span>
        </div>
        <p className="pu-health__sub">{verdict.sub}. Score combines academics (45%), attendance (40%), and finance (15%).</p>

        <div className="pu-health__bars">
          {breakdowns.map(b => (
            <div key={b.key} className="pu-health__bar-row">
              <span className="pu-health__bar-label">{b.label}</span>
              <div className="pu-health__bar-track">
                <div className="pu-health__bar-fill"
                  style={{ width: `${b.value}%`, background: b.color }} />
              </div>
              <strong className="pu-health__bar-value" style={{ color: b.color }}>
                {b.displayValue || `${b.value}${b.suffix}`}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
