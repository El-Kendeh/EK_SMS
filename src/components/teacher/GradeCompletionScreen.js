import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacherApi';
import { getDeadlineWarning } from '../../utils/gradeUtils';
import './GradeCompletionScreen.css';

function exportCSV(rows, filename) {
  const header = 'Class,Subject,Total Students,Pending,Draft,Locked,Completion %';
  const lines = rows.map(r =>
    `"${r.name}","${r.subject.name}",${r.total},${r.pending},${r.draft},${r.locked},${r.pct}%`
  );
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GradeCompletionScreen({ navigateTo }) {
  const { assignedClasses, currentTerm } = useTeacher();
  const [locking, setLocking] = useState({});
  const [lockResults, setLockResults] = useState({});

  const deadline = currentTerm?.gradeEntryDeadline;
  const deadlineWarning = getDeadlineWarning(deadline);

  const rows = assignedClasses.map(cls => {
    const stats  = cls.gradeStats || {};
    const total  = stats.total  || 0;
    const locked = stats.locked || 0;
    const draft  = stats.draft  || 0;
    const pending = stats.pending || 0;
    const pct    = total > 0 ? Math.round((locked / total) * 100) : 0;
    return { ...cls, total, locked, draft, pending, pct };
  }).sort((a, b) => a.pct - b.pct);

  const totalStudents = rows.reduce((s, r) => s + r.total, 0);
  const totalLocked   = rows.reduce((s, r) => s + r.locked, 0);
  const totalDraft    = rows.reduce((s, r) => s + r.draft, 0);
  const totalPending  = rows.reduce((s, r) => s + r.pending, 0);
  const overallPct    = totalStudents > 0 ? Math.round((totalLocked / totalStudents) * 100) : 0;

  const handleBulkLock = async (cls) => {
    if (cls.draft === 0) return;
    setLocking(p => ({ ...p, [cls.id]: true }));
    try {
      const res = await teacherApi.submitGradesForLocking(
        Array.from({ length: cls.draft }, (_, i) => ({ studentId: null })),
        cls.subject?.id,
        currentTerm?.id,
      );
      setLockResults(p => ({ ...p, [cls.id]: res.success ? 'success' : 'error' }));
    } catch {
      setLockResults(p => ({ ...p, [cls.id]: 'error' }));
    } finally {
      setLocking(p => ({ ...p, [cls.id]: false }));
    }
  };

  return (
    <div className="gc-root">
      {/* Header */}
      <div className="gc-top-bar">
        <div>
          <h1 className="tch-page-title" style={{ margin: 0 }}>Grade Completion</h1>
          <p className="tch-page-sub" style={{ margin: '2px 0 0' }}>
            {currentTerm ? `${currentTerm.name} ${currentTerm.academicYear}` : 'Current term'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="tch-btn tch-btn--ghost"
            onClick={() => exportCSV(rows, `grade-completion-${new Date().toISOString().slice(0,10)}.csv`)}
          >
            <span className="material-symbols-outlined">download</span>
            Export CSV
          </button>
          <button className="tch-btn tch-btn--primary" onClick={() => navigateTo('grade-entry')}>
            <span className="material-symbols-outlined">edit_note</span>
            Enter Grades
          </button>
        </div>
      </div>

      {/* Deadline warning */}
      {deadlineWarning && (totalDraft > 0 || totalPending > 0) && (
        <div className={`tch-home__deadline tch-home__deadline--${deadlineWarning.level}`} style={{ marginBottom: 20 }}>
          <span className="material-symbols-outlined">schedule</span>
          <div className="tch-home__deadline-text">
            <strong>Grade Entry Deadline:</strong> {deadlineWarning.text} —{' '}
            {totalPending + totalDraft} grade{(totalPending + totalDraft) !== 1 ? 's' : ''} still need attention.
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="gc-summary-row">
        {[
          { label: 'Total Students', value: totalStudents, icon: 'groups', cls: '' },
          { label: 'Locked',         value: totalLocked,   icon: 'lock',   cls: '--primary' },
          { label: 'Draft',          value: totalDraft,    icon: 'edit_note', cls: totalDraft > 0 ? '--amber' : '' },
          { label: 'Pending',        value: totalPending,  icon: 'pending_actions', cls: totalPending > 0 ? '--amber' : '' },
        ].map(s => (
          <div key={s.label} className="gc-stat-card">
            <p className="gc-stat-label">{s.label}</p>
            <p className={`gc-stat-value gc-stat-value${s.cls}`}>{String(s.value).padStart(2, '0')}</p>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div className="gc-overall-bar-wrap">
        <div className="gc-overall-bar-label">
          <span>Overall completion</span>
          <strong>{overallPct}%</strong>
        </div>
        <div className="gc-overall-bar">
          <motion.div
            className="gc-overall-bar__fill"
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Per-class table */}
      {rows.length === 0 ? (
        <div className="tch-empty">
          <span className="material-symbols-outlined">school</span>
          <p>No classes assigned yet</p>
        </div>
      ) : (
        <div className="gc-table-wrap">
          <table className="gc-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Subject</th>
                <th className="gc-th-num">Total</th>
                <th className="gc-th-num">Locked</th>
                <th className="gc-th-num">Draft</th>
                <th className="gc-th-num">Pending</th>
                <th className="gc-th-bar">Progress</th>
                <th className="gc-th-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((cls, i) => (
                <motion.tr
                  key={`${cls.id}-${cls.subject?.id}`}
                  className={`gc-row ${cls.pct === 100 ? 'gc-row--complete' : ''}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <td className="gc-td-name">
                    <span className="gc-class-name">{cls.name}</span>
                  </td>
                  <td className="gc-td-subject">{cls.subject?.name}</td>
                  <td className="gc-td-num">{cls.total}</td>
                  <td className="gc-td-num">
                    <span className="tch-badge tch-badge--green">{cls.locked}</span>
                  </td>
                  <td className="gc-td-num">
                    {cls.draft > 0
                      ? <span className="tch-badge tch-badge--amber">{cls.draft}</span>
                      : <span className="gc-zero">0</span>}
                  </td>
                  <td className="gc-td-num">
                    {cls.pending > 0
                      ? <span className="tch-badge tch-badge--grey">{cls.pending}</span>
                      : <span className="gc-zero">0</span>}
                  </td>
                  <td className="gc-td-bar">
                    <div className="gc-bar">
                      <div className="gc-bar__fill" style={{ width: `${cls.pct}%` }} />
                    </div>
                    <span className="gc-bar-pct">{cls.pct}%</span>
                  </td>
                  <td className="gc-td-action">
                    {cls.pct === 100 ? (
                      <span className="tch-badge tch-badge--green">
                        <span className="material-symbols-outlined">check_circle</span>
                        Complete
                      </span>
                    ) : lockResults[cls.id] === 'success' ? (
                      <span className="tch-badge tch-badge--green">Locked</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {cls.draft > 0 && (
                          <button
                            className="tch-btn tch-btn--sm tch-btn--primary"
                            disabled={locking[cls.id]}
                            onClick={() => handleBulkLock(cls)}
                            title="Lock all drafts for this class"
                          >
                            <span className="material-symbols-outlined">lock</span>
                            {locking[cls.id] ? 'Locking…' : `Lock ${cls.draft}`}
                          </button>
                        )}
                        <button
                          className="tch-btn tch-btn--sm tch-btn--ghost"
                          onClick={() => navigateTo('grade-entry')}
                          title="Enter grades"
                        >
                          <span className="material-symbols-outlined">edit_note</span>
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
