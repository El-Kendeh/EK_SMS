import { useEffect, useState } from 'react';
import { fetchWhereIveBeen } from '../../api/parentApi';
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

// Mirror of Student's "Who's seen my data" — but on the parent side it's
// "where I've been" (every section / view / download by this parent account).
// Builds trust by symmetry: child can see parent views; parent can see their own.
export default function WhereIveBeen({ compact = false }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    fetchWhereIveBeen().then(setEntries).catch(() => setEntries([]));
  }, []);

  return (
    <div className={`pwib ${compact ? 'pwib--compact' : ''}`}>
      <header>
        <h3>
          <span className="material-symbols-outlined">history</span>
          Where I've been
        </h3>
        <p>Every section you've opened. Symmetric to what your child can see about your views.</p>
      </header>

      {!entries && (
        <div className="pwib__list">
          {[0, 1, 2].map((i) => (
            <div className="pwib__row" key={i}>
              <Skeleton width={36} height={36} radius={10} />
              <div style={{ flex: 1 }}>
                <Skeleton width="50%" height={13} />
                <Skeleton width="70%" height={11} style={{ marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {entries && entries.length === 0 && <p className="pwib__empty">No activity recorded yet.</p>}

      {entries && entries.length > 0 && (
        <ul className="pwib__list">
          {entries.map((e, i) => (
            <li key={i} className="pwib__row">
              <div className="pwib__icon">
                <span className="material-symbols-outlined">visibility</span>
              </div>
              <div className="pwib__body">
                <strong>{e.section}</strong>
                <span>{e.device}{e.location ? ` · ${e.location}` : ''}</span>
              </div>
              <span className="pwib__time">{fmt(e.accessedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
