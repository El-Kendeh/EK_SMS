import React, { useState, useEffect, useRef } from 'react';
import { principalApi } from '../../api/adminApi';
import '../schooladmin/SchoolAdmin.css';         // .ska-icon / --ska-* vars
import './GradeApprovals.css';                   // .ga-badge variants rendered below
import './StudentDrawer.css';

/**
 * Principal-scoped student profile drawer.
 * The teacher StudentProfileDrawer fetches through teacher-gated
 * /api/teacher/* endpoints and expects a teacher-shaped `student` prop, so
 * its data layer can't be reused here — this copies the drawer layout and
 * fetches GET /api/principal/students/:id/ instead (404s outside the school).
 */

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const scoreColor = (score) => {
  if (score == null) return 'var(--ska-text-3)';
  if (score >= 80) return 'var(--ska-green)';
  if (score >= 50) return '#f59e0b';
  return 'var(--ska-error)';
};

const fmtNum = (n) => (n === null || n === undefined ? '—' : n);

export default function StudentDrawer({ studentId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const closeRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setData(null);
    principalApi.getStudentProfile(studentId)
      .then(res => {
        if (!alive) return;
        if (res?.success === false) { setError(res.message || 'Failed to load student'); return; }
        setData(res);
      })
      .catch(err => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [studentId]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [onClose]);

  const student = data?.student;
  const grades = data?.grades || [];
  const att = data?.attendance;

  return (
    <>
      <div className="psd-backdrop" onClick={onClose} />
      <div className="psd-drawer" role="dialog" aria-modal="true" aria-label="Student profile">
        <div className="psd-head">
          <h3 className="psd-head__title">Student Profile</h3>
          <button ref={closeRef} type="button" className="psd-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>

        {loading && (
          <div className="psd-state">
            <Ic name="hourglass_empty" size="xl" />
            <p>Loading…</p>
          </div>
        )}

        {!loading && error && (
          <div className="psd-state">
            <Ic name="error" size="xl" style={{ color: 'var(--ska-error)' }} />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && student && (
          <div className="psd-body">
            {/* Hero */}
            <div className="psd-hero">
              <div className="psd-avatar" aria-hidden="true">
                {(student.name || '?').split(' ').map(p => p.charAt(0)).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="psd-hero__info">
                <strong className="psd-hero__name">{student.name}</strong>
                <span className="psd-hero__num">{student.admission_number || 'No admission number'}</span>
                <div className="psd-hero__badges">
                  {student.class_name && <span className="ga-badge ga-badge--approved">{student.class_name}</span>}
                  {student.status && <span className="ga-badge ga-badge--pending">{student.status}</span>}
                </div>
              </div>
            </div>

            {/* Attendance (30 days) */}
            <p className="psd-section-label">Attendance — last 30 days</p>
            {att && att.total > 0 ? (
              <div className="psd-att">
                <div className="psd-att__rate" style={{ color: scoreColor(att.rate_30d) }}>
                  {att.rate_30d}%
                </div>
                <div className="psd-att__pills">
                  <span className="psd-pill psd-pill--green">{att.present} present</span>
                  <span className="psd-pill psd-pill--red">{att.absent} absent</span>
                  <span className="psd-pill psd-pill--amber">{att.late} late</span>
                  <span className="psd-pill">{att.excused} excused</span>
                </div>
              </div>
            ) : (
              <p className="psd-none">No attendance records in the last 30 days.</p>
            )}

            {/* Current-term grades */}
            <p className="psd-section-label">
              Grades{data.term ? ` — ${data.term}` : ''}
            </p>
            {!data.term ? (
              <p className="psd-none">No active term — term grades appear once a term is active.</p>
            ) : grades.length === 0 ? (
              <p className="psd-none">No grades recorded for this term yet.</p>
            ) : (
              <div className="psd-grades">
                {grades.map(g => (
                  <div key={g.id} className="psd-grade-row">
                    <span className="psd-grade-row__subject" title={g.subject_name}>
                      {g.subject_name}{g.subject_code ? ` (${g.subject_code})` : ''}
                    </span>
                    <span className="psd-grade-row__parts">
                      CA {fmtNum(g.ca)} · MT {fmtNum(g.midterm)} · FE {fmtNum(g.final)}
                    </span>
                    <strong className="psd-grade-row__total" style={{ color: scoreColor(g.total) }}>
                      {g.total != null ? `${g.total}%` : '—'} {g.grade_letter || ''}
                    </strong>
                    <span className={`ga-badge ga-badge--${g.approval_status || 'pending'}`}>
                      {g.approval_status || 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
