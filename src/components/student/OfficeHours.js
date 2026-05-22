import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import { Skeleton } from '../common/Skeleton';
import './OfficeHours.css';

function fmtSlot(iso, durationMin) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const end = new Date(d.getTime() + durationMin * 60_000)
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}–${end}`;
}

export default function OfficeHours() {
  const [slots, setSlots] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [topic, setTopic] = useState('');
  const [error, setError] = useState(null);

  const refresh = () => studentApi.getOfficeHourSlots()
    .then(setSlots)
    .catch(() => setError('Could not load office hour slots.'));

  useEffect(() => { refresh(); }, []);

  const claim = async (slot) => {
    setError(null);
    try {
      await studentApi.claimOfficeHourSlot(slot.id, { topic: topic || 'General help' });
      setBookingId(null); setTopic('');
      refresh();
    } catch (e) {
      setError(e?.message || 'Could not book that slot.');
    }
  };

  const cancel = async (slot) => {
    setError(null);
    try {
      await studentApi.cancelOfficeHourSlot(slot.id);
      refresh();
    } catch {
      setError('Could not cancel the booking.');
    }
  };

  const grouped = (slots || []).reduce((acc, s) => {
    (acc[s.subject] = acc[s.subject] || []).push(s); return acc;
  }, {});

  return (
    <div className="oh">
      <header>
        <h2>
          <span className="material-symbols-outlined">co_present</span>
          Office hours
        </h2>
        <p>Book a 1-on-1 slot with your teacher. Booked sessions appear in your timetable and create a Messages thread.</p>
      </header>

      {!slots && (
        <div className="oh__skel">
          {[0, 1, 2].map((i) => <Skeleton key={i} height={68} radius={12} style={{ marginBottom: 10 }} />)}
        </div>
      )}

      {error && <p className="oh__error">{error}</p>}

      {slots && Object.entries(grouped).map(([subject, list]) => (
        <section key={subject} className="oh__subject">
          <h3>{subject}</h3>
          <ul>
            {list.map((s) => (
              <li key={s.id} className={s.booked ? 'is-booked' : ''}>
                <div className="oh__slot-info">
                  <strong>{fmtSlot(s.start, s.durationMin)}</strong>
                  <span>{s.teacher} · {s.room}</span>
                  {s.booked && s.bookedBy === 'self' && s.topic && <em>Topic: {s.topic}</em>}
                </div>
                {s.booked && s.bookedBy === 'self' ? (
                  <button className="oh__btn oh__btn--cancel" onClick={() => cancel(s)}>
                    <span className="material-symbols-outlined">close</span>
                    Cancel
                  </button>
                ) : s.booked ? (
                  <span className="oh__pill">Taken</span>
                ) : (
                  <button className="oh__btn oh__btn--book" onClick={() => setBookingId(s.id)}>
                    <span className="material-symbols-outlined">event_available</span>
                    Book
                  </button>
                )}

                <AnimatePresence>
                  {bookingId === s.id && (
                    <motion.div
                      key="bm"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="oh__booker"
                    >
                      <input
                        autoFocus
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="What do you want to discuss? (optional)"
                      />
                      <div className="oh__booker-actions">
                        <button className="oh__btn oh__btn--book" onClick={() => claim(s)}>Confirm</button>
                        <button className="oh__btn oh__btn--ghost" onClick={() => { setBookingId(null); setTopic(''); }}>
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
