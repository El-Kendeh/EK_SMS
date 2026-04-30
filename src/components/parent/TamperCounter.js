import { useEffect, useState } from 'react';
import { fetchTamperCount } from '../../api/parentApi';
import './TamperCounter.css';

// Per-child variant of the Student TamperCounter. Pulls live count from the API.
export default function TamperCounter({ childId, childName, onClickDetails, compact = false }) {
  const [c, setC] = useState(null);

  useEffect(() => {
    if (!childId) return;
    setC(null);
    fetchTamperCount(childId).then(setC).catch(() => setC({ total: 0, blocked: 0, successful: 0 }));
  }, [childId]);

  if (!c) return null;

  const total = c.total || 0;
  const successful = c.successful || 0;
  const tone = successful > 0 ? 'danger' : total === 0 ? 'safe' : 'warn';

  return (
    <button
      type="button"
      className={`pt-tamper pt-tamper--${tone} ${compact ? 'pt-tamper--compact' : ''}`}
      onClick={onClickDetails}
      title={total === 0 ? `No modification attempts on ${childName}'s records` : 'View attempt details'}
    >
      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
        {total === 0 ? 'verified' : successful > 0 ? 'gpp_maybe' : 'gpp_good'}
      </span>
      <span className="pt-tamper__main">
        <strong>{total}</strong>
        <span>
          {total === 0
            ? `attempts on ${childName || 'records'}`
            : total === 1 ? 'attempt — view details' : 'attempts — view details'}
        </span>
      </span>
      {total > 0 && (
        <span className="pt-tamper__sub">{c.blocked} blocked · {successful} successful</span>
      )}
    </button>
  );
}
