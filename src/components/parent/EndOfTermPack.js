import { useState } from 'react';
import { useActiveChild } from '../../context/ChildContext';
import { fetchEndOfTermPack } from '../../api/parentApi';
import { Skeleton } from '../common/Skeleton';
import './EndOfTermPack.css';

function fmtSize(b) { return b > 1_000_000 ? `${(b/1_000_000).toFixed(1)} MB` : `${Math.round(b/1000)} KB`; }

export default function EndOfTermPack() {
  const { activeChild } = useActiveChild();
  const [pack, setPack] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    if (!activeChild?.id) return;
    setBusy(true); setError(null);
    try { setPack(await fetchEndOfTermPack({ childId: activeChild.id })); }
    catch { setError('Could not generate the pack. Try again later.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="eotp">
      <header>
        <h2><span className="material-symbols-outlined">archive</span> End-of-Term Pack</h2>
        <p>One ZIP with the term's report card, transcript so far, attendance, fees and behaviour summaries — print-shop ready.</p>
        <p className="eotp__child">For <strong>{activeChild?.fullName || '—'}</strong></p>
      </header>

      {error && <p className="eotp__error">{error}</p>}

      {!pack && (
        <div className="eotp__action">
          <button onClick={generate} disabled={busy || !activeChild}>
            {busy ? 'Generating…' : <><span className="material-symbols-outlined">auto_awesome</span> Generate pack</>}
          </button>
          {busy && <Skeleton height={80} radius={10} style={{ marginTop: 14 }} />}
        </div>
      )}

      {pack && (
        <div className="eotp__pack">
          <header>
            <strong>Pack ready · {fmtSize(pack.size)}</strong>
            <span>Generated {new Date(pack.generatedAt).toLocaleString()}</span>
          </header>
          <ul>
            {pack.items.map((it) => (
              <li key={it.name}>
                <span className="material-symbols-outlined">description</span>
                <strong>{it.name}</strong>
                <em>{fmtSize(it.size)}</em>
              </li>
            ))}
          </ul>
          <button className="eotp__download" onClick={generate}>
            <span className="material-symbols-outlined">refresh</span> Regenerate
          </button>
          <p className="eotp__hint">Right-click any file above to save it individually, or use your browser's "Save All" option.</p>
        </div>
      )}
    </div>
  );
}
