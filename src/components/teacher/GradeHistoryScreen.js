import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacherApi';
import GradeAuditPanel from './GradeAuditPanel';
import { formatRelativeTime } from '../../utils/teacherUtils';
import './GradeHistoryScreen.css';

function useGradeHistory(assignedClasses, selectedClassId) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!assignedClasses || assignedClasses.length === 0) {
      setGrades([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const classesToFetch = selectedClassId
      ? assignedClasses.filter(c => String(c.id) === String(selectedClassId))
      : assignedClasses;

    Promise.all(
      classesToFetch.map(cls =>
        teacherApi.getClassGrades(cls.id).then(data => {
          const entries = data.entries || (Array.isArray(data) ? data : []);
          const students = data.students || [];
          return entries.map(e => {
            const stu = students.find(s => s.id === e.student_id) || {};
            const fullName = stu.full_name || `${stu.first_name || ''} ${stu.last_name || ''}`.trim() || `Student #${e.student_id}`;
            const ca       = parseFloat(e.ca)         || 0;
            const midterm  = parseFloat(e.midterm)    || 0;
            const finalEx  = parseFloat(e.final_exam) || 0;
            const total    = ca + midterm + finalEx;
            return {
              id:            e.id || null,
              studentId:     e.student_id,
              studentName:   fullName,
              studentNumber: stu.student_id || stu.admission_number || '',
              className:     cls.name,
              subjectName:   cls.subject?.name || '',
              score:         total > 0 ? Math.round(total) : null,
              gradeLetter:   e.grade_letter || null,
              status:        e.is_locked ? 'locked' : (total > 0 ? 'draft' : 'pending'),
              lastUpdated:   e.last_updated || null,
              hasModificationAttempt: e.has_modification_attempt || false,
            };
          });
        })
      )
    )
      .then(results => { if (!cancelled) setGrades(results.flat()); })
      .catch(err  => { if (!cancelled) setError(err.message || 'Failed to load grades'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [assignedClasses, selectedClassId]);

  return { grades, loading, error };
}

export default function GradeHistoryScreen({ navigateTo }) {
  const { assignedClasses, selectedClassId, setSelectedClassId } = useTeacher();
  const [auditGrade, setAuditGrade] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const { grades: allGrades, loading, error } = useGradeHistory(assignedClasses, selectedClassId);

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return allGrades;
    return allGrades.filter(g => g.status === filterStatus);
  }, [allGrades, filterStatus]);

  const counts = {
    all:     allGrades.length,
    locked:  allGrades.filter(g => g.status === 'locked').length,
    draft:   allGrades.filter(g => g.status === 'draft').length,
    pending: allGrades.filter(g => g.status === 'pending').length,
  };

  return (
    <div>
      <h1 className="tch-page-title">Grade History</h1>
      <p className="tch-page-sub">Full audit trail for all submitted grades</p>

      {/* Filter row */}
      <div className="ghs-filter-row">
        <div style={{ flex: '1 1 200px' }}>
          <select
            className="tch-select"
            value={selectedClassId || ''}
            onChange={e => setSelectedClassId(e.target.value || null)}
          >
            <option value="">All Classes</option>
            {assignedClasses.map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.subject?.name}</option>
            ))}
          </select>
        </div>
        <div className="tch-filter-tabs" style={{ marginBottom: 0 }}>
          {['all', 'locked', 'draft', 'pending'].map(status => (
            <button
              key={status}
              className={`tch-filter-tab ${filterStatus === status ? 'tch-filter-tab--active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ghs-count">{counts[status]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading / error states */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {[0,1,2,3].map(i => <div key={i} className="tch-skeleton" style={{ height: 52 }} />)}
        </div>
      )}

      {error && !loading && (
        <div className="tch-empty">
          <span className="material-symbols-outlined">warning</span>
          <p>{error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="tch-card">
          <div className="tch-table-wrap">
            <table className="tch-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Class / Subject</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--tch-text-secondary)' }}>
                      {allGrades.length === 0 ? 'No grades have been entered yet' : 'No grades match your filter'}
                    </td>
                  </tr>
                ) : filtered.map((g, i) => (
                  <motion.tr
                    key={`${g.studentId}-${g.id || i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={g.status === 'locked' ? 'tch-grade-row--locked' : ''}
                  >
                    <td style={{ color: 'var(--tch-text-secondary)', fontSize: 12 }}>{i + 1}</td>
                    <td>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{g.studentName}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--tch-text-secondary)' }}>{g.studentNumber}</p>
                        {g.hasModificationAttempt && (
                          <span className="tch-badge tch-badge--red" style={{ marginTop: 4, display: 'inline-flex' }}>
                            <span className="material-symbols-outlined">warning</span>
                            Mod. Attempt
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{g.className}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--tch-text-secondary)' }}>{g.subjectName}</p>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--tch-primary)', fontFamily: 'Manrope, monospace' }}>
                        {g.score !== null ? `${g.score}%` : '—'}
                      </span>
                    </td>
                    <td>
                      {g.gradeLetter ? (
                        <span className="tch-badge tch-badge--primary">{g.gradeLetter}</span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`tch-badge ${
                        g.status === 'locked' ? 'tch-badge--green' :
                        g.status === 'draft'  ? 'tch-badge--amber' : 'tch-badge--grey'
                      }`}>
                        {g.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--tch-text-secondary)', whiteSpace: 'nowrap' }}>
                      {g.lastUpdated ? formatRelativeTime(g.lastUpdated) : '—'}
                    </td>
                    <td>
                      {g.id && (
                        <button
                          className="tch-btn tch-btn--ghost tch-btn--sm"
                          onClick={() => setAuditGrade(g)}
                        >
                          <span className="material-symbols-outlined">history_edu</span>
                          Trail
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit panel */}
      <AnimatePresence>
        {auditGrade && (
          <GradeAuditPanel grade={auditGrade} onClose={() => setAuditGrade(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
