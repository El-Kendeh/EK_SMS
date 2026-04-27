import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { useTeacherStudents } from '../../hooks/useTeacherStudents';
import StudentProfileDrawer from './StudentProfileDrawer';
import './MyStudents.css';

// Generate a stable colour from a string
function avatarColor(str = '') {
  const colours = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colours[Math.abs(hash) % colours.length];
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function MyStudents({ navigateTo }) {
  const { assignedClasses } = useTeacher();
  const { students, loading, error } = useTeacherStudents();
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterClass, setFilterClass] = useState('all');

  const filtered = useMemo(() => {
    let list = students;
    if (filterClass !== 'all') list = list.filter(s => String(s.classId) === String(filterClass));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.studentNumber || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [students, filterClass, search]);

  if (loading) {
    return (
      <div>
        <h1 className="tch-page-title">My Students</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          {[0,1,2,3,4].map(i => <div key={i} className="tch-skeleton" style={{ height: 56 }} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="tch-page-title">My Students</h1>
        <div className="tch-empty">
          <span className="material-symbols-outlined">warning</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="tch-page-title">My Students</h1>
      <p className="tch-page-sub">{students.length} student{students.length !== 1 ? 's' : ''} across {assignedClasses.length} class{assignedClasses.length !== 1 ? 'es' : ''}</p>

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
            <option key={c.id} value={String(c.id)}>{c.name} — {c.subject?.name}</option>
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
                <th>Student No.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--tch-text-secondary)' }}>
                    {students.length === 0 ? 'No students assigned yet' : 'No students match your search'}
                  </td>
                </tr>
              ) : filtered.map((s, i) => (
                <motion.tr
                  key={`${s.classId}-${s.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td style={{ fontSize: 12, color: 'var(--tch-text-secondary)' }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: avatarColor(s.fullName),
                          color: 'white', fontSize: 12, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {initials(s.fullName)}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{s.fullName}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--tch-text-secondary)' }}>{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{s.className}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--tch-text-secondary)' }}>{s.subjectName}</p>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{s.studentNumber || '—'}</td>
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
