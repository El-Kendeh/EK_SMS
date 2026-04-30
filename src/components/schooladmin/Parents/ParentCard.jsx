import React, { useState } from 'react';
import { relTime, perfColor, attColor } from './utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

function AlertChip({ a }) {
  const palette = a.sev === 'red'
    ? { bg: 'var(--ska-error-dim)',    fg: 'var(--ska-error)',    icon: 'priority_high' }
    : a.sev === 'amber'
    ? { bg: 'var(--ska-tertiary-dim)', fg: 'var(--ska-tertiary)', icon: 'warning' }
    : { bg: 'var(--ska-green-dim)',    fg: 'var(--ska-green)',    icon: 'check_circle' };
  return (
    <span className="ska-prnt-alert-chip" style={{ background: palette.bg, color: palette.fg }}>
      <Ic name={palette.icon} size="sm" /> {a.label}
    </span>
  );
}

export default function ParentCard({ parent: p, onView, onLink, onMessage }) {
  const [expanded, setExpanded] = useState(false);
  const childCount = p.children?.length || 0;
  const hasChildren = childCount > 0;

  return (
    <div className={`ska-prnt-card ${!p.isActive ? 'ska-prnt-card--inactive' : ''}`}>
      <div className="ska-prnt-card__head" onClick={() => setExpanded(v => !v)}>
        <div className="ska-prnt-avatar">{p.name?.[0]?.toUpperCase() || '?'}</div>

        <div className="ska-prnt-card__identity">
          <div className="ska-prnt-card__name-row">
            <h3 className="ska-prnt-card__name">{p.name}</h3>
            <span className={`ska-badge ${p.isActive ? 'ska-badge--active' : 'ska-badge--inactive'}`}>
              ● {p.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="ska-badge ska-badge--primary">
              <Ic name={p.relationshipNorm === 'Mother' ? 'female' : p.relationshipNorm === 'Father' ? 'male' : 'shield_person'} size="sm" />
              {p.relationshipNorm}
            </span>
          </div>
          <div className="ska-prnt-card__contact">
            <span><Ic name="mail" size="sm" /> {p.email || '—'}</span>
            <span><Ic name="call" size="sm" /> {p.phone || '—'}</span>
            <span><Ic name="schedule" size="sm" /> {relTime(p.lastActiveDays)}</span>
          </div>
        </div>

        <button className="ska-prnt-card__chevron" type="button" aria-label="Expand">
          <Ic name={expanded ? 'expand_less' : 'expand_more'} />
        </button>
      </div>

      {/* Linked-student strip + headline metrics */}
      <div className="ska-prnt-card__strip">
        <div className="ska-prnt-card__metric">
          <span className="ska-prnt-card__metric-label">Children</span>
          <span className="ska-prnt-card__metric-val">
            <Ic name="group" size="sm" /> {childCount}
          </span>
        </div>
        <div className="ska-prnt-card__metric">
          <span className="ska-prnt-card__metric-label">Avg Performance</span>
          <span className="ska-prnt-card__metric-val" style={{ color: hasChildren ? perfColor(p.avgPerformance) : 'var(--ska-text-3)' }}>
            {hasChildren ? `${p.avgPerformance}%` : '—'}
          </span>
        </div>
        <div className="ska-prnt-card__metric">
          <span className="ska-prnt-card__metric-label">Attendance</span>
          <span className="ska-prnt-card__metric-val" style={{ color: hasChildren ? attColor(p.avgAttendance) : 'var(--ska-text-3)' }}>
            {hasChildren ? `${p.avgAttendance}%` : '—'}
          </span>
        </div>
        <div className="ska-prnt-card__metric">
          <span className="ska-prnt-card__metric-label">Outstanding</span>
          <span className="ska-prnt-card__metric-val" style={{ color: p.outstandingFees > 0 ? 'var(--ska-error)' : 'var(--ska-green)' }}>
            ${p.outstandingFees.toLocaleString()}
          </span>
        </div>
        <div className="ska-prnt-card__metric">
          <span className="ska-prnt-card__metric-label">Msg Read</span>
          <span className="ska-prnt-card__metric-val">{p.messagesRead}</span>
        </div>
      </div>

      {p.alerts.length > 0 && (
        <div className="ska-prnt-card__alerts">
          {p.alerts.map(a => <AlertChip key={a.kind} a={a} />)}
        </div>
      )}

      {expanded && (
        <div className="ska-prnt-card__expand">
          <div className="ska-prnt-card__expand-title">Linked Students</div>
          {hasChildren ? (
            <div className="ska-prnt-children">
              {p.childrenRich.map(c => (
                <div key={c.id} className="ska-prnt-child-row">
                  <div className="ska-prnt-child-row__avatar"><Ic name="person" /></div>
                  <div className="ska-prnt-child-row__info">
                    <strong>{c.name}</strong>
                    <span>{c.class || 'No class'} · {c.admission || '—'}</span>
                  </div>
                  <div className="ska-prnt-child-row__metric" style={{ color: perfColor(c.performance) }}>
                    <span>Performance</span><strong>{c.performance}%</strong>
                  </div>
                  <div className="ska-prnt-child-row__metric" style={{ color: attColor(c.attendance) }}>
                    <span>Attendance</span><strong>{c.attendance}%</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ska-prnt-empty-inline">
              <Ic name="link_off" /> No students linked yet.
            </div>
          )}
        </div>
      )}

      <div className="ska-prnt-card__actions">
        <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onView(p)}>
          <Ic name="visibility" size="sm" /> View Profile
        </button>
        <button className="ska-btn ska-btn--secondary ska-btn--sm" onClick={() => onLink(p)}>
          <Ic name="link" size="sm" /> Link Student
        </button>
        <button className="ska-btn ska-btn--primary ska-btn--sm" onClick={() => onMessage(p)}>
          <Ic name="send" size="sm" /> Message
        </button>
      </div>
    </div>
  );
}
