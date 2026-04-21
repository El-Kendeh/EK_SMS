import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { getCompletionStatus } from '../../utils/gradeUtils';
import './MyClasses.css';

export default function MyClasses({ navigateTo }) {
  const { assignedClasses, setSelectedClassId } = useTeacher();
  const [search, setSearch] = useState('');

  const filtered = assignedClasses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEnterGrades = (cls) => {
    setSelectedClassId(cls.id);
    navigateTo('grade-entry');
  };

  return (
    <div>
      <h1 className="tch-page-title">My Classes</h1>
      <p className="tch-page-sub">{assignedClasses.length} class assignment{assignedClasses.length !== 1 ? 's' : ''} this term</p>

      <div className="tch-search-wrap" style={{ maxWidth: 360 }}>
        <span className="material-symbols-outlined">search</span>
        <input
          className="tch-input"
          placeholder="Search classes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="tch-empty">
          <span className="material-symbols-outlined">school</span>
          <p>No classes found</p>
        </div>
      ) : (
        <div className="myclasses-grid">
          {filtered.map((cls, i) => {
            const stats = cls.gradeStats || {};
            const total = stats.total || 1;
            const lockedPct = (stats.locked / total) * 100;
            const draftPct  = (stats.draft  / total) * 100;
            const status = getCompletionStatus(stats);
            const isComplete = status === 'complete';

            return (
              <motion.div
                key={cls.id}
                className="myclasses-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.07 }}
              >
                {/* Card header */}
                <div className="myclasses-card__header">
                  <div>
                    <h3 className="myclasses-card__name">{cls.name}</h3>
                    <p className="myclasses-card__room">
                      <span className="material-symbols-outlined">meeting_room</span>
                      {cls.room}
                    </p>
                  </div>
                  <span className={`tch-badge ${cls.subject.category === 'elective' ? 'tch-badge--blue' : 'tch-badge--primary'}`}>
                    {cls.subject.code}
                  </span>
                </div>

                <p className="myclasses-card__subject">{cls.subject.name}</p>

                <div className="myclasses-card__stats-row">
                  <span className="tch-chip">
                    <span className="material-symbols-outlined">groups</span>
                    {cls.studentCount} students
                  </span>
                  {isComplete && (
                    <span className="tch-badge tch-badge--green">
                      <span className="material-symbols-outlined">check_circle</span>
                      Complete
                    </span>
                  )}
                  {!isComplete && stats.pending === stats.total && (
                    <span className="tch-badge tch-badge--grey">Not Started</span>
                  )}
                  {!isComplete && stats.pending !== stats.total && (
                    <span className="tch-badge tch-badge--amber">In Progress</span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="myclasses-card__progress">
                  <div className="myclasses-card__progress-labels">
                    <span style={{ color: 'var(--tch-primary)', fontWeight: 700, fontSize: 12 }}>
                      {stats.locked} locked
                    </span>
                    <span style={{ color: 'var(--tch-text-secondary)', fontSize: 12 }}>
                      {stats.total} total
                    </span>
                  </div>
                  <div className="tch-completion-bar">
                    <div className="tch-completion-bar__locked" style={{ width: `${lockedPct}%` }} />
                    <div className="tch-completion-bar__draft"  style={{ width: `${draftPct}%` }} />
                  </div>
                  <div className="myclasses-card__progress-sub">
                    {stats.draft > 0 && (
                      <span style={{ color: 'var(--tch-warning)', fontSize: 11 }}>{stats.draft} draft</span>
                    )}
                    {stats.pending > 0 && (
                      <span style={{ color: 'var(--tch-text-secondary)', fontSize: 11 }}>{stats.pending} pending</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="myclasses-card__actions">
                  <button
                    className="tch-btn tch-btn--primary"
                    style={{ flex: 1 }}
                    onClick={() => handleEnterGrades(cls)}
                    disabled={isComplete}
                  >
                    <span className="material-symbols-outlined">edit_note</span>
                    {isComplete ? 'All Locked' : 'Enter Grades'}
                  </button>
                  <button
                    className="tch-btn tch-btn--ghost"
                    onClick={() => { setSelectedClassId(cls.id); navigateTo('grade-history'); }}
                  >
                    <span className="material-symbols-outlined">history_edu</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
