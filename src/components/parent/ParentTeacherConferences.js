import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveChild } from '../../context/ChildContext';
import { fetchConferenceSlots, claimConferenceSlot, cancelConferenceSlot } from '../../api/parentApi';
import { Skeleton } from '../common/Skeleton';
import './ParentTeacherConferences.css';

function fmt(iso, durationMin) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const end  = new Date(d.getTime() + durationMin * 60_000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}–${end}`;
}

export default function ParentTeacherConferences() {
  const { activeChild } = useActiveChild();
  const [slots, setSlots] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [topic, setTopic] = useState('');
  const [error, setError] = useState(null);

  const refresh = () => {
    if (!activeChild?.id) { setSlots([]); return; }
    fetchConferenceSlots(activeChild.id).then(setSlots).catch(() => setError('Could not load conference slots.'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [activeChild?.id]);

  const claim = async (s) => {
    setError(null);
    try {
      await claimConferenceSlot(s.id, { topic: topic || 'General catch-up' });
      setBookingId(null); setTopic('');
      refresh();
    } catch (e) { setError(e?.message || 'Could not book.'); }
  };
  const cancel = async (s) => {
    setError(null);
    try { await cancelConferenceSlot(s.id); refresh(); }
    catch { setError('Could not cancel.'); }
  };

  return (
    <div className="ptc">
      <header>
        <h2><span className="material-symbols-outlined">co_present</span> Parent-teacher conferences</h2>
        <p>Slots for <strong>{activeChild?.fullName || '—'}</strong>. Booked sessions appear in the school calendar and notify both sides.</p>
      </header>

      {!slots && <Skeleton height={200} radius={14} />}
      {error && <p className="ptc__error">{error}</p>}

      {slots && slots.length === 0 && (
        <p className="ptc__empty">No slots are open right now. Check back next week.</p>
      )}

      <ul className="ptc__list">
        {slots && slots.map((s) => (
          <li key={s.id} className={s.booked ? 'is-booked' : ''}>
            <div className="ptc__slot">
              <strong>{fmt(s.start, s.durationMin)}</strong>
              <span>{s.teacher} · {s.subject} · {s.room}</span>
              {s.booked && s.bookedBy === 'self' && s.topic && <em>Topic: {s.topic}</em>}
            </div>
            {s.booked && s.bookedBy === 'self' ? (
              <button className="ptc__btn ptc__btn--cancel" onClick={() => cancel(s)}>
                <span className="material-symbols-outlined">close</span> Cancel
              </button>
            ) : s.booked ? (
              <span className="ptc__pill">Taken</span>
            ) : (
              <button className="ptc__btn ptc__btn--book" onClick={() => setBookingId(s.id)}>
                <span className="material-symbols-outlined">event_available</span> Book
              </button>
            )}
            <AnimatePresence>
              {bookingId === s.id && (
                <motion.div
                  className="ptc__booker"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <input autoFocus value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What do you want to discuss? (optional)" />
                  <div className="ptc__booker-actions">
                    <button className="ptc__btn ptc__btn--book" onClick={() => claim(s)}>Confirm</button>
                    <button className="ptc__btn ptc__btn--ghost" onClick={() => { setBookingId(null); setTopic(''); }}>Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
    </div>
  );
}
