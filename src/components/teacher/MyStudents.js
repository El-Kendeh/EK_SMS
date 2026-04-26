import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockStudents } from '../../mock/teacherMockData';
import { useTeacher } from '../../context/TeacherContext';
import StudentProfileDrawer from './StudentProfileDrawer';
import './MyStudents.css';

export default function MyStudents({ navigateTo }) {
  const { assignedClasses } = useTeacher();
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterClass, setFilterClass] = useState('all');

  const allStudents = useMemo(() => {
    return Object.entries(mockStudents).flatMap(([classId, studs]) => {
      const cls = assignedClasses.find(c => c.id === classId);
      return studs.map(s => ({ ...s, classId, className: cls?.name || '', subjectName: cls?.subject?.name || '' }));
    });
  }, [assignedClasses]);

  const filtered = useMemo(() => {
    let list = allStudents;
    if (filterClass !== 'all') list = list.filter(s => s.classId === filterClass);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allStudents, filterClass, search]);

  return (
    <div>
      <h1 className="tch-page-title">My Students</h1>
      <p className="tch-page-sub">{allStudents.length} students across {assignedClasses.length} classes</p>

      {/* Controls */}
      <div className="mys-controls">
        <div className="tch-search-wrap" style={{ flex: '1 1 240px', marginBottom: 0 }}>
          <span className="material-symbols-outlined">search</span>
          <input
            className="tch-input"
            placeholder="Search by name or student number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="tch-select"
          style={{ flex: '0 1 220px' }}
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
        >
          <option value="all">All Classes</option>
          {assignedClasses.map(c => (
            <option key={c.id} value={c.id}>{c.name} — {c.subject.name}</option>
          ))}
        </select>
      </div>

      {/* Student list */}
      <div className="tch-card">
        <div className="tch-table-wrap">
          <table className="tch-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Class</th>
                <th>Current Grade</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--tch-text-secondary)' }}>
                    No students found
                  </td>
                </tr>
              ) : filtered.map((s, i) => (
                <motion.tr
                  key={`${s.classId}-${s.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={s.currentGrade.status === 'locked' ? 'tch-grade-row--locked' : ''}
                >
                  <td style={{ fontSize: 12, color: 'var(--tch-text-secondary)' }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: s.avatarColor, color: 'white',
                          fontSize: 12, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {s.initials}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{s.fullName}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--tch-text-secondary)' }}>{s.studentNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{s.className}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--tch-text-secondary)' }}>{s.subjectName}</p>
                  </td>
                  <td>
                    {s.currentGrade.score !== null ? (
                      <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--tch-primary)', fontFamily: 'Manrope, monospace' }}>
                        {s.currentGrade.score}%
                      </span>
                    ) : '—'}
                    {s.currentGrade.gradeLetter && (
                      <span className="tch-badge tch-badge--primary" style={{ marginLeft: 6 }}>
                        {s.currentGrade.gradeLetter}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`tch-badge ${
                      s.currentGrade.status === 'locked' ? 'tch-badge--green' :
                      s.currentGrade.status === 'draft'  ? 'tch-badge--amber' : 'tch-badge--grey'
                    }`}>
                      {s.currentGrade.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="tch-btn tch-btn--ghost tch-btn--sm"
                      onClick={() => setSelectedStudent(s)}
                    >
                      <span className="material-symbols-outlined">person</span>
                      Profile
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Profile Drawer */}
      <AnimatePresence>
        {selectedStudent && (
          <StudentProfileDrawer
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
