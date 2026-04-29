import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { teacherApi } from '../../api/teacherApi';
import './StudentProfileDrawer.css';

const GRADE_COLOR = (score) => {
  if (score >= 80) return '#059669';
  if (score >= 65) return '#3b82f6';
  if (score >= 50) return '#8b5cf6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
};

const TABS = ['Profile', 'Academic History', 'Report Cards'];

export default function StudentProfileDrawer({ student, onClose }) {
  const grade = student.currentGrade;
  const [activeTab, setActiveTab] = useState('Profile');
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reportCards, setReportCards] = useState(null);
  const [rcLoading, setRcLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'Academic History' && history === null) {
      setHistoryLoading(true);
      teacherApi.getStudentGradeHistory(student.id)
        .then(data => setHistory(data.history || []))
        .catch(() => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
    if (activeTab === 'Report Cards' && reportCards === null) {
      setRcLoading(true);
      teacherApi.getStudentReportCards(student.id)
        .then(data => setReportCards(data.report_cards || []))
        .catch(() => setReportCards([]))
        .finally(() => setRcLoading(false));
    }
  }, [activeTab, student.id, history, reportCards]);

  return (
    <>
      <motion.div
        className="tch-drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="tch-drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      >
        <div className="tch-drawer__header">
          <h3 className="tch-drawer__title">Student Profile</h3>
          <button className="tch-drawer__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Hero */}
        <div className="spd-hero">
          <div className="spd-avatar" style={{ background: student.avatarColor }}>
            {student.initials}
          </div>
          <div>
            <h3 className="spd-name">{student.fullName}</h3>
            <p className="spd-num">{student.studentNumber}</p>
            <span className="tch-badge tch-badge--primary">{student.className}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="spd-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`spd-tab-btn ${activeTab === tab ? 'spd-tab-btn--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="tch-drawer__body" style={{ paddingTop: 0 }}>
          {/* ── Profile Tab ── */}
          {activeTab === 'Profile' && (
            <>
              <div className="spd-grade-card">
                <p className="spd-section-label">Current Grade — {student.subjectName}</p>
                <div className="spd-grade-main">
                  <span className="spd-score" style={{ color: grade.score !== null ? GRADE_COLOR(grade.score) : 'var(--tch-text-secondary)' }}>
                    {grade.score !== null ? `${grade.score}%` : 'No grade yet'}
                  </span>
                  {grade.gradeLetter && (
                    <span className="spd-letter">{grade.gradeLetter}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <span className={`tch-badge ${
                    grade.status === 'locked' ? 'tch-badge--green' :
                    grade.status === 'draft'  ? 'tch-badge--amber' : 'tch-badge--grey'
                  }`}>{grade.status}</span>
                  {grade.hasModificationAttempt && (
                    <span className="tch-badge tch-badge--red">
                      <span className="material-symbols-outlined">warning</span>
                      Mod. Attempt
                    </span>
                  )}
                </div>
                {grade.remarks && <p className="spd-remarks">"{grade.remarks}"</p>}
              </div>

              <p className="spd-section-label">Details</p>
              <div className="spd-info-list">
                <div className="spd-info-row"><span>Student Number</span><strong>{student.studentNumber}</strong></div>
                <div className="spd-info-row"><span>Class</span><strong>{student.className}</strong></div>
                <div className="spd-info-row"><span>Subject</span><strong>{student.subjectName}</strong></div>
                <div className="spd-info-row"><span>Gender</span><strong style={{ textTransform: 'capitalize' }}>{student.gender}</strong></div>
              </div>
            </>
          )}

          {/* ── Academic History Tab ── */}
          {activeTab === 'Academic History' && (
            <div className="spd-history">
              {historyLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {[0,1,2].map(i => <div key={i} className="tch-skeleton" style={{ height: 60 }} />)}
                </div>
              ) : !history || history.length === 0 ? (
                <div className="tch-empty" style={{ padding: '40px 0' }}>
                  <span className="material-symbols-outlined">history_edu</span>
                  <p>No grade history available</p>
                </div>
              ) : (
                history.map(term => (
                  <div key={term.term_id} className="spd-term-block">
                    <div className="spd-term-header">
                      <span className="spd-term-name">{term.term_name}</span>
                      <span className="tch-chip">{term.academic_year}</span>
                      <span
                        className="tch-badge"
                        style={{ marginLeft: 'auto', background: `${GRADE_COLOR(term.average)}22`, color: GRADE_COLOR(term.average), border: 'none' }}
                      >
                        Avg {term.average}%
                      </span>
                    </div>
                    <div className="spd-term-grades">
                      {term.grades.map((g, gi) => (
                        <div key={gi} className="spd-grade-row">
                          <span className="spd-grade-subject">{g.subject}</span>
                          <div className="spd-grade-scores">
                            <span className="spd-score-chip" title="C.A.">CA {g.ca}</span>
                            <span className="spd-score-chip" title="Midterm">MT {g.midterm}</span>
                            <span className="spd-score-chip" title="Final">FE {g.final}</span>
                          </div>
                          <span
                            className="spd-total-badge"
                            style={{ color: GRADE_COLOR(g.total) }}
                          >
                            {g.total}% {g.grade_letter}
                          </span>
                          {g.is_locked && (
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--tch-primary)', flexShrink: 0 }}>lock</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Report Cards Tab ── */}
          {activeTab === 'Report Cards' && (
            <div className="spd-report-cards">
              {rcLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {[0,1].map(i => <div key={i} className="tch-skeleton" style={{ height: 70 }} />)}
                </div>
              ) : !reportCards || reportCards.length === 0 ? (
                <div className="tch-empty" style={{ padding: '40px 0' }}>
                  <span className="material-symbols-outlined">description</span>
                  <p>No published report cards</p>
                </div>
              ) : (
                reportCards.map(rc => (
                  <div key={rc.id} className="spd-rc-item">
                    <div className="spd-rc-left">
                      <span className="material-symbols-outlined spd-rc-icon">description</span>
                      <div>
                        <p className="spd-rc-term">{rc.term} — {rc.academic_year}</p>
                        <p className="spd-rc-meta">
                          {rc.average_score !== null ? `Avg: ${rc.average_score}%` : ''}
                          {rc.class_rank ? ` · Rank ${rc.class_rank}/${rc.class_size}` : ''}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {rc.is_published ? (
                        <span className="tch-badge tch-badge--green">Published</span>
                      ) : (
                        <span className="tch-badge tch-badge--grey">Draft</span>
                      )}
                      {rc.pdf_url && (
                        <a
                          href={rc.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="tch-btn tch-btn--ghost tch-btn--sm"
                          title="Download PDF"
                        >
                          <span className="material-symbols-outlined">download</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
