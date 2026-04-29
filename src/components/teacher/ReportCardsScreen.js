import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { useTeacherStudents } from '../../hooks/useTeacherStudents';
import { teacherApi } from '../../api/teacherApi';
import './ReportCardsScreen.css';

function avatarColor(str = '') {
  const colours = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colours[Math.abs(hash) % colours.length];
}
function initials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ReportCardsScreen({ navigateTo }) {
  const { assignedClasses } = useTeacher();
  const { students, loading: studentsLoading } = useTeacherStudents();
  const [filterClass, setFilterClass] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reportCards, setReportCards] = useState(null);
  const [rcLoading, setRcLoading] = useState(false);

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

  const openStudent = (student) => {
    setSelectedStudent(student);
    setReportCards(null);
    setRcLoading(true);
    teacherApi.getStudentReportCards(student.id)
      .then(data => setReportCards(data.report_cards || []))
      .catch(() => setReportCards([]))
      .finally(() => setRcLoading(false));
  };

  return (
    <div className="rc-root">
      <div className="rc-top-bar">
        <div>
          <h1 className="tch-page-title" style={{ margin: 0 }}>Report Cards</h1>
          <p className="tch-page-sub" style={{ margin: '2px 0 0' }}>
            View published report cards for your students
          </p>
        </div>
      </div>

      <div className="rc-layout">
        {/* Left: Student list */}
        <div className="rc-student-panel">
          <div className="rc-filters">
            <input
              className="tch-input rc-search"
              placeholder="Search student..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="tch-select rc-class-filter"
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
            >
              <option value="all">All Classes</option>
              {assignedClasses.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          {studentsLoading ? (
            <div style={{ padding: 16 }}>
              {[0,1,2,3].map(i => <div key={i} className="tch-skeleton" style={{ height: 52, marginBottom: 8 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="tch-empty" style={{ padding: '32px 16px' }}>
              <span className="material-symbols-outlined">person_search</span>
              <p>No students found</p>
            </div>
          ) : (
            <div className="rc-student-list">
              {filtered.map(student => (
                <button
                  key={student.id}
                  className={`rc-student-item ${selectedStudent?.id === student.id ? 'rc-student-item--active' : ''}`}
                  onClick={() => openStudent(student)}
                >
                  <div
                    className="rc-student-avatar"
                    style={{ background: student.avatarColor || avatarColor(student.fullName) }}
                  >
                    {student.initials || initials(student.fullName)}
                  </div>
                  <div className="rc-student-info">
                    <p className="rc-student-name">{student.fullName}</p>
                    <p className="rc-student-meta">{student.studentNumber} · {student.className}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Report cards */}
        <div className="rc-cards-panel">
          {!selectedStudent ? (
            <div className="tch-empty" style={{ padding: '80px 20px' }}>
              <span className="material-symbols-outlined">description</span>
              <p>Select a student to view their report cards</p>
            </div>
          ) : (
            <>
              <div className="rc-student-header">
                <div
                  className="rc-avatar-lg"
                  style={{ background: selectedStudent.avatarColor || avatarColor(selectedStudent.fullName) }}
                >
                  {selectedStudent.initials || initials(selectedStudent.fullName)}
                </div>
                <div>
                  <h2 className="rc-student-title">{selectedStudent.fullName}</h2>
                  <p className="rc-student-sub">
                    {selectedStudent.studentNumber} · {selectedStudent.className}
                  </p>
                </div>
              </div>

              {rcLoading ? (
                <div style={{ padding: 20 }}>
                  {[0,1,2].map(i => <div key={i} className="tch-skeleton" style={{ height: 70, marginBottom: 10 }} />)}
                </div>
              ) : !reportCards || reportCards.length === 0 ? (
                <div className="tch-empty" style={{ padding: '40px 20px' }}>
                  <span className="material-symbols-outlined">description</span>
                  <p>No published report cards for this student</p>
                  <p style={{ fontSize: 12, color: 'var(--tch-text-secondary)' }}>
                    Report cards are generated and published by the school admin.
                  </p>
                </div>
              ) : (
                <div className="rc-cards-list">
                  {reportCards.map((rc, i) => (
                    <motion.div
                      key={rc.id}
                      className="rc-card-item"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="rc-card-left">
                        <div className="rc-card-icon">
                          <span className="material-symbols-outlined">description</span>
                        </div>
                        <div className="rc-card-info">
                          <p className="rc-card-title">
                            {rc.term} — {rc.academic_year}
                          </p>
                          <div className="rc-card-stats">
                            {rc.average_score !== null && (
                              <span className="tch-chip">
                                <span className="material-symbols-outlined">percent</span>
                                Avg {rc.average_score}%
                              </span>
                            )}
                            {rc.class_rank && (
                              <span className="tch-chip">
                                <span className="material-symbols-outlined">leaderboard</span>
                                Rank {rc.class_rank}/{rc.class_size}
                              </span>
                            )}
                            {rc.published_at && (
                              <span className="tch-chip">
                                <span className="material-symbols-outlined">calendar_today</span>
                                {new Date(rc.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="rc-card-right">
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
                            className="tch-btn tch-btn--primary tch-btn--sm"
                          >
                            <span className="material-symbols-outlined">download</span>
                            PDF
                          </a>
                        )}
                        {rc.qr_code && (
                          <span
                            className="tch-btn tch-btn--ghost tch-btn--sm"
                            title="QR Code available for verification"
                          >
                            <span className="material-symbols-outlined">qr_code</span>
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
