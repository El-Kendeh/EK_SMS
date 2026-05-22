import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import { formatDueDate } from '../../utils/studentUtils';
import './StudentAssignments.css';

const FILTERS = [
  { key: 'all',       label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'graded',    label: 'Graded' },
];

const STATUS_META = {
  pending:   { label: 'Pending',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   icon: 'schedule' },
  submitted: { label: 'Submitted', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  icon: 'check_circle' },
  graded:    { label: 'Graded',    color: '#10B981', bg: 'rgba(16,185,129,0.1)',   icon: 'task_alt' },
};

function AssignmentDetail({ assignment, onClose, onSubmit, submitting }) {
  const meta = STATUS_META[assignment.status] || STATUS_META.pending;
  const due = formatDueDate(assignment.dueDate);
  const isOverdue = due.includes('overdue');

  return (
    <motion.div
      className="sasgn-detail"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.22 }}
    >
      {/* Detail header */}
      <div className="sasgn-detail__head">
        <div className="sasgn-detail__icon" style={{ background: `${assignment.subjectColor}18` }}>
          <span className="material-symbols-outlined" style={{ color: assignment.subjectColor, fontSize: 22 }}>
            {assignment.subjectIcon}
          </span>
        </div>
        <div className="sasgn-detail__head-info">
          <h2 className="sasgn-detail__title">{assignment.title}</h2>
          <p className="sasgn-detail__subject">{assignment.subject} · {assignment.teacher}</p>
        </div>
        <button className="sasgn-detail__close" onClick={onClose} aria-label="Close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Status + due */}
      <div className="sasgn-detail__badges">
        <span className="sasgn-detail__status" style={{ background: meta.bg, color: meta.color }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{meta.icon}</span>
          {meta.label}
        </span>
        <span
          className="sasgn-detail__due"
          style={{ color: isOverdue ? 'var(--student-danger)' : 'var(--student-text-secondary)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>calendar_today</span>
          {due}
        </span>
        <span className="sasgn-detail__marks">
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>star</span>
          {assignment.score !== undefined ? `${assignment.score} / ${assignment.maxScore}` : `Max: ${assignment.maxScore} marks`}
        </span>
      </div>

      {/* Description */}
      <div className="sasgn-detail__section">
        <h3 className="sasgn-detail__section-title">
          <span className="material-symbols-outlined">description</span>
          Description
        </h3>
        <p className="sasgn-detail__desc">{assignment.description}</p>
      </div>

      {/* Feedback (graded only) */}
      {assignment.feedback && (
        <div className="sasgn-detail__section">
          <h3 className="sasgn-detail__section-title">
            <span className="material-symbols-outlined">rate_review</span>
            Teacher Feedback
          </h3>
          <div className="sasgn-detail__feedback">
            <span className="material-symbols-outlined">format_quote</span>
            <p>{assignment.feedback}</p>
          </div>
        </div>
      )}

      {/* Submission info */}
      {assignment.submittedAt && (
        <div className="sasgn-detail__submitted-at">
          <span className="material-symbols-outlined">check_circle</span>
          Submitted {new Date(assignment.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      )}

      {/* Submit button (pending only) */}
      {assignment.status === 'pending' && (
        <button
          className="sasgn-detail__submit"
          onClick={() => onSubmit(assignment.id)}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="sasgn-spin" />
              Submitting…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">upload</span>
              Mark as Submitted
            </>
          )}
        </button>
      )}
    </motion.div>
  );
}

export default function StudentAssignments() {
  const [filter, setFilter] = useState('all');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await studentApi.getAssignments();
      setAssignments(data);
    } catch {
      // show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return assignments;
    return assignments.filter((a) => a.status === filter);
  }, [assignments, filter]);

  const counts = useMemo(() => ({
    all:       assignments.length,
    pending:   assignments.filter((a) => a.status === 'pending').length,
    submitted: assignments.filter((a) => a.status === 'submitted').length,
    graded:    assignments.filter((a) => a.status === 'graded').length,
  }), [assignments]);

  const handleSubmit = async (id) => {
    setSubmitting(true);
    try {
      await studentApi.submitAssignment(id);
      setAssignments((prev) =>
        prev.map((a) => a.id === id ? { ...a, status: 'submitted', submittedAt: new Date().toISOString() } : a)
      );
      setSelected((prev) => prev ? { ...prev, status: 'submitted', submittedAt: new Date().toISOString() } : prev);
    } catch {
      // show nothing — mock always succeeds
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sasgn">
      {/* Header */}
      <div className="sasgn__header">
        <div>
          <h1 className="sasgn__title">Assignments</h1>
          <p className="sasgn__sub">
            {counts.pending} pending · {counts.submitted} submitted · {counts.graded} graded
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="sasgn__filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`sasgn__filter ${filter === f.key ? 'sasgn__filter--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="sasgn__filter-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <div className="sasgn__layout">
        {/* Assignment list */}
        <div className="sasgn__list">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="sasgn-card sasgn-card--skeleton">
                <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 11, width: '45%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 22, width: 80, borderRadius: 99 }} />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="sasgn__empty">
              <span className="material-symbols-outlined">task_alt</span>
              <p>No {filter === 'all' ? '' : filter} assignments</p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((a, idx) => {
                const meta = STATUS_META[a.status] || STATUS_META.pending;
                const due = formatDueDate(a.dueDate);
                const isUrgent = due.includes('today') || due.includes('tomorrow') || due.includes('overdue');
                const isActive = selected?.id === a.id;

                return (
                  <motion.div
                    key={a.id}
                    className={`sasgn-card ${isActive ? 'sasgn-card--active' : ''}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, delay: idx * 0.04 }}
                    onClick={() => setSelected(isActive ? null : a)}
                  >
                    <div className="sasgn-card__bar" style={{ background: a.subjectColor }} />
                    <div className="sasgn-card__body">
                      <div className="sasgn-card__top">
                        <div className="sasgn-card__icon" style={{ background: `${a.subjectColor}15` }}>
                          <span className="material-symbols-outlined" style={{ color: a.subjectColor, fontSize: 18 }}>
                            {a.subjectIcon}
                          </span>
                        </div>
                        <div className="sasgn-card__info">
                          <div className="sasgn-card__title">{a.title}</div>
                          <div className="sasgn-card__subject">{a.subject}</div>
                        </div>
                      </div>
                      <div className="sasgn-card__footer">
                        <span
                          className="sasgn-card__status"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{meta.icon}</span>
                          {meta.label}
                        </span>
                        <span
                          className="sasgn-card__due"
                          style={{ color: isUrgent ? 'var(--student-danger)' : 'var(--student-text-secondary)' }}
                        >
                          {due}
                        </span>
                        {a.score !== undefined && (
                          <span className="sasgn-card__score">
                            {a.score}/{a.maxScore}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="material-symbols-outlined sasgn-card__chevron">
                      {isActive ? 'expand_less' : 'chevron_right'}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <AssignmentDetail
              assignment={selected}
              onClose={() => setSelected(null)}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
