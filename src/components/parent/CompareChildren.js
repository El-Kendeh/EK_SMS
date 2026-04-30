import { useEffect, useMemo, useState } from 'react';
import { useActiveChild } from '../../context/ChildContext';
import { fetchChildGrades, fetchChildAttendance, fetchChildFees } from '../../api/parentApi';
import { Skeleton } from '../common/Skeleton';
import './CompareChildren.css';

// Side-by-side comparison: pick two children, see grades/attendance/fees stacked.
// Useful for parents trying to understand differential outcomes between siblings.
export default function CompareChildren() {
  const { children = [] } = useActiveChild();
  const [leftId, setLeftId]   = useState(children[0]?.id || null);
  const [rightId, setRightId] = useState(children[1]?.id || null);
  const [data, setData] = useState({});

  useEffect(() => {
    [leftId, rightId].filter(Boolean).forEach(async (id) => {
      if (data[id]) return;
      const [g, a, f] = await Promise.all([
        fetchChildGrades(id).then((r) => r.grades || []).catch(() => []),
        fetchChildAttendance(id).catch(() => null),
        fetchChildFees(id).catch(() => null),
      ]);
      setData((m) => ({ ...m, [id]: { grades: g, att: a, fees: f } }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftId, rightId]);

  const left = useMemo(() => children.find((c) => c.id === leftId), [children, leftId]);
  const right = useMemo(() => children.find((c) => c.id === rightId), [children, rightId]);

  if (children.length < 2) {
    return (
      <div className="cmp">
        <h2><span className="material-symbols-outlined">compare</span> Compare children</h2>
        <p className="cmp__empty">You need at least two linked children to use side-by-side compare.</p>
      </div>
    );
  }

  const renderCard = (c, d) => {
    if (!c) return null;
    if (!d) return <Skeleton height={300} radius={14} />;
    const avg = d.grades.length ? Math.round(d.grades.reduce((s, g) => s + (g.score || 0), 0) / d.grades.length) : null;
    const passed = d.grades.filter((g) => (g.score || 0) >= 50).length;
    return (
      <div className="cmp__card">
        <header>
          <strong>{c.fullName}</strong>
          <span>{c.classroom}</span>
        </header>
        <dl>
          <div><dt>Term average</dt><dd>{avg != null ? `${avg}%` : '—'}</dd></div>
          <div><dt>Subjects passed</dt><dd>{passed}/{d.grades.length}</dd></div>
          <div><dt>Attendance</dt><dd>{d.att?.stats?.percentage != null ? `${d.att.stats.percentage}%` : (c.attendance ? `${c.attendance}%` : '—')}</dd></div>
          <div><dt>Outstanding fees</dt><dd>{d.fees?.outstanding != null ? `SLL ${(d.fees.outstanding / 1000).toFixed(0)}k` : '—'}</dd></div>
        </dl>
        <h4>Subjects</h4>
        <ul>
          {d.grades.slice(0, 8).map((g) => (
            <li key={g.id || g.subject?.name}>
              <span>{g.subject?.name || g.subject || '—'}</span>
              <strong>{g.score}%</strong>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="cmp">
      <header>
        <h2><span className="material-symbols-outlined">compare</span> Compare children</h2>
        <p>Pick two children to see their term outcomes side-by-side.</p>
      </header>
      <div className="cmp__pickers">
        <select value={leftId || ''} onChange={(e) => setLeftId(e.target.value)}>
          {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
        </select>
        <span>vs</span>
        <select value={rightId || ''} onChange={(e) => setRightId(e.target.value)}>
          {children.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
        </select>
      </div>
      <div className="cmp__grid">
        {renderCard(left, data[leftId])}
        {renderCard(right, data[rightId])}
      </div>
    </div>
  );
}
