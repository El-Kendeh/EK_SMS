import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { teacherApi } from '../../api/teacherApi';
import { useTeacher } from '../../context/TeacherContext';
import { Skeleton } from '../common/Skeleton';
import './TeacherOfficeHours.css';

function fmt(iso, durationMin) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const end  = new Date(d.getTime() + durationMin * 60_000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}–${end}`;
}

// Slot-management for the teacher's office hours / parent-teacher conferences.
// Mirror of the Student/Parent booking UIs but on the publishing side.
export default function TeacherOfficeHours() {
  const { selectedClass } = useTeacher();
  const [slots, setSlots] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    start: '', durationMin: 20, room: '', subject: selectedClass?.subjectName || '', audience: 'student',
  });

  const refresh = () => teacherApi.getMyOfficeHourSlots().then(setSlots).catch(() => setError('Could not load slots.'));
  useEffect(() => { refresh(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.start || !form.room) return;
    try {
      await teacherApi.publishOfficeHourSlot(form);
      setAdding(false); setForm({ ...form, start: '', room: '' });
      refresh();
    } catch { setError('Could not publish.'); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this slot?')) return;
    try { await teacherApi.deleteOfficeHourSlot(id); refresh(); }
    catch { setError('Could not delete.'); }
  };

  const grouped = (slots || []).reduce((acc, s) => {
    const day = new Date(s.start).toDateString();
    (acc[day] = acc[day] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="too">
      <header>
        <h2><span className="material-symbols-outlined">co_present</span> Office hours / Conferences</h2>
        <p>Slots you've published. Bookings auto-create Messages threads with the requester.</p>
      </header>

      {error && <p className="too__error">{error}</p>}
      {!slots && <Skeleton height={200} radius={14} />}

      {slots && Object.entries(grouped).map(([day, list]) => (
        <section key={day} className="too__day">
          <h3>{day}</h3>
          <ul>
            {list.map((s) => (
              <li key={s.id} className={s.booked ? 'is-booked' : ''}>
                <div>
                  <strong>{fmt(s.start, s.durationMin)}</strong>
                  <span>{s.subject} · {s.room} · for {s.audience === 'parent' ? 'parents' : 'students'}</span>
                  {s.booked && s.claimedBy && (
                    <em>Booked by {s.claimedBy.name}{s.topic ? ` — ${s.topic}` : ''}</em>
                  )}
                </div>
                {s.booked ? (
                  <span className="too__pill">{s.claimedBy?.kind === 'parent' ? 'Parent' : 'Student'}</span>
                ) : (
                  <button className="too__btn too__btn--ghost" onClick={() => remove(s.id)}>
                    <span className="material-symbols-outlined">delete</span> Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <AnimatePresence>
        {adding ? (
          <motion.form className="too__form" onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h3>Publish new slot</h3>
            <label><span>Start (date + time)</span><input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required /></label>
            <label><span>Duration (min)</span><input type="number" min={5} max={120} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} /></label>
            <label><span>Room</span><input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} required placeholder="e.g. Faculty Room A" /></label>
            <label><span>Subject</span><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Mathematics" /></label>
            <label><span>For</span>
              <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                <option value="student">Students</option>
                <option value="parent">Parents</option>
              </select>
            </label>
            <div className="too__form-actions">
              <button type="button" className="too__btn too__btn--ghost" onClick={() => setAdding(false)}>Cancel</button>
              <button type="submit" className="too__btn too__btn--primary">Publish</button>
            </div>
          </motion.form>
        ) : (
          <button className="too__add" onClick={() => setAdding(true)}>
            <span className="material-symbols-outlined">add</span> Publish a slot
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}
