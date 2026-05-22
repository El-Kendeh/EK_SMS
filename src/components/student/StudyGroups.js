import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import { Skeleton } from '../common/Skeleton';
import './StudyGroups.css';

export default function StudyGroups() {
  const [groups, setGroups] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const refresh = () => studentApi.getStudyGroups()
    .then(setGroups)
    .catch(() => setError('Could not load study groups.'));

  useEffect(() => { refresh(); }, []);

  const toggle = async (g) => {
    setBusy(g.id);
    setError(null);
    try {
      if (g.joined) await studentApi.leaveStudyGroup(g.id);
      else await studentApi.joinStudyGroup(g.id);
      refresh();
    } catch {
      setError('Could not update membership.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sg">
      <header>
        <h2>
          <span className="material-symbols-outlined">groups</span>
          Study groups
        </h2>
        <p>
          Opt-in groups, scoped to a class subject. Moderated by your teacher and the school admin.
          Anything you post is visible to members and the moderators.
        </p>
      </header>

      {!groups && (
        <div className="sg__skel">
          {[0, 1, 2].map((i) => <Skeleton key={i} height={86} radius={14} style={{ marginBottom: 10 }} />)}
        </div>
      )}

      {error && <p className="sg__error">{error}</p>}

      {groups && (
        <ul className="sg__list">
          {groups.map((g) => (
            <motion.li
              key={g.id}
              className={g.joined ? 'is-joined' : ''}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="sg__icon">
                <span className="material-symbols-outlined">school</span>
              </div>
              <div className="sg__body">
                <strong>{g.name}</strong>
                <span>{g.subject} · {g.members} members</span>
                {g.joined && <small>Last activity {new Date(g.lastActivity).toLocaleDateString()}</small>}
              </div>
              <button
                disabled={busy === g.id}
                onClick={() => toggle(g)}
                className={g.joined ? 'sg__btn sg__btn--leave' : 'sg__btn sg__btn--join'}
              >
                {busy === g.id ? '…' : g.joined ? 'Leave' : 'Join'}
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
