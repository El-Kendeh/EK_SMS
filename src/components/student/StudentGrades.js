import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import { useStudentGrades } from '../../hooks/useStudentGrades';
import { getAvatarColor, getGradeColor, ordinalSuffix } from '../../utils/studentUtils';
import TermSelector from './TermSelector';
import GradeHistoryPanel from './GradeHistoryPanel';
import SecurityReportModal from './SecurityReportModal';
import RemedialActionModal from './RemedialActionModal';
import FeedbackThreadPanel from './FeedbackThreadPanel';
import PeerReviewPanel from './PeerReviewPanel';
import GradeAccordion from './GradeAccordion';
import './StudentGrades.css';

export default function StudentGrades({ navigateTo }) {
  const [terms, setTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState(
    () => new URLSearchParams(window.location.search).get('term') || null
  );
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [securityGrade, setSecurityGrade] = useState(null);
  const [remedialGrade, setRemedialGrade] = useState(null);
  const [feedbackGrade, setFeedbackGrade] = useState(null);
  const [peerReviewGrade, setPeerReviewGrade] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [targets, setTargets] = useState(
    () => JSON.parse(localStorage.getItem('stu_grade_targets') || '{}')
  );
  const [expandedId, setExpandedId] = useState(null);

  const updateTarget = (gradeId, value) => {
    setTargets(prev => {
      const next = { ...prev };
      if (value === '' || value === undefined) {
        delete next[gradeId];
      } else {
        next[gradeId] = Number(value);
      }
      localStorage.setItem('stu_grade_targets', JSON.stringify(next));
      return next;
    });
  };

  const saveTargetServerSide = (grade, target) => {
    updateTarget(grade.id, target);
    studentApi.setGoal({
      subjectId: grade.subject?.id,
      target,
      term: selectedTermId,
    }).catch(() => {/* fail silently — local copy is authoritative offline */});
  };

  // Load terms
  useEffect(() => {
    studentApi.getCurrentTerm()
      .then(async (current) => {
        // load all terms; fall back to [current] if unavailable
        try {
          const all = await studentApi.getAllTerms();
          setTerms(Array.isArray(all) ? all : [current]);
        } catch {
          setTerms([current]);
        }
        if (!new URLSearchParams(window.location.search).get('term')) {
          setSelectedTermId(current.id);
          const u = new URL(window.location.href);
          u.searchParams.set('term', current.id);
          window.history.replaceState({}, '', u.toString());
        }
      })
      .catch(() => {});
  }, []);

  const handleTermSelect = (id) => {
    setSelectedTermId(id);
    const u = new URL(window.location.href);
    u.searchParams.set('term', id);
    window.history.pushState({}, '', u.toString());
  };

  const { grades, summary, loading, error } = useStudentGrades(selectedTermId);

  // Sorting
  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortedGrades = [...grades].sort((a, b) => {
    if (!sortField) return 0;
    let valA, valB;
    if (sortField === 'score') { valA = a.score; valB = b.score; }
    else if (sortField === 'subject') { valA = a.subject?.name; valB = b.subject?.name; }
    else if (sortField === 'status') { valA = a.status; valB = b.status; }
    else return 0;

    if (typeof valA === 'number') return sortDir === 'asc' ? valA - valB : valB - valA;
    return sortDir === 'asc'
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="material-symbols-outlined">unfold_more</span>;
    return (
      <span className="material-symbols-outlined">
        {sortDir === 'asc' ? 'expand_more' : 'expand_less'}
      </span>
    );
  };

  const selectedTerm = terms.find((t) => t.id === selectedTermId);
  const avg     = summary?.overallAverage ?? 0;
  const rank    = summary?.classRank ?? null;
  const total   = summary?.totalStudentsInClass ?? null;
  const passed  = summary?.subjectsPassed ?? 0;
  const totalSubj    = summary?.totalSubjects ?? 0;
  const rankPending  = typeof rank !== 'number';

  const cardVariants = {
    hidden:  { opacity: 0, y: 16 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.07 } }),
  };

  return (
    <div className="stu-grades">
      {/* Page header */}
      <div className="stu-grades__header">
        <div>
          <div className="stu-grades__title">My Grades</div>
          {selectedTerm && (
            <div className="stu-grades__subtitle">
              {selectedTerm.name.toUpperCase()} · {selectedTerm.academicYear}
            </div>
          )}
        </div>
        {terms.length > 0 && (
          <TermSelector
            terms={terms}
            selectedTermId={selectedTermId}
            onSelect={handleTermSelect}
          />
        )}
      </div>

      {/* Summary cards */}
      <div className="stu-grades__summary">
        {loading ? (
          <>
            {[0,1,2].map((i) => (
              <div key={i} className="stu-glass-card">
                <div className="skeleton" style={{ height: 11, width: '55%', marginBottom: 16, background: 'rgba(255,255,255,0.08)' }} />
                <div className="skeleton" style={{ height: 48, width: '70%', background: 'rgba(255,255,255,0.08)' }} />
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Overall average */}
            <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible" className="stu-glass-card">
              <div className="stu-glass-card__label">Overall Average</div>
              <div className="stu-glass-card__value">
                {avg.toFixed(1)}<span className="pct">%</span>
              </div>
              <div className="stu-avg-bar">
                <div className="stu-avg-bar-fill" style={{ width: `${avg}%` }} />
              </div>
            </motion.div>

            {/* Class rank */}
            <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible" className="stu-glass-card">
              <div className="stu-glass-card__label">Class Rank</div>
              {rankPending ? (
                <>
                  <div className="stu-glass-card__value" style={{ fontSize: '1rem', opacity: 0.6 }}>Pending</div>
                  <div className="stu-glass-card__sub">
                    <span className="material-symbols-outlined">hourglass_empty</span>
                    Rankings not yet calculated
                  </div>
                </>
              ) : (
                <>
                  <div className="stu-glass-card__value">
                    {ordinalSuffix(rank)}
                    <span className="of"> / {total}</span>
                  </div>
                  <div className="stu-glass-card__sub">
                    <span className="material-symbols-outlined">trending_up</span>
                    {`Top ${Math.round((rank / total) * 100)}% of cohort`}
                  </div>
                </>
              )}
            </motion.div>

            {/* Subjects passed */}
            <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible" className="stu-glass-card">
              <div className="stu-glass-card__label">Subjects Passed</div>
              <div className="stu-glass-card__value">
                {passed}<span className="of"> / {totalSubj}</span>
              </div>
              <div className="stu-passed-dots">
                {Array.from({ length: totalSubj }).map((_, i) => (
                  <div
                    key={i}
                    className={`stu-passed-dot ${i < passed ? 'stu-passed-dot--pass' : 'stu-passed-dot--fail'}`}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="stu-grades__table-wrap">
        {error && (
          <div style={{ padding: 24, color: '#F87171', textAlign: 'center' }}>{error}</div>
        )}
        <div className="stu-grades__table-scroll">
          <table className="stu-grades-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('subject')}>
                  <span className="th-inner">Subject <SortIcon field="subject" /></span>
                </th>
                <th>Teacher</th>
                <th onClick={() => handleSort('score')} style={{ textAlign: 'center' }}>
                  <span className="th-inner">Score <SortIcon field="score" /></span>
                </th>
                <th style={{ textAlign: 'center' }}>Grade</th>
                <th onClick={() => handleSort('status')} style={{ textAlign: 'center' }}>
                  <span className="th-inner">Status <SortIcon field="status" /></span>
                </th>
                <th>Remarks</th>
                <th style={{ textAlign: 'center' }}>History</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {[1,2,3,4,5,6,7].map((j) => (
                        <td key={j}>
                          <div className="skeleton" style={{ height: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : sortedGrades.map((grade, idx) => {
                    const isFailing = grade.score < 50;
                    const gradeColor = getGradeColor(grade.score);
                    const teacherInitials = grade.teacher?.fullName
                      ?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '??';
                    const avatarColor = getAvatarColor(grade.teacher?.fullName || '');

                    return (
                      <>
                      <motion.tr
                        key={grade.id}
                        className={`${isFailing ? 'row--failing' : ''} ${expandedId === grade.id ? 'row--expanded' : ''}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        {/* Subject + expand */}
                        <td>
                          <button
                            className={`stu-row-expand ${expandedId === grade.id ? 'is-open' : ''}`}
                            onClick={() => setExpandedId((cur) => cur === grade.id ? null : grade.id)}
                            aria-expanded={expandedId === grade.id}
                            aria-controls={`grade-acc-${grade.id}`}
                            title="Show CA / Mid-term / Final breakdown"
                          >
                            <span className="material-symbols-outlined">{expandedId === grade.id ? 'expand_less' : 'expand_more'}</span>
                          </button>
                          <div className={`stu-subject-name ${isFailing ? 'stu-subject-name--failing' : ''}`}>
                            {grade.subject?.name}
                          </div>
                          {grade.hasModificationAttempt && (
                            <div className="stu-security-flag">
                              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                              Security alert
                            </div>
                          )}
                        </td>

                        {/* Teacher */}
                        <td>
                          <div className="stu-teacher-cell">
                            <div className="stu-teacher-avatar" style={{ background: avatarColor }}>
                              {teacherInitials}
                            </div>
                            <span className="stu-teacher-name">{grade.teacher?.fullName}</span>
                          </div>
                        </td>

                        {/* Score */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`stu-score ${isFailing ? 'stu-score--failing' : ''}`}>
                            {grade.score}%
                          </span>
                        </td>

                        {/* Grade letter */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="stu-grade-letter" style={{ color: gradeColor }}>
                            {grade.gradeLetter}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: 'center' }}>
                          {grade.status === 'locked' ? (
                            <span className="stu-badge stu-badge--locked">
                              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                              Locked
                            </span>
                          ) : (
                            <span className="stu-badge stu-badge--draft">
                              <span className="material-symbols-outlined">edit_note</span>
                              Draft
                            </span>
                          )}
                        </td>

                        {/* Remarks */}
                        <td>
                          <div className="stu-remarks-cell">
                            <div className="stu-remarks-text">{grade.remarks}</div>
                            <div className="stu-remarks-tooltip">{grade.remarks}</div>
                          </div>
                        </td>

                        {/* History */}
                        <td style={{ textAlign: 'center' }}>
                          <div className="stu-grade-actions">
                            <button
                              className="stu-history-btn"
                              onClick={() => setSelectedGrade(grade)}
                              aria-label={`View history for ${grade.subject?.name}`}
                              title="View audit history"
                            >
                              <span className="material-symbols-outlined">history</span>
                            </button>
                            {grade.hasModificationAttempt && (
                              <button
                                className="stu-action-btn stu-action-btn--security"
                                onClick={() => setSecurityGrade(grade)}
                                title="View security report"
                              >
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                              </button>
                            )}
                            {grade.score < 50 && (
                              <button
                                className="stu-action-btn stu-action-btn--remedial"
                                onClick={() => setRemedialGrade(grade)}
                                title="View support plan"
                              >
                                <span className="material-symbols-outlined">assignment_turned_in</span>
                              </button>
                            )}
                            {grade.hasFeedbackThread && (
                              <button
                                className="stu-action-btn stu-action-btn--feedback"
                                onClick={() => setFeedbackGrade(grade)}
                                title="View feedback thread"
                              >
                                <span className="material-symbols-outlined">chat_bubble</span>
                              </button>
                            )}
                            {grade.hasPeerReview && (
                              <button
                                className="stu-action-btn stu-action-btn--peer"
                                onClick={() => setPeerReviewGrade(grade)}
                                title="View peer review"
                              >
                                <span className="material-symbols-outlined">rate_review</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                      {expandedId === grade.id && (
                        <tr className="stu-grades-acc-row" id={`grade-acc-${grade.id}`}>
                          <td colSpan={7}>
                            <GradeAccordion
                              grade={grade}
                              target={targets[grade.id] ?? null}
                              onSetTarget={(t) => saveTargetServerSide(grade, t)}
                            />
                          </td>
                        </tr>
                      )}
                      </>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust footer */}
      {!loading && (
        <div className="stu-grades__footer">
          <div className="stu-grades__footer-trust">
            <div className="stu-footer-icon">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            </div>
            <div>
              <p>Grade Integrity Protocol</p>
              <p>Locked grades are cryptographically secured and verified by the Office of the Registrar.</p>
            </div>
          </div>
          <div className="stu-grades__footer-actions">
            <button className="stu-footer-btn stu-footer-btn--ghost" onClick={() => window.print()}>
              <span className="material-symbols-outlined">print</span>
              Print Report
            </button>
            <button className="stu-footer-btn stu-footer-btn--primary" onClick={() => navigateTo('report-cards')}>
              <span className="material-symbols-outlined">download</span>
              Download PDF
            </button>
          </div>
        </div>
      )}

      {/* Goal Tracker */}
      {!loading && sortedGrades.length > 0 && (
        <div className="stu-goal-tracker">
          <div className="stu-goal-tracker__header">
            <div className="stu-goal-tracker__title">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>track_changes</span>
              Grade Goals
            </div>
            <div className="stu-goal-tracker__sub">Set your target grade for each subject</div>
          </div>
          <div className="stu-goal-tracker__grid">
            {sortedGrades.map(g => {
              const target = targets[g.id];
              const achieved = target != null && g.score >= target;
              const progress = target ? Math.min(100, Math.round((g.score / target) * 100)) : 0;
              const gap = target != null ? target - g.score : null;
              const barColor = achieved ? 'var(--student-primary)' : progress >= 85 ? '#F59E0B' : '#EF4444';
              return (
                <div key={g.id} className="stu-goal-row">
                  <div className="stu-goal-row__subject">{g.subject?.name}</div>
                  <div className="stu-goal-row__current">{g.score}%</div>
                  <div className="stu-goal-row__input-wrap">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Target"
                      value={target ?? ''}
                      className="stu-goal-input"
                      onChange={e => {
                        const v = e.target.value;
                        if (v === '' || (Number(v) >= 0 && Number(v) <= 100)) {
                          updateTarget(g.id, v === '' ? undefined : v);
                        }
                      }}
                    />
                    <span className="stu-goal-input__unit">%</span>
                  </div>
                  {target != null && (
                    <div className="stu-goal-row__progress">
                      <div className="stu-goal-track">
                        <div className="stu-goal-fill" style={{ width: `${progress}%`, background: barColor }} />
                      </div>
                      <span className="stu-goal-status" style={{ color: achieved ? 'var(--student-primary)' : barColor }}>
                        {achieved ? '✓ Achieved' : `${gap > 0 ? gap : 0}% to go`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grade history drawer */}
      <GradeHistoryPanel
        grade={selectedGrade}
        onClose={() => setSelectedGrade(null)}
      />

      {/* Security report modal */}
      <SecurityReportModal
        gradeId={securityGrade?.id}
        subjectName={securityGrade?.subject?.name}
        onClose={() => setSecurityGrade(null)}
        onContactSchool={() => navigateTo('messages')}
      />

      {/* Remedial action modal */}
      <RemedialActionModal
        gradeId={remedialGrade?.id}
        subjectName={remedialGrade?.subject?.name}
        onClose={() => setRemedialGrade(null)}
      />

      {/* Feedback thread panel */}
      <FeedbackThreadPanel
        grade={feedbackGrade}
        onClose={() => setFeedbackGrade(null)}
      />

      {/* Peer review panel */}
      <PeerReviewPanel
        grade={peerReviewGrade}
        onClose={() => setPeerReviewGrade(null)}
      />
    </div>
  );
}
