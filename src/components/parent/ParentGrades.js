import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParentChildren } from '../../hooks/useParentChildren';
import { useChildGrades } from '../../hooks/useChildGrades';
import { getChildColors, getGradeLetterColor, getStatusMeta, calcOverallAverage } from '../../utils/parentUtils';
import { mockGradeHistoryBySubject } from '../../mock/parentMockData';
import './ParentGrades.css';

const HISTORY_TYPE_META = {
  locked: { icon: 'lock',     color: 'var(--par-primary)',  label: 'VERIFIED',  bg: 'rgba(16,185,129,0.1)' },
  alert:  { icon: 'warning',  color: 'var(--par-error)',    label: 'BLOCKED',   bg: 'rgba(239,68,68,0.08)' },
  draft:  { icon: 'edit_note',color: 'var(--par-text-secondary)', label: 'DRAFT', bg: 'var(--par-surface-low)' },
  ca:     { icon: 'assignment',color: 'var(--par-info)',    label: 'DRAFT',     bg: 'var(--par-info-bg)' },
};

function GradeHistoryDrawer({ grade, onClose }) {
  const history = mockGradeHistoryBySubject[grade.id] || [];

  return (
    <>
      <div className="par-drawer-overlay" onClick={onClose} />
      <motion.aside
        className="par-drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.25 }}
      >
        <div className="par-drawer__header">
          <div>
            <p className="par-drawer__subject-tag">Grade History</p>
            <h3 className="par-drawer__title">{grade.subject}</h3>
          </div>
          <button className="par-drawer__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="par-drawer__timeline">
          {history.length === 0 ? (
            <p style={{ color: 'var(--par-text-secondary)', fontSize: 13 }}>No history available.</p>
          ) : history.map((entry, i) => {
            const meta = HISTORY_TYPE_META[entry.type] || HISTORY_TYPE_META.draft;
            const date = new Date(entry.date);
            const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
            const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={i} className="par-drawer__entry">
                <div className="par-drawer__entry-dot" style={{ background: meta.color }} />
                <div className="par-drawer__entry-card" style={{ background: meta.bg }}>
                  <div className="par-drawer__entry-top">
                    <span className="par-drawer__entry-date">{dateStr}, {timeStr}</span>
                    <span className="par-drawer__entry-badge" style={{ color: meta.color }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: entry.type === 'locked' ? "'FILL' 1" : "'FILL' 0" }}>{meta.icon}</span>
                      {meta.label}
                    </span>
                  </div>
                  <h4 className="par-drawer__entry-title">{entry.event}</h4>
                  <p className="par-drawer__entry-score">{entry.score} <span>Score</span></p>
                  <p className="par-drawer__entry-by">By {entry.by}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="par-drawer__footer">
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--par-primary)' }}>hub</span>
          This audit trail is cryptographically signed and permanent.
        </div>
      </motion.aside>
    </>
  );
}

function GradeRow({ grade, idx, onViewHistory }) {
  const [expanded, setExpanded] = useState(false);
  const statusMeta = getStatusMeta(grade.status);
  const letterColor = getGradeLetterColor(grade.gradeLetter);
  const isFailed = grade.score < 50;

  return (
    <>
      <div
        className={`par-grade-row ${isFailed ? 'par-grade-row--fail' : ''} ${grade.hasAlert ? 'par-grade-row--alert' : ''}`}
        onClick={() => setExpanded((p) => !p)}
        style={{ cursor: 'pointer' }}
      >
        <div className="par-grade-row__subject">{grade.subject}</div>
        <div className="par-grade-row__score" style={{ color: isFailed ? 'var(--par-error)' : 'var(--par-text-primary)' }}>
          {grade.score}
        </div>
        <div className="par-grade-row__letter" style={{ color: letterColor }}>{grade.gradeLetter}</div>
        <div className="par-grade-row__status">
          <span className={`par-status-badge par-status-badge--${statusMeta.color}`}>
            <span className="material-symbols-outlined"
              style={{ fontSize: 11, fontVariationSettings: grade.status === 'locked' ? "'FILL' 1" : "'FILL' 0" }}>
              {statusMeta.icon}
            </span>
            {statusMeta.label}
          </span>
        </div>
        <div className="par-grade-row__remarks">{grade.remarks}</div>
        <div className="par-grade-row__expand">
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--par-text-secondary)' }}>
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </div>

      {/* Alert strip under row */}
      {grade.hasAlert && (
        <div className="par-grade-row__alert-strip">
          <span className="material-symbols-outlined">warning</span>
          <span>MODIFICATION ALERT: {grade.alertMessage}</span>
        </div>
      )}

      {/* Expanded breakdown */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="par-grade-breakdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="par-grade-breakdown__inner">
              <p className="par-grade-breakdown__label">Score Breakdown</p>
              <div className="par-grade-breakdown__grid">
                <div className="par-grade-breakdown__item">
                  <span>Continuous Assessment</span>
                  <strong>{grade.ca}/20</strong>
                </div>
                <div className="par-grade-breakdown__item">
                  <span>Mid-term Exam</span>
                  <strong>{grade.midterm}/30</strong>
                </div>
                <div className="par-grade-breakdown__item">
                  <span>Final Exam</span>
                  <strong>{grade.finalExam}/50</strong>
                </div>
                <div className="par-grade-breakdown__item par-grade-breakdown__item--total">
                  <span>Total</span>
                  <strong>{grade.score}/100</strong>
                </div>
              </div>
              <p className="par-grade-breakdown__teacher">Teacher: {grade.teacher}</p>
              <button
                className="par-grade-breakdown__history-btn"
                onClick={(e) => { e.stopPropagation(); onViewHistory(grade); }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>history</span>
                View Grade History
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function ParentGrades({ children }) {
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [activeTerm, setActiveTerm] = useState('First Term');
  const [historyGrade, setHistoryGrade] = useState(null);
  const { children: loadedChildren } = useParentChildren();
  const resolvedChildren = children?.length ? children : loadedChildren;

  const activeChild = resolvedChildren.find((c) => c.id === selectedChildId) || resolvedChildren[0];
  const { grades, loading } = useChildGrades(activeChild?.id || null);

  const overallAverage = calcOverallAverage(grades);
  const passed = grades.filter((g) => g.score >= 50).length;

  const terms = ['First Term', 'Second Term', 'Third Term'];

  return (
    <div className="par-grades">
      {/* Page header */}
      <div className="par-grades__top">
        <div>
          <h1 className="par-page-header__title">Academic Records</h1>
          <p className="par-page-header__sub">Official performance transcript for the current session.</p>
        </div>

        {/* Child switcher */}
        {resolvedChildren.length > 1 && (
          <div className="par-child-tabs">
            {resolvedChildren.map((child, idx) => {
              const colors = getChildColors(child.colorIndex ?? idx);
              const isActive = (selectedChildId || resolvedChildren[0]?.id) === child.id;
              return (
                <button
                  key={child.id}
                  className={`par-child-tab ${isActive ? 'par-child-tab--active' : ''}`}
                  onClick={() => setSelectedChildId(child.id)}
                >
                  <span className="par-child-tab__dot" style={{ background: colors.bg }} />
                  {child.fullName.split(' ')[0]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary bento */}
      {!loading && grades.length > 0 && (
        <div className="par-stat-grid par-grades__stats">
          <div className="par-stat-card par-stat-card--primary">
            <p className="par-stat-card__label">Class Average</p>
            <p className="par-stat-card__value">{overallAverage}%</p>
            <p className="par-stat-card__sub">
              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>trending_up</span>
              {activeChild?.trend > 0 ? `+${activeChild.trend}%` : `${activeChild?.trend || 0}%`} from Mid-term
            </p>
          </div>
          <div className="par-stat-card">
            <p className="par-stat-card__label">Class Rank</p>
            <p className="par-stat-card__value">{String(activeChild?.classPosition || '—').padStart(2, '0')}</p>
            <p className="par-stat-card__sub">of {activeChild?.totalStudents || '—'} students</p>
          </div>
          <div className="par-stat-card">
            <p className="par-stat-card__label">Subjects Passed</p>
            <p className="par-stat-card__value">{String(passed).padStart(2, '0')}</p>
            <div className="par-stat-card__bar">
              <div style={{ width: `${grades.length > 0 ? (passed / grades.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Grades table */}
      <div className="par-card par-grades__table-card">
        {/* Term tabs */}
        <div className="par-grades__term-tabs">
          {terms.map((t) => (
            <button
              key={t}
              className={`par-grades__term-tab ${activeTerm === t ? 'par-grades__term-tab--active' : ''}`}
              onClick={() => setActiveTerm(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Table header */}
        <div className="par-grades__table-head">
          <div>Subject</div>
          <div>Score</div>
          <div>Grade</div>
          <div>Status</div>
          <div>Remarks</div>
          <div />
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: 24 }}>
            {[0,1,2,3,4].map((i) => (
              <div key={i} className="par-skeleton" style={{ height: 52, marginBottom: 8 }} />
            ))}
          </div>
        ) : grades.length === 0 ? (
          <div className="par-empty">
            <span className="material-symbols-outlined">grade</span>
            <p>No grades available for this term.</p>
          </div>
        ) : (
          <div className="par-grades__rows">
            {grades.map((grade, idx) => (
              <GradeRow key={grade.id} grade={grade} idx={idx} onViewHistory={setHistoryGrade} />
            ))}
          </div>
        )}
      </div>

      {/* Grade history drawer */}
      <AnimatePresence>
        {historyGrade && (
          <GradeHistoryDrawer grade={historyGrade} onClose={() => setHistoryGrade(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
