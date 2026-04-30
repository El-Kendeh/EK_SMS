import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useActiveChild } from '../../context/ChildContext';
import { fetchTamperCount, fetchChildFees } from '../../api/parentApi';
import { Skeleton } from '../common/Skeleton';
import './FamilyBento.css';

// Family-at-a-glance grid: one card per child with avg, attendance, outstanding,
// tamper-attempts. Click a card → activates that child + navigates somewhere.
export default function FamilyBento({ navigateTo }) {
  const { children = [], setActiveChildId } = useActiveChild();
  const [tampers, setTampers] = useState({});
  const [fees, setFees] = useState({});

  useEffect(() => {
    children.forEach((c) => {
      fetchTamperCount(c.id).then((t) => setTampers((m) => ({ ...m, [c.id]: t }))).catch(() => {});
      fetchChildFees(c.id).then((f) => setFees((m) => ({ ...m, [c.id]: f }))).catch(() => {});
    });
  }, [children]);

  if (children.length === 0) {
    return (
      <div className="fb">
        <Skeleton height={160} radius={16} />
      </div>
    );
  }

  return (
    <div className="fb" role="region" aria-label="Family at a glance">
      {children.map((c, idx) => {
        const t = tampers[c.id];
        const f = fees[c.id];
        const tamperBadge = t == null
          ? null
          : t.successful > 0 ? { tone: 'danger', text: `${t.successful} successful tamper${t.successful > 1 ? 's' : ''}` }
          : t.total === 0 ? { tone: 'safe', text: 'No tamper attempts' }
          : { tone: 'warn', text: `${t.total} blocked` };

        const outstanding = f?.outstanding ?? null;
        const outstandingTone = outstanding == null ? null : outstanding === 0 ? 'safe' : 'warn';

        return (
          <motion.button
            key={c.id}
            className="fb__card"
            onClick={() => { setActiveChildId(c.id); navigateTo?.('children'); }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            type="button"
          >
            <header>
              <span className="fb__avatar">{(c.fullName || '').split(' ').map((n) => n[0]).slice(0,2).join('').toUpperCase()}</span>
              <div className="fb__head-text">
                <strong>{c.fullName}</strong>
                <span>{c.classroom || ''}</span>
              </div>
            </header>

            <div className="fb__row">
              <div className="fb__metric">
                <span>Avg</span>
                <strong>{c.averageGrade != null ? `${Math.round(c.averageGrade)}%` : '—'}</strong>
              </div>
              <div className="fb__metric">
                <span>Rank</span>
                <strong>{c.classRank ? `#${c.classRank}` : '—'}</strong>
              </div>
              <div className="fb__metric">
                <span>Attend</span>
                <strong>{c.attendance != null ? `${c.attendance}%` : '—'}</strong>
              </div>
            </div>

            <footer>
              {tamperBadge && (
                <span className={`fb__pill fb__pill--${tamperBadge.tone}`}>
                  <span className="material-symbols-outlined">
                    {tamperBadge.tone === 'safe' ? 'verified' : tamperBadge.tone === 'warn' ? 'gpp_good' : 'gpp_maybe'}
                  </span>
                  {tamperBadge.text}
                </span>
              )}
              {outstanding != null && (
                <span className={`fb__pill fb__pill--${outstandingTone}`}>
                  <span className="material-symbols-outlined">payments</span>
                  {outstanding === 0 ? 'Fees up to date' : `SLL ${(outstanding / 1000).toFixed(0)}k due`}
                </span>
              )}
            </footer>
          </motion.button>
        );
      })}
    </div>
  );
}
