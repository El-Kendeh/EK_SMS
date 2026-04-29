import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacherApi';
import './ExamResultsScreen.css';

const TYPE_LABELS = {
  ca: 'C.A.', midterm: 'Midterm', final: 'Final', mock: 'Mock', quiz: 'Quiz',
  homework: 'Homework', test: 'Test', project: 'Project',
};

function gradeColor(pct) {
  if (pct >= 80) return '#059669';
  if (pct >= 65) return '#3b82f6';
  if (pct >= 50) return '#8b5cf6';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}

function autoLetter(marks, totalMarks) {
  if (!marks || !totalMarks) return '';
  const pct = (parseFloat(marks) / parseFloat(totalMarks)) * 100;
  if (pct >= 80) return 'A';
  if (pct >= 65) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  if (pct > 0)   return 'E';
  return 'I';
}

export default function ExamResultsScreen({ navigateTo }) {
  const { assignedClasses } = useTeacher();
  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [examData, setExamData] = useState(null);
  const [examLoading, setExamLoading] = useState(false);
  const [marks, setMarks] = useState({});
  const [remarks, setRemarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Load exams
  useEffect(() => {
    setExamsLoading(true);
    teacherApi.getTeacherExams(filterClass || undefined)
      .then(data => setExams(data.exams || []))
      .catch(() => setExams([]))
      .finally(() => setExamsLoading(false));
  }, [filterClass]);

  // Load exam results when an exam is selected
  useEffect(() => {
    if (!selectedExamId) { setExamData(null); setMarks({}); setRemarks({}); return; }
    setExamLoading(true);
    teacherApi.getExamResults(selectedExamId)
      .then(data => {
        setExamData(data);
        const m = {};
        const r = {};
        (data.results || []).forEach(s => {
          if (s.marks !== null) m[s.student_id] = String(s.marks);
          r[s.student_id] = s.remarks || '';
        });
        setMarks(m);
        setRemarks(r);
      })
      .catch(() => setExamData(null))
      .finally(() => setExamLoading(false));
  }, [selectedExamId]);

  const handleSave = async () => {
    if (!selectedExamId || !examData) return;
    setSaveError('');
    setSaving(true);
    try {
      const results = (examData.results || []).map(s => ({
        student_id: s.student_id,
        marks: marks[s.student_id] !== undefined ? parseFloat(marks[s.student_id]) : null,
        remarks: remarks[s.student_id] || '',
      })).filter(r => r.marks !== null && !isNaN(r.marks));

      const res = await teacherApi.saveExamResults(selectedExamId, results);
      if (res.success) {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 3000);
      } else {
        setSaveError(res.message || 'Failed to save results.');
      }
    } catch {
      setSaveError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    if (!examData) return null;
    const entered = examData.results.filter(s => marks[s.student_id] !== undefined && marks[s.student_id] !== '');
    const total = examData.results.length;
    const avg = entered.length > 0
      ? (entered.reduce((s, r) => s + parseFloat(marks[r.student_id] || 0), 0) / entered.length).toFixed(1)
      : null;
    const highest = entered.length > 0
      ? Math.max(...entered.map(r => parseFloat(marks[r.student_id] || 0)))
      : null;
    return { entered: entered.length, total, avg, highest };
  }, [examData, marks]);

  return (
    <div className="er-root">
      {/* Header */}
      <div className="er-top-bar">
        <div>
          <h1 className="tch-page-title" style={{ margin: 0 }}>Exam Results Entry</h1>
          <p className="tch-page-sub" style={{ margin: '2px 0 0' }}>
            Enter and save student marks for exams and tests
          </p>
        </div>
      </div>

      <div className="er-layout">
        {/* Left: Exam selector */}
        <div className="er-exam-list-panel">
          <div className="er-list-header">
            <p className="er-section-label">Select Exam</p>
            <select
              className="tch-select er-class-filter"
              value={filterClass}
              onChange={e => { setFilterClass(e.target.value); setSelectedExamId(null); }}
            >
              <option value="">All Classes</option>
              {assignedClasses.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          {examsLoading ? (
            <div style={{ padding: 16 }}>
              {[0,1,2].map(i => <div key={i} className="tch-skeleton" style={{ height: 56, marginBottom: 8 }} />)}
            </div>
          ) : exams.length === 0 ? (
            <div className="tch-empty" style={{ padding: '32px 16px' }}>
              <span className="material-symbols-outlined">quiz</span>
              <p>No exams found</p>
              <p style={{ fontSize: 12, color: 'var(--tch-text-secondary)' }}>
                Exams are created by the school admin. Ask your admin to create exams for your classes.
              </p>
            </div>
          ) : (
            <div className="er-exam-list">
              {exams.map(exam => (
                <button
                  key={exam.id}
                  className={`er-exam-item ${selectedExamId === exam.id ? 'er-exam-item--active' : ''}`}
                  onClick={() => setSelectedExamId(exam.id)}
                >
                  <div className="er-exam-item-top">
                    <span className="er-exam-name">{exam.name}</span>
                    <span className="tch-badge tch-badge--grey" style={{ fontSize: 10 }}>
                      {TYPE_LABELS[exam.exam_type] || exam.exam_type}
                    </span>
                  </div>
                  <div className="er-exam-item-meta">
                    <span>{exam.classroom}</span>
                    <span>·</span>
                    <span>{exam.subject}</span>
                    <span>·</span>
                    <span>{exam.date}</span>
                  </div>
                  <div className="er-exam-item-meta">
                    <span>{exam.result_count} results entered</span>
                    <span>·</span>
                    <span>/{exam.total_marks} marks</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Results entry */}
        <div className="er-entry-panel">
          {!selectedExamId ? (
            <div className="tch-empty" style={{ padding: '80px 20px' }}>
              <span className="material-symbols-outlined">fact_check</span>
              <p>Select an exam to enter results</p>
            </div>
          ) : examLoading ? (
            <div style={{ padding: 20 }}>
              {[0,1,2,3,4].map(i => <div key={i} className="tch-skeleton" style={{ height: 48, marginBottom: 8 }} />)}
            </div>
          ) : examData ? (
            <>
              {/* Exam info */}
              <div className="er-exam-info-bar">
                <div>
                  <h2 className="er-exam-title">{examData.exam.name}</h2>
                  <p className="er-exam-meta">
                    {examData.exam.classroom} · {examData.exam.subject} · {examData.exam.date}
                    · <strong>/{examData.exam.total_marks} marks</strong>
                  </p>
                </div>
                {stats && (
                  <div className="er-stats-row">
                    <div className="er-stat"><p>{stats.entered}/{stats.total}</p><span>Entered</span></div>
                    {stats.avg && <div className="er-stat"><p>{stats.avg}</p><span>Avg marks</span></div>}
                    {stats.highest && <div className="er-stat"><p>{stats.highest}</p><span>Highest</span></div>}
                  </div>
                )}
              </div>

              {/* Flash/error */}
              <AnimatePresence>
                {savedFlash && (
                  <motion.div
                    className="er-saved-flash"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="material-symbols-outlined">check_circle</span>
                    Results saved successfully.
                  </motion.div>
                )}
              </AnimatePresence>
              {saveError && <p className="er-save-error">{saveError}</p>}

              {/* Student rows */}
              <div className="er-results-list">
                <div className="er-results-header">
                  <span className="er-col-name">Student</span>
                  <span className="er-col-marks">Marks (/{examData.exam.total_marks})</span>
                  <span className="er-col-letter">Grade</span>
                  <span className="er-col-remarks">Remarks</span>
                </div>
                {(examData.results || []).map((s, i) => {
                  const val = marks[s.student_id] ?? '';
                  const pct = val !== '' && examData.exam.total_marks
                    ? (parseFloat(val) / parseFloat(examData.exam.total_marks)) * 100
                    : null;
                  const letter = val !== '' ? autoLetter(val, examData.exam.total_marks) : '';
                  return (
                    <motion.div
                      key={s.student_id}
                      className="er-student-row"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <span className="er-col-name er-student-name">{s.student_name}</span>
                      <div className="er-col-marks">
                        <input
                          type="number"
                          className="tch-input er-marks-input"
                          value={val}
                          min={0}
                          max={examData.exam.total_marks}
                          step="0.5"
                          placeholder="—"
                          onChange={e => setMarks(p => ({ ...p, [s.student_id]: e.target.value }))}
                        />
                      </div>
                      <div className="er-col-letter">
                        {letter ? (
                          <span className="er-letter-badge" style={{ color: pct !== null ? gradeColor(pct) : 'inherit' }}>
                            {letter}
                          </span>
                        ) : <span className="er-letter-placeholder">—</span>}
                      </div>
                      <div className="er-col-remarks">
                        <input
                          type="text"
                          className="tch-input er-remarks-input"
                          value={remarks[s.student_id] || ''}
                          placeholder="Optional..."
                          maxLength={100}
                          onChange={e => setRemarks(p => ({ ...p, [s.student_id]: e.target.value }))}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Save button */}
              <div className="er-save-bar">
                <button
                  className="tch-btn tch-btn--primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <span className="material-symbols-outlined">{saving ? 'sync' : 'save'}</span>
                  {saving ? 'Saving…' : 'Save Results'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
