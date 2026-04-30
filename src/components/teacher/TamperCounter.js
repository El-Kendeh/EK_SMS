import { useEffect, useState } from 'react';
import { teacherApi } from '../../api/teacherApi';
import './TamperCounter.css';

export default function TamperCounter({ classId, label, onClickDetails, compact = false }) {
  const [c, setC] = useState(null);

  useEffect(() => {
    setC(null);
    teacherApi.getTamperCount(classId).then(setC).catch(() => setC({ total: 0, blocked: 0, successful: 0 }));
  }, [classId]);

  if (!c) return null;

  const total = c.total || 0;
  const successful = c.successful || 0;
  const tone = successful > 0 ? 'danger' : total === 0 ? 'safe' : 'warn';

  return (
    <button
      type="button"
      className={`tt-tamper tt-tamper--${tone} ${compact ? 'tt-tamper--compact' : ''}`}
      onClick={onClickDetails}
      title={total === 0 ? `No modification attempts on ${label || 'your grades'}` : 'View attempt details'}
    >
      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
        {total === 0 ? 'verified' : successful > 0 ? 'gpp_maybe' : 'gpp_good'}
      </span>
      <span className="tt-tamper__main">
        <strong>{total}</strong>
        <span>
          {total === 0
            ? `attempts on ${label || 'your grades'}`
            : total === 1 ? 'attempt — view details' : 'attempts — view details'}
        </span>
      </span>
      {total > 0 && (
        <span className="tt-tamper__sub">{c.blocked} blocked · {successful} successful</span>
      )}
    </button>
  );
}
