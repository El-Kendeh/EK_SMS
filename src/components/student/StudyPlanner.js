import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import { Skeleton } from '../common/Skeleton';
import './StudyPlanner.css';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABEL = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

export default function StudyPlanner() {
  const [blocks, setBlocks] = useState(null);
  const [editing, setEditing] = useState(null); // {id?, day, start, durationMin, subject, note}
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    studentApi.getStudyPlan().then((p) => setBlocks(Array.isArray(p) ? p : []))
      .catch(() => setError('Could not load your study plan.'));
  }, []);

  const persist = async (next) => {
    setBlocks(next);
    try {
      await studentApi.saveStudyPlan(next);
      setSavedAt(new Date());
    } catch {
      setError('Could not save. Your changes are kept locally.');
    }
  };

  const addOrUpdate = () => {
    if (!editing?.day || !editing?.start) return;
    const id = editing.id || `sp-${Date.now()}`;
    const next = editing.id
      ? blocks.map((b) => b.id === editing.id ? { ...editing } : b)
      : [...(blocks || []), { ...editing, id }];
    persist(next);
    setEditing(null);
  };

  const remove = (id) => persist(blocks.filter((b) => b.id !== id));

  const grouped = useMemo(() => {
    const m = {};
    DAYS.forEach((d) => m[d] = []);
    (blocks || []).forEach((b) => { (m[b.day] = m[b.day] || []).push(b); });
    DAYS.forEach((d) => m[d].sort((a, b) => a.start.localeCompare(b.start)));
    return m;
  }, [blocks]);

  if (!blocks && !error) return <div className="sp"><Skeleton height={420} radius={14} /></div>;

  return (
    <div className="sp">
      <header>
        <h2>
          <span className="material-symbols-outlined">event_note</span>
          Study planner
        </h2>
        <p>Plan your week. Drag-free, tap-friendly. Survives offline if your device cache is intact.</p>
        {savedAt && <small>Saved {savedAt.toLocaleTimeString()}</small>}
      </header>

      {error && <p className="sp__error">{error}</p>}

      <div className="sp__week">
        {DAYS.map((d) => (
          <div key={d} className="sp__day">
            <div className="sp__day-head">
              <span>{DAY_LABEL[d]}</span>
              <button
                onClick={() => setEditing({ day: d, start: '18:00', durationMin: 45, subject: '', note: '' })}
                aria-label={`Add block on ${DAY_LABEL[d]}`}
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
            <ul>
              {grouped[d].length === 0 && <li className="sp__empty">No blocks</li>}
              {grouped[d].map((b) => (
                <li key={b.id}>
                  <button onClick={() => setEditing(b)} className="sp__block">
                    <strong>{b.start}</strong>
                    <span>{b.durationMin}m · {b.subject || 'Study'}</span>
                    {b.note && <em>{b.note}</em>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            className="sp__editor-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}
          >
            <motion.div
              className="sp__editor"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
            >
              <h3>{editing.id ? 'Edit block' : 'New study block'}</h3>
              <label>
                <span>Day</span>
                <select value={editing.day} onChange={(e) => setEditing({ ...editing, day: e.target.value })}>
                  {DAYS.map((d) => <option key={d} value={d}>{DAY_LABEL[d]}</option>)}
                </select>
              </label>
              <label>
                <span>Start</span>
                <input type="time" value={editing.start} onChange={(e) => setEditing({ ...editing, start: e.target.value })} />
              </label>
              <label>
                <span>Duration (min)</span>
                <input
                  type="number" min={10} max={240}
                  value={editing.durationMin}
                  onChange={(e) => setEditing({ ...editing, durationMin: Number(e.target.value) })}
                />
              </label>
              <label>
                <span>Subject</span>
                <input value={editing.subject || ''} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
              </label>
              <label>
                <span>Note</span>
                <input value={editing.note || ''} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
              </label>

              <div className="sp__editor-actions">
                {editing.id && (
                  <button className="sp__btn sp__btn--danger" onClick={() => { remove(editing.id); setEditing(null); }}>
                    Delete
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button className="sp__btn sp__btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button className="sp__btn sp__btn--primary" onClick={addOrUpdate}>Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
