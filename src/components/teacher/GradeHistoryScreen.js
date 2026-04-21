import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { mockStudents } from '../../mock/teacherMockData';
import GradeAuditPanel from './GradeAuditPanel';
import { formatRelativeTime } from '../../utils/teacherUtils';
import './GradeHistoryScreen.css';

export default function GradeHistoryScreen({ navigateTo }) {
  const { assignedClasses, selectedClassId, setSelectedClassId } = useTeacher();
  const [auditGrade, setAuditGrade] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const selectedClass = assignedClasses.find(c => c.id === selectedClassId);

  const allGrades = useMemo(() => {
    const clsId = selectedClassId || null;
    if (!clsId) {
      return Object.entries(mockStudents).flatMap(([cid, studs]) => {
        const cls = assignedClasses.find(c => c.id === cid);
        return studs.map(s => ({
          ...s.currentGrade,
          studentName: s.fullName,
          studentNumber: s.studentNumber,
          studentId: s.id,
          initials: s.initials,
          avatarColor: s.avatarColor,
          className: cls?.name || '',
          subjectName: cls?.subject.name || '',
        }));
      });
    }
    return (mockStudents[clsId] || []).map(s => ({
      ...s.currentGrade,
      studentName: s.fullName,
      studentNumber: s.studentNumber,
      studentId: s.id,
      initials: s.initials,
      avatarColor: s.avatarColor,
      className: selectedClass?.name || '',
      subjectName: selectedClass?.subject.name || '',
    }));
  }, [selectedClassId, assignedClasses, selectedClass]);

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return allGrades;
    return allGrades.filter(g => g.status === filterStatus);
  }, [allGrades, filterStatus]);

  const counts = {
    all: allGrades.length,
    locked: allGrades.filter(g => g.status === 'locked').length,
    draft: allGrades.filter(g => g.status === 'draft').length,
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
              <option key={c.id} value={c.id}>{c.name} — {c.subject.name}</option>
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

      {/* Table */}
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
                    No grades found
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: g.avatarColor, color: 'white',
                          fontSize: 11, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {g.initials}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>{g.studentName}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--tch-text-secondary)' }}>{g.studentNumber}</p>
                      </div>
                    </div>
                    {g.hasModificationAttempt && (
                      <span className="tch-badge tch-badge--red" style={{ marginTop: 4 }}>
                        <span className="material-symbols-outlined">warning</span>
                        Mod. Attempt
                      </span>
                    )}
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

      {/* Audit panel */}
      <AnimatePresence>
        {auditGrade && (
          <GradeAuditPanel grade={auditGrade} onClose={() => setAuditGrade(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
