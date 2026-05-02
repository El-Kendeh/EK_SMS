import { useEffect, useState } from 'react';
import ApiClient from '../../api/client';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>
    {name}
  </span>
);

const TABS = [
  { key: 'students',    label: 'Students',    icon: 'group' },
  { key: 'subjects',    label: 'Subjects',    icon: 'menu_book' },
  { key: 'timetable',   label: 'Timetable',   icon: 'calendar_view_week' },
  { key: 'performance', label: 'Performance', icon: 'leaderboard' },
  { key: 'audit',       label: 'Audit',       icon: 'history' },
];

/* ============================================================
   Class Profile Drawer
   Slide-up panel, 5 tabs. Reuses existing endpoints.
   ============================================================ */
export default function ClassProfileDrawer({ cls: initialCls, onClose, onEdit, onAssignStudents, onAssignTeacher }) {
  const [cls, setCls] = useState(initialCls);
  const [tab, setTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [stuLoading, setStuLoading] = useState(true);
  const [grades, setGrades] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(true);

  // Refresh class details (gives us assistant_teachers, subjects, etc.)
  useEffect(() => {
    ApiClient.get(`/api/school/classes/${initialCls.id}/`)
      .then(d => setCls(prev => ({ ...prev, ...d })))
      .catch(() => {});
  }, [initialCls.id]);

  // Load students for this class (filter from school students list)
  useEffect(() => {
    setStuLoading(true);
    ApiClient.get(`/api/school/students/?classroom_id=${initialCls.id}`)
      .then(d => setStudents(d.students || []))
      .catch(() => setStudents([]))
      .finally(() => setStuLoading(false));
  }, [initialCls.id]);

  // Load grades for performance summary
  useEffect(() => {
    setGradesLoading(true);
    ApiClient.get(`/api/school/grades/?classroom_id=${initialCls.id}`)
      .then(d => setGrades(d.grades || d || []))
      .catch(() => setGrades([]))
      .finally(() => setGradesLoading(false));
  }, [initialCls.id]);

  const tag      = cls.colour_tag || '#3B82F6';
  const enrolled = cls.enrolled ?? cls.student_count ?? students.length ?? 0;
  const cap      = cls.capacity || 1;
  const pct      = Math.min(100, Math.round((enrolled / cap) * 100));
  const teacher  = cls.class_teacher || (cls.class_teacher_id ? { name: 'Loading…' } : null);
  const assistantsCount = (cls.assistant_teachers || []).length;
  const subjectsCount   = (cls.subjects || []).length;

  // Performance metrics from grades
  const scores = grades.map(g => Number(g.total_score || g.score || 0)).filter(n => !isNaN(n) && n > 0);
  const avgScore = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;
  const passCount = scores.filter(s => s >= 50).length;
  const passRate  = scores.length ? Math.round((passCount / scores.length) * 100) : null;

  const exportRoster = () => {
    if (!students.length) { alert('No students enrolled to export.'); return; }
    const headers = ['Adm No.', 'Full Name', 'Gender', 'Email', 'Phone'];
    const csv = [
      headers.join(','),
      ...students.map(s => [
        s.admission_number, s.full_name, s.gender || '',
        s.email || '', s.phone_number || '',
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `class-${cls.code || cls.id}-roster-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'cpd-fade 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes cpd-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cpd-up   { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
      <div
        style={{
          width: '100%', maxWidth: 920, maxHeight: '92vh', overflowY: 'auto',
          background: 'var(--ska-surface-low)', color: 'var(--ska-text)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 48px rgba(0,0,0,0.45)',
          animation: 'cpd-up 0.28s cubic-bezier(0.2, 0, 0, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER ───────────────────────────────────────────── */}
        <header
          style={{
            position: 'relative', padding: '24px 28px 18px',
            background: `linear-gradient(135deg, ${tag}22 0%, transparent 60%)`,
            borderBottom: '1px solid var(--ska-border)',
          }}
        >
          {/* Top row: title + close */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, background: tag, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '1.5rem', flexShrink: 0,
                boxShadow: `0 8px 20px ${tag}55`,
              }}>{(cls.name || 'C').charAt(0).toUpperCase()}</div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                  {cls.name}
                  {cls.stream && (
                    <span style={{ marginLeft: 8, color: 'var(--ska-text-3)', fontWeight: 600, fontSize: '0.95rem' }}>
                      · {cls.stream}
                    </span>
                  )}
                </h2>
                <p style={{ margin: '2px 0 0', color: 'var(--ska-text-2)', fontSize: '0.825rem',
                            display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <span><Ic name="qr_code_2" size="sm" /> {cls.code}</span>
                  <span>Form {cls.form_number}</span>
                  {cls.room && <span><Ic name="meeting_room" size="sm" /> {cls.room}</span>}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 4, color: 'var(--ska-text-2)',
              }}
            >
              <Ic name="close" />
            </button>
          </div>

          {/* Capacity gauge */}
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--ska-text-2)', fontWeight: 600 }}>
                Enrolment {enrolled} / {cap}
              </span>
              <span style={{ fontWeight: 800, color: pct >= 100 ? 'var(--ska-error)' : pct >= 80 ? '#ffb786' : 'var(--ska-green)' }}>
                {pct}%
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--ska-surface-high)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                background: pct >= 100 ? 'var(--ska-error)' : pct >= 80 ? '#ffb786' : 'var(--ska-green)',
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onAssignStudents(cls)}>
              <Ic name="group_add" size="sm" /> Manage students
            </button>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onAssignTeacher(cls)}>
              <Ic name="person_add" size="sm" /> Class teacher
            </button>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={exportRoster}>
              <Ic name="download" size="sm" /> Export roster
            </button>
            <button className="ska-btn ska-btn--primary ska-btn--sm" onClick={() => onEdit(cls)}>
              <Ic name="edit" size="sm" /> Edit class
            </button>
          </div>
        </header>

        {/* ── TAB BAR ──────────────────────────────────────────── */}
        <nav style={{
          display: 'flex', gap: 4, padding: '12px 20px 0',
          borderBottom: '1px solid var(--ska-border)', overflowX: 'auto',
        }}>
          {TABS.map(t => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 14px', border: 'none', background: 'transparent',
                  color: on ? 'var(--ska-primary)' : 'var(--ska-text-2)',
                  fontWeight: on ? 800 : 600, fontSize: '0.85rem', cursor: 'pointer',
                  borderBottom: on ? '2px solid var(--ska-primary)' : '2px solid transparent',
                  whiteSpace: 'nowrap', marginBottom: -1,
                }}
              >
                <Ic name={t.icon} size="sm" /> {t.label}
              </button>
            );
          })}
        </nav>

        {/* ── TAB CONTENT ──────────────────────────────────────── */}
        <div style={{ padding: '20px 28px 28px' }}>
          {tab === 'students' && (
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 800 }}>
                Enrolled students {students.length > 0 && (
                  <span style={{ color: 'var(--ska-text-3)', fontWeight: 500 }}>· {students.length}</span>
                )}
              </h3>
              {stuLoading ? (
                <p style={{ color: 'var(--ska-text-3)' }}>Loading…</p>
              ) : students.length === 0 ? (
                <div style={{
                  padding: 32, textAlign: 'center', borderRadius: 12,
                  border: '1px dashed var(--ska-border)', color: 'var(--ska-text-3)',
                }}>
                  <Ic name="group_off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                  No students enrolled in this class yet.
                  <div style={{ marginTop: 12 }}>
                    <button className="ska-btn ska-btn--primary ska-btn--sm" onClick={() => onAssignStudents(cls)}>
                      <Ic name="group_add" size="sm" /> Assign students
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="ska-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Adm No.</th><th>Name</th><th>Gender</th><th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.slice(0, 50).map(s => (
                        <tr key={s.id}>
                          <td><span className="ska-badge ska-badge--cyan">{s.admission_number}</span></td>
                          <td>{s.full_name}</td>
                          <td>{s.gender || '—'}</td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--ska-text-2)' }}>{s.email || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {students.length > 50 && (
                    <p style={{ marginTop: 12, color: 'var(--ska-text-3)', fontSize: '0.8rem' }}>
                      Showing first 50 of {students.length}. Use the Students page for the full list.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'subjects' && (
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 800 }}>
                Curriculum {subjectsCount > 0 && (
                  <span style={{ color: 'var(--ska-text-3)', fontWeight: 500 }}>· {subjectsCount}</span>
                )}
              </h3>
              {subjectsCount === 0 ? (
                <div style={{
                  padding: 32, textAlign: 'center', borderRadius: 12,
                  border: '1px dashed var(--ska-border)', color: 'var(--ska-text-3)',
                }}>
                  <Ic name="menu_book" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                  No subjects on this class's curriculum yet. Edit the class to assign.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(cls.subjects || []).map(s => (
                    <div key={s.id} style={{
                      padding: '10px 14px', borderRadius: 10,
                      border: '1px solid var(--ska-border)', background: 'var(--ska-surface)',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}>
                      <Ic name="menu_book" size="sm" style={{ color: tag }} />
                      <strong>{s.name}</strong>
                      <span className="ska-badge ska-badge--grey">{s.code}</span>
                    </div>
                  ))}
                </div>
              )}
              {teacher && (
                <div style={{ marginTop: 24, padding: 16, borderRadius: 12,
                              border: '1px solid var(--ska-border)', background: 'var(--ska-surface)' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                                color: 'var(--ska-text-3)', fontWeight: 800, marginBottom: 8 }}>
                    Teaching team
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: tag, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
                    }}>{(teacher.name || '?').charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{teacher.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>Class teacher</div>
                    </div>
                  </div>
                  {assistantsCount > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(cls.assistant_teachers || []).map(t => (
                        <span key={t.id} className="ska-badge ska-badge--grey" style={{ padding: '4px 10px' }}>
                          {t.name} <span style={{ opacity: 0.7 }}>· assistant</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'timetable' && (
            <div style={{
              padding: 32, textAlign: 'center', borderRadius: 12,
              border: '1px dashed var(--ska-border)', color: 'var(--ska-text-3)',
            }}>
              <Ic name="calendar_view_week" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
              Timetable management for this class lives in the Timetable page. Open it from the sidebar.
            </div>
          )}

          {tab === 'performance' && (
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 800 }}>
                Performance snapshot
              </h3>
              {gradesLoading ? (
                <p style={{ color: 'var(--ska-text-3)' }}>Loading grades…</p>
              ) : scores.length === 0 ? (
                <div style={{
                  padding: 32, textAlign: 'center', borderRadius: 12,
                  border: '1px dashed var(--ska-border)', color: 'var(--ska-text-3)',
                }}>
                  <Ic name="bar_chart" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                  No graded scores recorded yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Average score', value: `${avgScore}%`, color: avgScore >= 75 ? 'var(--ska-green)' : avgScore >= 50 ? '#ffb786' : 'var(--ska-error)' },
                    { label: 'Pass rate (≥50)', value: `${passRate}%`, color: passRate >= 75 ? 'var(--ska-green)' : passRate >= 50 ? '#ffb786' : 'var(--ska-error)' },
                    { label: 'Graded scores', value: scores.length, color: 'var(--ska-primary)' },
                    { label: 'Top score', value: `${Math.max(...scores)}%`, color: 'var(--ska-primary)' },
                  ].map(m => (
                    <div key={m.label} style={{
                      padding: 16, borderRadius: 12, border: '1px solid var(--ska-border)',
                      background: 'var(--ska-surface)',
                    }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                                    color: 'var(--ska-text-3)', fontWeight: 700, marginBottom: 6 }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: '1.65rem', fontWeight: 800, color: m.color, lineHeight: 1.05 }}>
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'audit' && (
            <div style={{
              padding: 32, textAlign: 'center', borderRadius: 12,
              border: '1px dashed var(--ska-border)', color: 'var(--ska-text-3)',
            }}>
              <Ic name="history" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
              Audit feed coming soon. Class create / edit / teacher-assign events will appear here.
              {cls.notes && (
                <div style={{
                  marginTop: 16, padding: 16, borderRadius: 10, textAlign: 'left',
                  background: 'var(--ska-surface)', border: '1px solid var(--ska-border)',
                  color: 'var(--ska-text)',
                }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                                color: 'var(--ska-text-3)', fontWeight: 700, marginBottom: 6 }}>
                    Admin notes
                  </div>
                  <div style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{cls.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
