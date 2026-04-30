import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { teacherApi } from '../../api/teacherApi';
import { Skeleton } from '../common/Skeleton';
import './ExamDuties.css';

export default function ExamDuties() {
  const [duties, setDuties] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    teacherApi.getExamDuties?.().then(setDuties).catch(() => setError('Could not load duties.'));
  }, []);

  if (!duties && !error) return <div className="exd"><Skeleton height={240} radius={14} /></div>;
  if (error) return <p className="exd__error">{error}</p>;

  return (
    <div className="exd">
      <header>
        <h2><span className="material-symbols-outlined">how_to_reg</span> Exam duties</h2>
        <p>Invigilation and observation assignments. Confirm so the exam office knows you've seen them.</p>
      </header>

      <ul className="exd__list">
        {(duties || []).map((d) => (
          <motion.li key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="exd__icon"><span className="material-symbols-outlined">{d.role === 'invigilator' ? 'how_to_reg' : 'visibility'}</span></div>
            <div className="exd__body">
              <strong>{d.exam}</strong>
              <span>{new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {d.start}–{d.end} · {d.room}</span>
              <small>Role: {d.role}</small>
            </div>
            <span className={`exd__pill ${d.confirmed ? 'is-ok' : 'is-pending'}`}>
              {d.confirmed ? 'Confirmed' : 'Pending'}
            </span>
          </motion.li>
        ))}
        {(duties || []).length === 0 && <li className="exd__empty">No duties scheduled.</li>}
      </ul>
    </div>
  );
}
