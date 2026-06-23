import React from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Collapsible card surfaced on the Personal step when surname + address
 * (or guardian phone) match an existing student. Picks one to "Link as
 * sibling" — pre-fills guardian + address + auto-flags fee_category as
 * 'Sibling Discount'.
 */
export default function SiblingMatchCard({
  matches, linkedId, onLink, onUnlink,
}) {
  if (!matches || matches.length === 0) return null;
  if (linkedId) {
    const linked = matches.find(s => String(s.id) === String(linkedId));
    return (
      <div className="stu-sibling-card stu-sibling-card--linked">
        <Ic name="family_restroom" />
        <div className="stu-sibling-card__body">
          <strong>Linked as sibling of {linked?.full_name || 'existing student'}</strong>
          <span>Guardian + address pre-filled · sibling-discount fee category applied.</span>
        </div>
        <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm" onClick={onUnlink}>
          <Ic name="link_off" size="sm" /> Unlink
        </button>
      </div>
    );
  }

  return (
    <div className="stu-sibling-card">
      <Ic name="family_restroom" />
      <div className="stu-sibling-card__body">
        <strong>Possible sibling{matches.length > 1 ? 's' : ''} found</strong>
        <span>Same surname &amp; address — link to inherit guardian and apply sibling discount.</span>
      </div>
      <div className="stu-sibling-card__matches">
        {matches.map(s => (
          <button
            key={s.id}
            type="button"
            className="stu-sibling-card__match"
            onClick={() => onLink(s)}
            title={`Link as sibling of ${s.full_name}`}
          >
            <span className="stu-sibling-card__avatar">
              {(s.first_name?.[0] || '?').toUpperCase()}
            </span>
            <span>
              <strong>{s.full_name || `${s.first_name} ${s.last_name}`}</strong>
              <small>{s.classroom || s.classroom_name || ''} · {s.admission_number || '—'}</small>
            </span>
            <Ic name="link" size="sm" />
          </button>
        ))}
      </div>
    </div>
  );
}
