import { useEffect, useState } from 'react';
import { teacherApi } from '../../api/teacherApi';
import { Skeleton } from '../common/Skeleton';
import './WhereIveBeen.css';

function fmt(iso) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function WhereIveBeen({ compact = false }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    teacherApi.getWhereIveBeen().then(setEntries).catch(() => setEntries([]));
  }, []);

  return (
    <div className={`tt-wib ${compact ? 'tt-wib--compact' : ''}`}>
      <header>
        <h3>
          <span className="material-symbols-outlined">history</span>
          Where I've been
        </h3>
        <p>Every student record / class page you've opened. Defensible record for grading disputes.</p>
      </header>

      {!entries && (
        <div className="tt-wib__list">
          {[0, 1, 2].map((i) => (
            <div className="tt-wib__row" key={i}>
              <Skeleton width={36} height={36} radius={10} />
              <div style={{ flex: 1 }}>
                <Skeleton width="50%" height={13} />
                <Skeleton width="70%" height={11} style={{ marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {entries && entries.length === 0 && <p className="tt-wib__empty">No activity recorded yet.</p>}

      {entries && entries.length > 0 && (
        <ul className="tt-wib__list">
          {entries.map((e, i) => (
            <li key={i} className="tt-wib__row">
              <div className="tt-wib__icon">
                <span className="material-symbols-outlined">visibility</span>
              </div>
              <div className="tt-wib__body">
                <strong>{e.section}</strong>
                <span>{e.device}</span>
              </div>
              <span className="tt-wib__time">{fmt(e.accessedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
