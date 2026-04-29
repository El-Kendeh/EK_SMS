import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { useGradeEntry } from '../../hooks/useGradeEntry';
import { getDeadlineWarning } from '../../utils/gradeUtils';
import GradeEntryRow from './GradeEntryRow';
import SubmitConfirmModal from './SubmitConfirmModal';
import GradeAuditPanel from './GradeAuditPanel';
import ModificationRequest from './ModificationRequest';
import './GradeEntry.css';

function AutoSaveIndicator({ status }) {
  const configs = {
    idle:    { icon: 'cloud_done', label: 'Changes saved', cls: '' },
    saving:  { icon: 'sync', label: 'Saving…', cls: 'tch-autosave--saving' },
    saved:   { icon: 'cloud_done', label: 'Saved', cls: 'tch-autosave--saved' },
    error:   { icon: 'cloud_off', label: 'Save failed', cls: 'tch-autosave--error' },
  };
  const c = configs[status] || configs.idle;
  return (
    <span className={`tch-autosave ${c.cls}`}>
      <span className={`material-symbols-outlined ${status === 'saving' ? 'tch-spin' : ''}`}>{c.icon}</span>
      {c.label}
    </span>
  );
}

function GradingSchemeCard({ scheme, collapsed, onToggle }) {
  if (!scheme) return null;
  return (
    <div className="ge-scheme-card">
      <button className="ge-scheme-card__toggle" onClick={onToggle}>
        <span className="material-symbols-outlined">grading</span>
        Grading Scheme Reference
        <span className="material-symbols-outlined ge-scheme-card__chevron" style={{ transform: collapsed ? 'none' : 'rotate(180deg)' }}>
          expand_more
        </span>
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="ge-scheme-card__body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="ge-scheme-card__pills">
              {scheme.boundaries.map(b => (
                <div key={b.letter} className="ge-scheme-pill">
                  <span className="ge-scheme-pill__letter" style={{ color: b.color }}>{b.letter}</span>
                  <span className="ge-scheme-pill__range">{b.min}–{b.max}%</span>
                </div>
              ))}
            </div>
            <p className="ge-scheme-card__pass">Pass mark: {scheme.passMark}%</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GradeEntry({ navigateTo }) {
  const { assignedClasses, selectedClassId, setSelectedClassId, autoSaveStatus, currentTerm, setActionFeedback } = useTeacher();
  const { students, scheme, loading, error, localGrades, updateGrade, getComputedGradeLetter, submitGrades } = useGradeEntry(selectedClassId);

  const [schemeCollapsed, setSchemeCollapsed] = useState(true);
  const [selected, setSelected] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [auditGrade, setAuditGrade] = useState(null);
  const [modGrade, setModGrade] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [search, setSearch] = useState('');

  const selectedClass = assignedClasses.find(c => c.id === selectedClassId);

  const filteredStudents = useMemo(() => {
    if (!search) return students;
    const q = search.toLowerCase();
    return students.filter(s =>
      s.fullName.toLowerCase().includes(q) ||
      s.studentNumber.toLowerCase().includes(q)
    );
  }, [students, search]);

  const editableStudents = filteredStudents.filter(s => s.currentGrade.status !== 'locked');
  const selectableIds = editableStudents
    .filter(s => {
      const score = localGrades[s.id]?.score;
      return score !== '' && score !== null && score !== undefined;
    })
    .map(s => s.id);

  const toggleSelect = (id) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const toggleSelectAll = () => {
    const allSelected = selectableIds.every(id => selected[id]);
    const next = {};
    selectableIds.forEach(id => { next[id] = !allSelected; });
    setSelected(next);
  };

  const selectedForSubmit = selectableIds.filter(id => selected[id]);

  const studentsForConfirm = selectedForSubmit.map(id => {
    const s = students.find(st => st.id === id);
    return {
      id,
      name: s?.fullName,
      score: localGrades[id]?.score,
      gradeLetter: getComputedGradeLetter(id),
    };
  });

  const handleSubmit = async () => {
    try {
      const subjectId = selectedClass?.subject?.id;
      const termId = currentTerm?.id;
      const result = await submitGrades(selectedForSubmit, subjectId, termId);
      setSubmitResult({ success: true, count: result.locked });
      setActionFeedback({
        action: 'locked',
        className: selectedClass?.name,
        subjectName: selectedClass?.subject?.name,
        count: result.locked,
        studentsNotified: result.locked,
        parentsNotified: result.locked,
        timestamp: new Date().toISOString(),
      });
      setShowConfirm(false);
      setSelected({});
    } catch (e) {
      setSubmitResult({ success: false, error: e.message });
    }
  };

  const deadlineWarning = getDeadlineWarning(currentTerm?.gradeEntryDeadline);

  if (loading) {
    return (
      <div>
        <h1 className="tch-page-title">Grade Entry</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
          {[0,1,2,3].map(i => (
            <div key={i} className="tch-skeleton" style={{ height: 60 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="tch-page-title">Grade Entry</h1>
        <div className="tch-security-banner">
          <span className="material-symbols-outlined">error</span>
          <div>
            <p className="tch-security-banner__title">Failed to load grades</p>
            <p className="tch-security-banner__text">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ge-root">
      {/* Header row */}
      <div className="ge-top-bar">
        <div className="ge-top-bar__left">
          <h1 className="tch-page-title" style={{ margin: 0 }}>Grade Entry</h1>
          {selectedClass && (
            <span className="tch-badge tch-badge--primary ge-class-badge">
              {selectedClass.name} · {selectedClass.subject.name}
            </span>
          )}
        </div>
        <AutoSaveIndicator status={autoSaveStatus} />
      </div>

      {/* Class selector */}
      <div className="ge-controls">
        <div style={{ flex: '1 1 220px' }}>
          <label className="tch-label">Class</label>
          <select
            className="tch-select"
            value={selectedClassId || ''}
            onChange={e => setSelectedClassId(e.target.value)}
          >
            <option value="">— Select a class —</option>
            {assignedClasses.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name} — {cls.subject.name}
              </option>
            ))}
          </select>
        </div>
        {currentTerm && (
          <div style={{ flex: '0 1 180px' }}>
            <label className="tch-label">Term</label>
            <div className="ge-term-display">
              {currentTerm.name} · {currentTerm.academicYear}
            </div>
          </div>
        )}
      </div>

      {!selectedClassId && (
        <div className="tch-empty">
          <span className="material-symbols-outlined">edit_note</span>
          <p>Select a class to begin grade entry</p>
        </div>
      )}

      {selectedClassId && (
        <>
          {/* Deadline warning */}
          {deadlineWarning && (
            <div className={`tch-home__deadline tch-home__deadline--${deadlineWarning.level}`}>
              <span className="material-symbols-outlined">schedule</span>
              <span className="tch-home__deadline-text">
                Grade entry deadline: <strong>{currentTerm.gradeEntryDeadline}</strong> — {deadlineWarning.text}
              </span>
            </div>
          )}

          {/* Grading scheme */}
          <GradingSchemeCard
            scheme={scheme}
            collapsed={schemeCollapsed}
            onToggle={() => setSchemeCollapsed(p => !p)}
          />

          {/* Submit result banner */}
          {submitResult && (
            <motion.div
              className={submitResult.success ? 'ge-success-banner' : 'tch-security-banner'}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="material-symbols-outlined">{submitResult.success ? 'lock' : 'error'}</span>
              <div>
                {submitResult.success
                  ? <><p style={{ margin: 0, fontWeight: 700, color: 'var(--tch-primary)' }}>{submitResult.count} grade{submitResult.count !== 1 ? 's' : ''} permanently locked.</p><p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--tch-text-secondary)' }}>Students and parents have been notified.</p></>
                  : <><p className="tch-security-banner__title">Submission failed</p><p className="tch-security-banner__text">{submitResult.error}</p></>
                }
              </div>
              <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => setSubmitResult(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </motion.div>
          )}

          {/* Search + bulk actions */}
          <div className="ge-table-toolbar">
            <div className="tch-search-wrap" style={{ flex: '1 1 240px', marginBottom: 0 }}>
              <span className="material-symbols-outlined">search</span>
              <input
                className="tch-input"
                placeholder="Search student..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="ge-bulk-actions">
              {selectableIds.length > 0 && (
                <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={toggleSelectAll}>
                  {selectableIds.every(id => selected[id]) ? 'Deselect All' : 'Select All'}
                </button>
              )}
              {selectedForSubmit.length > 0 && (
                <button
                  className="tch-btn tch-btn--primary"
                  onClick={() => setShowConfirm(true)}
                >
                  <span className="material-symbols-outlined">lock</span>
                  Submit &amp; Lock {selectedForSubmit.length} Grade{selectedForSubmit.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>

          {/* Grade table */}
          <div className="tch-card ge-table-card">
            <div className="tch-table-wrap">
              <table className="tch-table ge-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Student</th>
                    <th style={{ width: 100 }}>Score</th>
                    <th style={{ width: 80 }}>Grade</th>
                    <th>Remarks</th>
                    <th style={{ width: 100 }}>Status</th>
                    <th style={{ width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--tch-text-secondary)' }}>
                        No students found
                      </td>
                    </tr>
                  ) : filteredStudents.map((student, idx) => (
                    <GradeEntryRow
                      key={student.id}
                      index={idx + 1}
                      tabIndex={idx + 1}
                      student={student}
                      localScore={localGrades[student.id]?.score ?? ''}
                      localRemarks={localGrades[student.id]?.remarks ?? ''}
                      computedGradeLetter={getComputedGradeLetter(student.id)}
                      scheme={scheme}
                      isSelected={!!selected[student.id]}
                      canSelect={selectableIds.includes(student.id)}
                      onToggleSelect={() => toggleSelect(student.id)}
                      onScoreChange={val => updateGrade(student.id, 'score', val)}
                      onRemarksChange={val => updateGrade(student.id, 'remarks', val)}
                      onViewHistory={() => setAuditGrade(student.currentGrade)}
                      onRequestMod={() => setModGrade({ ...student.currentGrade, studentName: student.fullName, studentId: student.id })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Floating submit bar when selection exists */}
          <AnimatePresence>
            {selectedForSubmit.length > 0 && (
              <motion.div
                className="ge-float-bar"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <span className="ge-float-bar__label">
                  <span className="material-symbols-outlined">check_box</span>
                  {selectedForSubmit.length} grade{selectedForSubmit.length !== 1 ? 's' : ''} selected
                </span>
                <button className="tch-btn tch-btn--primary" onClick={() => setShowConfirm(true)}>
                  <span className="material-symbols-outlined">lock</span>
                  Submit &amp; Lock Selected
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Confirm Modal */}
      <AnimatePresence>
        {showConfirm && (
          <SubmitConfirmModal
            students={studentsForConfirm}
            onConfirm={handleSubmit}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* Audit Panel */}
      <AnimatePresence>
        {auditGrade && (
          <GradeAuditPanel
            grade={auditGrade}
            onClose={() => setAuditGrade(null)}
          />
        )}
      </AnimatePresence>

      {/* Modification Request Modal */}
      <AnimatePresence>
        {modGrade && (
          <div className="ge-modal-overlay" onClick={() => setModGrade(null)}>
            <motion.div
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ maxWidth: 560, width: '100%', margin: '40px auto' }}
            >
              <ModificationRequest
                gradeId={modGrade.id}
                studentName={modGrade.studentName}
                currentScore={modGrade.score}
                currentGradeLetter={modGrade.gradeLetter}
                classId={selectedClassId}
                className={selectedClass?.name}
                subjectName={selectedClass?.subject?.name}
                onCancel={() => setModGrade(null)}
                onSuccess={() => { setModGrade(null); setSubmitResult({ success: true, count: 0, message: 'Modification request submitted for admin review.' }); }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
