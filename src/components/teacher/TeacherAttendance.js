import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { mockStudents, mockAttendanceSessions } from '../../mock/teacherMockData';
import './TeacherAttendance.css';

const STATUS_OPTS = ['present', 'absent', 'late'];

const STATUS_META = {
  present: { label: 'Present', icon: 'check_circle', cls: 'ta-btn--present' },
  absent:  { label: 'Absent',  icon: 'cancel',       cls: 'ta-btn--absent' },
  late:    { label: 'Late',    icon: 'schedule',      cls: 'ta-btn--late' },
};

export default function TeacherAttendance() {
  const { assignedClasses, selectedClassId, setSelectedClassId } = useTeacher();
  const [attendance, setAttendance] = useState({});
  const [sessionNote, setSessionNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const selectedClass = assignedClasses.find(c => c.id === selectedClassId);
  const students = selectedClassId ? (mockStudents[selectedClassId] || []) : [];
  const pastSessions = selectedClassId ? (mockAttendanceSessions[selectedClassId] || []) : [];

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const stats = useMemo(() => {
    const values = Object.values(attendance);
    return {
      present: values.filter(v => v === 'present').length,
      absent:  values.filter(v => v === 'absent').length,
      late:    values.filter(v => v === 'late').length,
      total:   students.length,
    };
  }, [attendance, students.length]);

  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100)
    : 0;

  const allMarked = students.length > 0 && students.every(s => attendance[s.id]);

  const markAll = (status) => {
    const next = {};
    students.forEach(s => { next[s.id] = status; });
    setAttendance(next);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setAttendance({});
    setSessionNote('');
    setSubmitted(false);
  };

  return (
    <div className="ta-root">
      <div className="ta-top-bar">
        <div>
          <h1 className="tch-page-title" style={{ margin: 0 }}>Session Attendance</h1>
          {selectedClass && (
            <p className="tch-page-sub" style={{ margin: '2px 0 0' }}>
              {selectedClass.name} · {selectedClass.subject.name}
            </p>
          )}
        </div>
        {selectedClassId && (
          <button
            className="tch-btn tch-btn--ghost tch-btn--sm"
            onClick={() => setShowHistory(p => !p)}
          >
            <span className="material-symbols-outlined">history</span>
            {showHistory ? 'Take Attendance' : 'View History'}
          </button>
        )}
      </div>

      {/* Class selector */}
      <div style={{ marginBottom: 20 }}>
        <label className="tch-label">Class</label>
        <select
          className="tch-select"
          style={{ maxWidth: 320 }}
          value={selectedClassId || ''}
          onChange={e => { setSelectedClassId(e.target.value); setAttendance({}); setSubmitted(false); }}
        >
          <option value="">— Select a class —</option>
          {assignedClasses.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name} — {cls.subject.name}</option>
          ))}
        </select>
      </div>

      {!selectedClassId && (
        <div className="tch-empty">
          <span className="material-symbols-outlined">how_to_reg</span>
          <p>Select a class to take attendance</p>
        </div>
      )}

      {selectedClassId && showHistory && (
        <div className="ta-history">
          <p className="ta-section-label">Past Sessions</p>
          {pastSessions.length === 0 ? (
            <div className="tch-empty" style={{ padding: '32px 0' }}>
              <span className="material-symbols-outlined">event_busy</span>
              <p>No past sessions recorded</p>
            </div>
          ) : (
            <div className="ta-history-list">
              {pastSessions.map(s => (
                <div key={s.id} className="ta-history-card">
                  <div className="ta-history-card__left">
                    <p className="ta-history-card__date">{new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    <p className="ta-history-card__period">{s.period} · {s.room}</p>
                  </div>
                  <div className="ta-history-card__stats">
                    <span className="ta-stat ta-stat--present"><span className="material-symbols-outlined">check_circle</span>{s.present}</span>
                    <span className="ta-stat ta-stat--absent"><span className="material-symbols-outlined">cancel</span>{s.absent}</span>
                    <span className="ta-stat ta-stat--late"><span className="material-symbols-outlined">schedule</span>{s.late}</span>
                  </div>
                  <span className={`tch-badge ${Math.round(((s.present + s.late) / s.total) * 100) >= 80 ? 'tch-badge--green' : 'tch-badge--amber'}`}>
                    {Math.round(((s.present + s.late) / s.total) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedClassId && !showHistory && (
        <>
          {/* Success state */}
          <AnimatePresence>
            {submitted && (
              <motion.div
                className="ta-success"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <span className="material-symbols-outlined ta-success__icon">task_alt</span>
                <div>
                  <p className="ta-success__title">Attendance Submitted</p>
                  <p className="ta-success__sub">
                    {stats.present} present · {stats.absent} absent · {stats.late} late — logged to student records. Parents notified.
                  </p>
                </div>
                <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={handleReset}>
                  New Session
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!submitted && (
            <>
              {/* Date + stats bar */}
              <div className="ta-session-header">
                <div className="ta-session-info">
                  <span className="material-symbols-outlined">calendar_today</span>
                  <span>{today}</span>
                </div>
                <div className="ta-stats-bar">
                  <div className="ta-stat-chip ta-stat-chip--present">
                    <span className="material-symbols-outlined">check_circle</span>
                    <span>{stats.present}</span>
                    <span className="ta-stat-chip__label">Present</span>
                  </div>
                  <div className="ta-stat-chip ta-stat-chip--absent">
                    <span className="material-symbols-outlined">cancel</span>
                    <span>{stats.absent}</span>
                    <span className="ta-stat-chip__label">Absent</span>
                  </div>
                  <div className="ta-stat-chip ta-stat-chip--late">
                    <span className="material-symbols-outlined">schedule</span>
                    <span>{stats.late}</span>
                    <span className="ta-stat-chip__label">Late</span>
                  </div>
                  <div className="ta-stat-chip ta-stat-chip--rate">
                    <span className="material-symbols-outlined">percent</span>
                    <span>{attendanceRate}%</span>
                    <span className="ta-stat-chip__label">Rate</span>
                  </div>
                </div>
              </div>

              {/* Quick mark */}
              <div className="ta-quick-mark">
                <span style={{ fontSize: 12, color: 'var(--tch-text-secondary)', fontWeight: 600 }}>Mark all:</span>
                {STATUS_OPTS.map(s => (
                  <button key={s} className={`tch-btn tch-btn--ghost tch-btn--sm ta-quick-btn ta-quick-btn--${s}`} onClick={() => markAll(s)}>
                    <span className="material-symbols-outlined">{STATUS_META[s].icon}</span>
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>

              {/* Student list */}
              <div className="tch-card ta-student-list">
                {students.length === 0 ? (
                  <div className="tch-empty"><span className="material-symbols-outlined">group</span><p>No students in this class</p></div>
                ) : students.map((student, idx) => {
                  const status = attendance[student.id] || null;
                  return (
                    <motion.div
                      key={student.id}
                      className={`ta-student-row ${status ? `ta-student-row--${status}` : ''}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <div className="ta-student-row__left">
                        <span className="ta-student-row__num">{idx + 1}</span>
                        <div className="ta-student-avatar" style={{ background: student.avatarColor }}>
                          {student.initials}
                        </div>
                        <div>
                          <p className="ta-student-name">{student.fullName}</p>
                          <p className="ta-student-num">{student.studentNumber}</p>
                        </div>
                      </div>
                      <div className="ta-status-btns">
                        {STATUS_OPTS.map(s => (
                          <button
                            key={s}
                            className={`ta-status-btn ${STATUS_META[s].cls} ${status === s ? 'ta-status-btn--active' : ''}`}
                            onClick={() => setAttendance(prev => ({ ...prev, [student.id]: s }))}
                            title={STATUS_META[s].label}
                          >
                            <span className="material-symbols-outlined">{STATUS_META[s].icon}</span>
                            <span className="ta-status-btn__label">{STATUS_META[s].label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Note + submit */}
              <div className="ta-footer">
                <div className="ta-note-wrap">
                  <label className="tch-label">Session Note <span style={{ color: 'var(--tch-text-secondary)', fontWeight: 400 }}>(optional)</span></label>
                  <textarea
                    className="tch-textarea"
                    rows={2}
                    placeholder="Add any notes about this session..."
                    value={sessionNote}
                    onChange={e => setSessionNote(e.target.value)}
                  />
                </div>

                <div className="ta-footer-info">
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--tch-text-secondary)' }}>info</span>
                  <p className="ta-footer-info__text">
                    Once submitted, attendance will be logged to student records and parents will be notified via the portal.
                  </p>
                </div>

                <button
                  className="tch-btn tch-btn--primary ta-submit-btn"
                  disabled={!allMarked || submitting}
                  onClick={handleSubmit}
                >
                  <span className="material-symbols-outlined">{submitting ? 'sync' : 'how_to_reg'}</span>
                  {submitting ? 'Submitting…' : `Submit Attendance (${students.length} students)`}
                </button>

                {!allMarked && students.length > 0 && (
                  <p className="ta-unmarked-hint">
                    {students.length - Object.keys(attendance).length} student{students.length - Object.keys(attendance).length !== 1 ? 's' : ''} not yet marked
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
