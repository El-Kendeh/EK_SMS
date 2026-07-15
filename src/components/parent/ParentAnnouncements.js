import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchParentEvents } from '../../api/parentApi';
import { Skeleton } from '../common/Skeleton';
import './ParentAnnouncements.css';

const TYPE_META = {
  alert:   { icon: 'campaign',      cls: 'pann-item--alert' },
  warning: { icon: 'warning',       cls: 'pann-item--warning' },
  info:    { icon: 'info',          cls: 'pann-item--info' },
};

export default function ParentAnnouncements() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchParentEvents().then(setEvents).catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="pann">
        <header>
          <h2><span className="material-symbols-outlined">campaign</span> Announcements</h2>
        </header>
        <p className="pann-empty">Couldn't load announcements. Please try again later.</p>
      </div>
    );
  }

  if (!events) return <div className="pann"><Skeleton height={280} radius={14} /></div>;

  return (
    <div className="pann">
      <header>
        <h2><span className="material-symbols-outlined">campaign</span> Announcements</h2>
        <p>School-wide notices and events, newest first.</p>
      </header>

      {events.length === 0 && (
        <p className="pann-empty">No announcements from the school yet.</p>
      )}

      <ul className="pann-list">
        {events.map((e, i) => {
          const meta = TYPE_META[e.type] || TYPE_META.info;
          return (
            <motion.li
              key={e.id}
              className={`pann-item ${meta.cls} ${e.isRead ? '' : 'pann-item--unread'}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.04 }}
            >
              <span className="material-symbols-outlined pann-item__icon">{meta.icon}</span>
              <div className="pann-item__body">
                <div className="pann-item__top">
                  <strong>{e.title}</strong>
                  <time dateTime={e.createdAt}>
                    {e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </time>
                </div>
                <p>{e.message}</p>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
