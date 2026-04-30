import { useEffect, useState } from 'react';
import { studentApi } from '../../api/studentApi';
import './TamperCounter.css';

export default function TamperCounter({ onClickDetails }) {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.getTamperCount()
      .then((c) => setCount(c))
      .catch(() => setCount({ total: 0, blocked: 0, successful: 0 }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  const total = count?.total ?? 0;
  const isClean = total === 0;
  const successful = count?.successful ?? 0;
  const tone = successful > 0 ? 'danger' : isClean ? 'safe' : 'warn';

  return (
    <button
      type="button"
      className={`tamper-counter tamper-counter--${tone}`}
      onClick={onClickDetails}
      title={isClean ? 'No modification attempts on your records' : 'View attempt details'}
    >
      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
        {isClean ? 'verified' : successful > 0 ? 'gpp_maybe' : 'gpp_good'}
      </span>
      <span className="tamper-counter__main">
        <strong>{total}</strong>
        <span className="tamper-counter__label">
          {isClean
            ? 'modification attempts on your records'
            : total === 1
              ? 'modification attempt — view details'
              : `modification attempts — view details`}
        </span>
      </span>
      {!isClean && (
        <span className="tamper-counter__sub">
          {count.blocked} blocked · {successful} successful
        </span>
      )}
    </button>
  );
}
