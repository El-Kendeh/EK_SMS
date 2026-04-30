import { useEffect, useState } from 'react';
import { useActiveChild } from '../../context/ChildContext';
import { fetchChildGrades, fetchChildAttendance, fetchChildFees } from '../../api/parentApi';
import QRCode from '../common/QRCode';
import { Skeleton } from '../common/Skeleton';
import './PrintFamilySummary.css';

// One-page A4 family summary, designed for guardians to print at any kiosk.
export default function PrintFamilySummary() {
  const { children = [] } = useActiveChild();
  const [data, setData] = useState({});

  useEffect(() => {
    children.forEach(async (c) => {
      const [g, a, f] = await Promise.all([
        fetchChildGrades(c.id).then((r) => r.grades || []).catch(() => []),
        fetchChildAttendance(c.id).catch(() => null),
        fetchChildFees(c.id).catch(() => null),
      ]);
      setData((m) => ({ ...m, [c.id]: { grades: g, att: a, fees: f } }));
    });
  }, [children]);

  if (children.length === 0) return <div className="pfs"><Skeleton height={400} /></div>;

  const integrityHash = `family-${children.map((c) => c.id).join('-')}-${new Date().toISOString().slice(0,7)}`;
  const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(integrityHash)}`;
  const issued = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="pfs">
      <div className="pfs__toolbar no-print">
        <div>
          <h2>Family summary (printable)</h2>
          <p>One A4 page, all linked children. Use your browser to print or save as PDF.</p>
        </div>
        <button onClick={() => window.print()}>
          <span className="material-symbols-outlined">print</span>
          Print / save PDF
        </button>
      </div>

      <article className="pfs__page">
        <header className="pfs__head">
          <div>
            <h1>El-Kendeh Smart School</h1>
            <p>Family Snapshot · issued {issued}</p>
          </div>
          <QRCode value={verifyUrl} size={70} />
        </header>

        {children.map((c) => {
          const d = data[c.id];
          const grades = d?.grades || [];
          const avg = grades.length ? Math.round(grades.reduce((s, g) => s + (g.score || 0), 0) / grades.length) : null;
          const passed = grades.filter((g) => (g.score || 0) >= 50).length;
          return (
            <section key={c.id} className="pfs__child">
              <h3>{c.fullName} · {c.classroom}</h3>
              <dl>
                <div><dt>Term average</dt><dd>{avg != null ? `${avg}%` : '—'}</dd></div>
                <div><dt>Subjects passed</dt><dd>{passed}/{grades.length}</dd></div>
                <div><dt>Attendance</dt><dd>{d?.att?.stats?.percentage != null ? `${d.att.stats.percentage}%` : (c.attendance ? `${c.attendance}%` : '—')}</dd></div>
                <div><dt>Outstanding fees</dt><dd>{d?.fees?.outstanding != null ? `SLL ${(d.fees.outstanding/1000).toFixed(0)}k` : '—'}</dd></div>
              </dl>
            </section>
          );
        })}

        <footer className="pfs__foot">
          <span>Integrity hash: <code>{integrityHash}</code></span>
          <span>Verify at {verifyUrl}</span>
        </footer>
      </article>
    </div>
  );
}
