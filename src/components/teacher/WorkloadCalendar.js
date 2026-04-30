import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { teacherApi } from '../../api/teacherApi';
import { Skeleton } from '../common/Skeleton';
import './WorkloadCalendar.css';

const DAYS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
];

const KIND_META = {
  'class':           { icon: 'school',          tone: 'class' },
  'office-hour':     { icon: 'co_present',      tone: 'office' },
  'conference':      { icon: 'forum',           tone: 'office' },
  'grades-due':      { icon: 'grading',         tone: 'urgent' },
  'assignment-due':  { icon: 'assignment_late', tone: 'urgent' },
};

export default function WorkloadCalendar() {
  const [w, setW] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    teacherApi.getWorkload().then(setW).catch(() => setError('Could not load workload.'));
  }, []);

  if (!w && !error) return <div className="wcal"><Skeleton height={420} radius={14} /></div>;
  if (error) return <p className="wcal__error">{error}</p>;

  return (
    <div className="wcal">
      <header>
        <h2><span className="material-symbols-outlined">view_week</span> My workload this week</h2>
        <p>One pane: classes + grade deadlines + assignment due dates + conferences.</p>
      </header>

      <div className="wcal__summary">
        <div className="wcal__num"><strong>{w.totalHours}h</strong><span>scheduled</span></div>
        <div className="wcal__num wcal__num--warn"><strong>{w.pendingGrades}</strong><span>grades pending</span></div>
        <div className="wcal__num"><strong>{w.pendingAssignments}</strong><span>assignments due</span></div>
        <div className="wcal__num"><strong>{w.pendingMessages}</strong><span>parent replies</span></div>
      </div>

      <div className="wcal__week">
        {DAYS.map((d) => {
          const day = (w.thisWeek || []).find((x) => x.day === d.id);
          return (
            <motion.div key={d.id} className="wcal__day" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <header><strong>{d.label}</strong></header>
              <ul>
                {(day?.items || []).map((it, i) => {
                  const meta = KIND_META[it.kind] || { icon: 'event', tone: 'class' };
                  return (
                    <li key={i} className={`wcal__item wcal__item--${meta.tone}`}>
                      <span className="material-symbols-outlined">{meta.icon}</span>
                      <div>
                        <strong>{it.label}</strong>
                        <span>
                          {it.start ? `${it.start}` : ''}
                          {it.durationMin ? ` · ${it.durationMin}m` : ''}
                          {it.dueAt ? `due ${new Date(it.dueAt).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                        </span>
                      </div>
                    </li>
                  );
                })}
                {(!day || day.items.length === 0) && <li className="wcal__empty">No items</li>}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
