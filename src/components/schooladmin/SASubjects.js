import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ApiClient from '../../api/client';
import './SASubjects.css';

/* ── Icon shorthand (mirrors dashboard.js Ic helper) ── */
const Ic = ({ name, size, style, className = '' }) => (
  <span
    className={`ska-icon${size ? ` ska-icon--${size}` : ''} ${className}`}
    style={style}
    aria-hidden="true"
  >
    {name}
  </span>
);

/* ── Generic modal wrapper ── */
function Modal({ title, onClose, children, wide }) {
  return (
    <div className="ska-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`ska-modal${wide ? ' ska-modal--wide' : ''}`}>
        <div className="ska-modal-head">
          <h2 className="ska-modal-title">{title}</h2>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>
        <div className="ska-modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ── Helpers ── */
function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).filter(Boolean).join('').substring(0, 2).toUpperCase();
}

function suggestCode(name = '') {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0].substring(0, 4).toUpperCase() + '101';
  return words.map(w => w[0]).join('').toUpperCase() + '101';
}

function defaultMeta() {
  return { teacher_ids: [], class_ids: [], category: 'Core', grading_type: 'Percentage', status: 'Active', academic_year: '' };
}

/* ============================================================
   STATS CARDS
   ============================================================ */
function StatsCards({ subjects, meta }) {
  const active   = subjects.filter(s => (meta[s.id]?.status || 'Active') === 'Active').length;
  const assigned = subjects.filter(s => (meta[s.id]?.teacher_ids || []).length > 0).length;
  const inUse    = subjects.filter(s => (meta[s.id]?.class_ids   || []).length > 0).length;

  const cards = [
    { label: 'Total Subjects',    value: subjects.length, icon: 'menu_book',    color: 'var(--ska-primary)',   bg: 'var(--ska-primary-dim)' },
    { label: 'Active Subjects',   value: active,          icon: 'check_circle', color: 'var(--ska-green)',     bg: 'var(--ska-green-dim)' },
    { label: 'Assigned Teachers', value: assigned,        icon: 'school',       color: 'var(--ska-secondary)', bg: 'var(--ska-secondary-dim)' },
    { label: 'Subjects in Use',   value: inUse,           icon: 'class',        color: 'var(--ska-tertiary)',  bg: 'var(--ska-tertiary-dim)' },
  ];

  return (
    <div className="subj-stats-grid">
      {cards.map(c => (
        <div key={c.label} className="ska-metric-card subj-stat-card">
          <div className="ska-metric-top">
            <div className="ska-metric-icon" style={{ background: c.bg }}>
              <Ic name={c.icon} style={{ color: c.color }} />
            </div>
          </div>
          <p className="ska-metric-label">{c.label}</p>
          <p className="ska-metric-value" style={{ color: c.color, fontSize: '1.75rem' }}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   FILTERS BAR
   ============================================================ */
function FiltersBar({ search, setSearch, filters, setFilters, teachers, classes }) {
  const hasFilters = search || filters.status || filters.category || filters.teacher || filters.class;

  return (
    <div className="subj-filters">
      <div className="cls-search-box subj-search">
        <Ic name="search" />
        <input
          className="ska-search-input"
          placeholder="Search name or code…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="cls-clear-btn" onClick={() => setSearch('')}>
            <Ic name="close" />
          </button>
        )}
      </div>

      <select
        className="ska-input subj-select"
        value={filters.status}
        onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
      >
        <option value="">All Statuses</option>
        <option value="Active">Active</option>
        <option value="Archived">Archived</option>
      </select>

      <select
        className="ska-input subj-select"
        value={filters.category}
        onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
      >
        <option value="">All Categories</option>
        <option value="Core">Core</option>
        <option value="Elective">Elective</option>
      </select>

      {teachers.length > 0 && (
        <select
          className="ska-input subj-select"
          value={filters.teacher}
          onChange={e => setFilters(f => ({ ...f, teacher: e.target.value }))}
        >
          <option value="">All Teachers</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}

      {classes.length > 0 && (
        <select
          className="ska-input subj-select"
          value={filters.class}
          onChange={e => setFilters(f => ({ ...f, class: e.target.value }))}
        >
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      {hasFilters && (
        <button
          className="ska-btn ska-btn--ghost ska-btn--sm"
          onClick={() => { setSearch(''); setFilters({ status: '', category: '', teacher: '', class: '' }); }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

/* ============================================================
   SUBJECT ROW
   ============================================================ */
function SubjectRow({ subject, teachers, classes, meta, onView, onEdit, onAssignTeacher, onAssignClasses, onToggleStatus, onDelete }) {
  const m                = meta[subject.id] || defaultMeta();
  const assignedTeachers = teachers.filter(t => m.teacher_ids.includes(t.id));
  const assignedClasses  = classes.filter(c => m.class_ids.includes(c.id));
  const isArchived       = m.status === 'Archived';
  const isHighUsage      = assignedClasses.length >= 3;
  const studentCount     = assignedClasses.reduce((sum, c) => sum + (c.student_count || 0), 0);

  return (
    <tr className={isArchived ? 'subj-row--archived' : ''}>
      {/* Subject name */}
      <td>
        <div className="cls-name-cell">
          <div className="subj-icon-wrap" style={{ background: isArchived ? 'rgba(255,255,255,0.05)' : 'var(--ska-primary-dim)' }}>
            <Ic name="menu_book" size="sm" style={{ color: isArchived ? 'var(--ska-text-3)' : 'var(--ska-primary)' }} />
          </div>
          <div>
            <div className="cls-name-text">{subject.name}</div>
            {subject.description && (
              <div className="cls-name-meta">
                {subject.description.length > 48 ? subject.description.substring(0, 48) + '…' : subject.description}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Code */}
      <td><span className="ska-badge ska-badge--cyan">{subject.code}</span></td>

      {/* Teachers */}
      <td>
        {assignedTeachers.length > 0 ? (
          <div className="subj-teachers-cell">
            {assignedTeachers.slice(0, 2).map(t => (
              <span key={t.id} className="subj-teacher-pill">{t.name}</span>
            ))}
            {assignedTeachers.length > 2 && (
              <span className="subj-more-pill">+{assignedTeachers.length - 2}</span>
            )}
          </div>
        ) : (
          <span className="cls-unassigned">Unassigned</span>
        )}
      </td>

      {/* Classes */}
      <td>
        {assignedClasses.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            {assignedClasses.slice(0, 2).map(c => (
              <span key={c.id} className="ska-badge ska-badge--primary" style={{ fontSize: '0.625rem' }}>{c.name}</span>
            ))}
            {assignedClasses.length > 2 && (
              <span className="ska-badge ska-badge--inactive">+{assignedClasses.length - 2}</span>
            )}
            {isHighUsage && <span className="subj-high-usage">⚠ High</span>}
          </div>
        ) : (
          <span className="cls-unassigned">None</span>
        )}
      </td>

      {/* Students */}
      <td>
        {studentCount > 0
          ? <span className="subj-student-count"><Ic name="people" size="sm" />{studentCount}</span>
          : <span className="cls-unassigned">—</span>}
      </td>

      {/* Category */}
      <td>
        <span className="ska-badge ska-badge--inactive" style={{ fontSize: '0.625rem' }}>
          {m.category || 'Core'}
        </span>
      </td>

      {/* Status */}
      <td>
        <span className={`ska-badge ${isArchived ? 'ska-badge--inactive' : 'ska-badge--active'}`}>
          {m.status || 'Active'}
        </span>
      </td>

      {/* Actions */}
      <td>
        <div className="cls-row-actions">
          <button className="ska-btn ska-btn--ghost ska-btn--sm" title="View Details" onClick={() => onView(subject)}>
            <Ic name="visibility" size="sm" />
          </button>
          <button className="ska-btn ska-btn--ghost ska-btn--sm" title="Edit Subject" onClick={() => onEdit(subject)}>
            <Ic name="edit" size="sm" />
          </button>
          <button className="ska-btn ska-btn--ghost ska-btn--sm" title="Assign Teacher" onClick={() => onAssignTeacher(subject)}>
            <Ic name="person_add" size="sm" />
          </button>
          <button className="ska-btn ska-btn--ghost ska-btn--sm" title="Assign to Classes" onClick={() => onAssignClasses(subject)}>
            <Ic name="class" size="sm" />
          </button>
          <button
            className={`ska-btn ska-btn--sm ${isArchived ? 'ska-btn--approve' : 'ska-btn--ghost'}`}
            title={isArchived ? 'Restore' : 'Archive'}
            onClick={() => onToggleStatus(subject)}
          >
            <Ic name={isArchived ? 'unarchive' : 'archive'} size="sm" />
          </button>
          <button
            className="ska-btn ska-btn--ghost ska-btn--sm"
            style={{ color: 'var(--ska-error)' }}
            title="Delete"
            onClick={() => onDelete(subject.id)}
          >
            <Ic name="delete" size="sm" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ============================================================
   SUBJECTS TABLE
   ============================================================ */
function SubjectsTable({ subjects, teachers, classes, meta, loading, onView, onEdit, onAssignTeacher, onAssignClasses, onToggleStatus, onDelete }) {
  if (loading) {
    return (
      <div className="ska-empty">
        <Ic name="sync" size="xl" style={{ color: 'var(--ska-secondary)', marginBottom: 12 }} />
        <p className="ska-empty-desc">Loading subjects…</p>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="ska-empty">
        <Ic name="menu_book" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
        <p className="ska-empty-title">No subjects found</p>
        <p className="ska-empty-desc">Try adjusting your filters or add a new subject.</p>
      </div>
    );
  }

  return (
    <div className="subj-table-wrap">
      <table className="ska-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Code</th>
            <th>Teacher(s)</th>
            <th>Classes</th>
            <th>Students</th>
            <th>Category</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {subjects.map(s => (
            <SubjectRow
              key={s.id}
              subject={s}
              teachers={teachers}
              classes={classes}
              meta={meta}
              onView={onView}
              onEdit={onEdit}
              onAssignTeacher={onAssignTeacher}
              onAssignClasses={onAssignClasses}
              onToggleStatus={onToggleStatus}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   SUBJECT DETAILS PAGE
   ============================================================ */
const TT_DAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TT_PERIODS = ['8:00', '10:00', '12:00', '14:00'];

function SubjectDetails({ subject, teachers, classes, meta, onBack, onEdit, onAssignTeacher, onAssignClasses }) {
  const m                = meta[subject.id] || defaultMeta();
  const assignedTeachers = teachers.filter(t => m.teacher_ids.includes(t.id));
  const assignedClasses  = classes.filter(c => m.class_ids.includes(c.id));
  const isHighUsage      = assignedClasses.length >= 3;

  /* Deterministic mock scores (no randomness on re-render) */
  const performance = useMemo(() => (
    assignedClasses.map(c => ({
      ...c,
      avg: ((c.id * 37 + subject.id * 13) % 40) + 55,
    }))
  ), [assignedClasses, subject.id]);

  /* Mock timetable slots */
  const timetableSlots = useMemo(() => {
    const slots = {};
    TT_DAYS.forEach(d => TT_PERIODS.forEach(p => { slots[`${d}-${p}`] = null; }));
    if (assignedClasses.length > 0) {
      slots['Mon-8:00']  = assignedClasses[0].name;
      slots['Wed-10:00'] = assignedClasses[0].name;
    }
    if (assignedClasses.length > 1) {
      slots['Tue-8:00']  = assignedClasses[1].name;
      slots['Thu-10:00'] = assignedClasses[1].name;
    }
    return slots;
  }, [assignedClasses]);

  return (
    <div className="ska-content">
      {/* Back */}
      <button className="cls-back-btn" onClick={onBack}>
        <Ic name="arrow_back" /> Back to Subjects
      </button>

      {/* Header */}
      <div className="ska-page-head ska-page-head--action" style={{ marginTop: 8 }}>
        <div>
          <h1 className="ska-page-title">{subject.name}</h1>
          <p className="ska-page-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="ska-badge ska-badge--cyan">{subject.code}</span>
            <span className="ska-badge ska-badge--inactive">{m.category}</span>
            <span className="ska-badge ska-badge--inactive">{m.grading_type}</span>
            {isHighUsage && <span className="subj-high-usage">⚠ High usage</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onAssignTeacher(subject)}>
            <Ic name="person_add" size="sm" /> Assign Teacher
          </button>
          <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onAssignClasses(subject)}>
            <Ic name="class" size="sm" /> Assign Classes
          </button>
          <button className="ska-btn ska-btn--primary ska-btn--sm" onClick={() => onEdit(subject)}>
            <Ic name="edit" size="sm" /> Edit
          </button>
        </div>
      </div>

      {/* Detail grid */}
      <div className="subj-detail-grid">

        {/* Overview */}
        <div className="ska-card ska-card-pad">
          <h2 className="ska-card-title" style={{ marginBottom: 14 }}>Overview</h2>
          <div className="subj-detail-info-list">
            <div className="subj-info-row">
              <span className="subj-info-label">Name</span>
              <span className="subj-info-val">{subject.name}</span>
            </div>
            <div className="subj-info-row">
              <span className="subj-info-label">Code</span>
              <span className="ska-badge ska-badge--cyan">{subject.code}</span>
            </div>
            <div className="subj-info-row">
              <span className="subj-info-label">Category</span>
              <span className="ska-badge ska-badge--inactive">{m.category}</span>
            </div>
            <div className="subj-info-row">
              <span className="subj-info-label">Grading</span>
              <span className="subj-info-val">{m.grading_type}</span>
            </div>
            <div className="subj-info-row">
              <span className="subj-info-label">Status</span>
              <span className={`ska-badge ${m.status === 'Active' ? 'ska-badge--active' : 'ska-badge--inactive'}`}>{m.status}</span>
            </div>
            {m.academic_year && (
              <div className="subj-info-row">
                <span className="subj-info-label">Academic Year</span>
                <span className="subj-info-val">{m.academic_year}</span>
              </div>
            )}
            {subject.description && (
              <div className="subj-info-row subj-info-row--col">
                <span className="subj-info-label">Description</span>
                <span className="subj-info-val">{subject.description}</span>
              </div>
            )}
          </div>
        </div>

        {/* Teachers */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h2 className="ska-card-title">Teachers</h2>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onAssignTeacher(subject)}>
              <Ic name="add" size="sm" /> Assign
            </button>
          </div>
          {assignedTeachers.length > 0 ? (
            <div className="subj-teacher-list">
              {assignedTeachers.map(t => (
                <div key={t.id} className="cls-teacher-profile">
                  <div className="cls-avatar cls-avatar--teal">{getInitials(t.name)}</div>
                  <div>
                    <div className="cls-teacher-fullname">{t.name}</div>
                    {t.email && <div className="cls-teacher-email">{t.email}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ska-empty" style={{ padding: '20px 0' }}>
              <p className="ska-empty-desc">No teachers assigned yet.</p>
            </div>
          )}
        </div>

        {/* Classes */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h2 className="ska-card-title">Classes</h2>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onAssignClasses(subject)}>
              <Ic name="add" size="sm" /> Assign
            </button>
          </div>
          {assignedClasses.length > 0 ? (
            <div className="cls-subject-list">
              {assignedClasses.map(c => (
                <div key={c.id} className="cls-subject-item">
                  <div className="cls-subject-dot" />
                  <span className="cls-subject-name">{c.name}</span>
                  {c.student_count !== undefined && (
                    <span className="ska-badge ska-badge--inactive" style={{ fontSize: '0.625rem' }}>
                      {c.student_count} students
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="ska-empty" style={{ padding: '20px 0' }}>
              <p className="ska-empty-desc">Not assigned to any classes yet.</p>
            </div>
          )}
        </div>

        {/* Performance */}
        <div className="ska-card ska-card-pad">
          <h2 className="ska-card-title" style={{ marginBottom: 16 }}>Avg. Scores by Class</h2>
          {performance.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {performance.map(c => (
                <div key={c.id}>
                  <div className="ska-progress-item-labels">
                    <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-2)', fontWeight: 600 }}>{c.name}</span>
                    <span style={{
                      fontSize: '0.8125rem', fontWeight: 700,
                      color: c.avg >= 70 ? 'var(--ska-green)' : c.avg >= 50 ? 'var(--ska-tertiary)' : 'var(--ska-error)',
                    }}>
                      {c.avg}%
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'var(--ska-surface-low)', borderRadius: 999, overflow: 'hidden', marginTop: 5 }}>
                    <div style={{
                      width: `${c.avg}%`, height: '100%', borderRadius: 999,
                      transition: 'width 0.6s ease',
                      background: c.avg >= 70 ? 'var(--ska-green)' : c.avg >= 50 ? 'var(--ska-tertiary)' : 'var(--ska-error)',
                    }} />
                  </div>
                </div>
              ))}
              <p style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', margin: 0 }}>* Indicative data</p>
            </div>
          ) : (
            <div className="ska-empty" style={{ padding: '20px 0' }}>
              <p className="ska-empty-desc">Assign classes to view performance data.</p>
            </div>
          )}
        </div>

        {/* Assessments — placeholder, spans full width */}
        <div className="ska-card ska-card-pad subj-detail-full">
          <h2 className="ska-card-title" style={{ marginBottom: 14 }}>Assessments</h2>
          <div className="subj-assess-placeholder">
            <Ic name="assignment" size="xl" style={{ color: 'var(--ska-text-3)' }} />
            <p className="ska-empty-title" style={{ fontSize: '0.875rem' }}>Coming Soon</p>
            <p className="ska-empty-desc">Test and assignment tracking for {subject.name} will appear here.</p>
          </div>
        </div>

        {/* Timetable usage — full width */}
        <div className="ska-card ska-card-pad subj-detail-full">
          <h2 className="ska-card-title" style={{ marginBottom: 14 }}>Timetable Usage</h2>
          {assignedClasses.length > 0 ? (
            <div className="subj-timetable-mini">
              {/* Header */}
              <div className="subj-tt-head">
                <div className="subj-tt-period-col" />
                {TT_DAYS.map(d => <div key={d} className="subj-tt-day">{d}</div>)}
              </div>
              {/* Rows */}
              {TT_PERIODS.map(p => (
                <div key={p} className="subj-tt-row">
                  <div className="subj-tt-time">{p}</div>
                  {TT_DAYS.map(d => {
                    const slot = timetableSlots[`${d}-${p}`];
                    return (
                      <div key={d} className={`subj-tt-cell${slot ? ' subj-tt-cell--active' : ''}`} title={slot || ''}>
                        {slot && <span className="subj-tt-label">{slot}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="ska-empty" style={{ padding: '20px 0' }}>
              <p className="ska-empty-desc">Assign classes first to see timetable usage.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ============================================================
   ADD / EDIT SUBJECT MODAL
   ============================================================ */
const YEAR_NOW = new Date().getFullYear();
const YEAR_OPTIONS = [
  `${YEAR_NOW - 1}/${YEAR_NOW}`,
  `${YEAR_NOW}/${YEAR_NOW + 1}`,
  `${YEAR_NOW + 1}/${YEAR_NOW + 2}`,
];

function AddSubjectModal({ mode, subject, teachers, classes, existingCodes, meta, onSave, onClose }) {
  const initMeta = subject ? (meta[subject.id] || defaultMeta()) : defaultMeta();

  const [form, setForm] = useState({
    name:          subject?.name        || '',
    code:          subject?.code        || '',
    description:   subject?.description || '',
    category:      initMeta.category,
    grading_type:  initMeta.grading_type,
    teacher_ids:   [...initMeta.teacher_ids],
    class_ids:     [...initMeta.class_ids],
    academic_year: initMeta.academic_year || '',
  });
  const [error,       setError]       = useState('');
  const [saving,      setSaving]      = useState(false);
  const [codeEdited,  setCodeEdited]  = useState(mode === 'edit');
  const prevName = useRef(form.name);

  /* Deterministic teacher suggestion based on subject name */
  const suggestedTeacherIds = useMemo(() => {
    if (!teachers.length || !form.name.trim()) return [];
    const hash = form.name.toLowerCase().replace(/\s+/g, '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const pick = teachers[hash % teachers.length];
    return pick ? [pick.id] : [];
  }, [form.name, teachers]);

  /* Auto-suggest code from name (add mode, unless user edited code manually) */
  useEffect(() => {
    if (mode === 'add' && !codeEdited && form.name !== prevName.current) {
      prevName.current = form.name;
      setForm(f => ({ ...f, code: suggestCode(form.name) }));
    }
  }, [form.name, mode, codeEdited]);

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Subject name is required.'); return; }
    if (!form.code.trim()) { setError('Subject code is required.'); return; }
    const upperCode = form.code.trim().toUpperCase();
    if (mode === 'add' && existingCodes.map(c => c.toUpperCase()).includes(upperCode)) {
      setError('A subject with this code already exists.'); return;
    }
    setSaving(true); setError('');
    try {
      await onSave(
        { name: form.name.trim(), code: upperCode, description: form.description.trim() },
        { category: form.category, grading_type: form.grading_type, teacher_ids: form.teacher_ids, class_ids: form.class_ids, academic_year: form.academic_year },
      );
    } catch (e) {
      setError(e.message || 'Failed to save.');
      setSaving(false);
    }
  };

  const toggleTeacher = id => setForm(f => ({
    ...f,
    teacher_ids: f.teacher_ids.includes(id) ? f.teacher_ids.filter(x => x !== id) : [...f.teacher_ids, id],
  }));

  const toggleClass = id => setForm(f => ({
    ...f,
    class_ids: f.class_ids.includes(id) ? f.class_ids.filter(x => x !== id) : [...f.class_ids, id],
  }));

  return (
    <Modal title={mode === 'add' ? 'Add Subject' : 'Edit Subject'} onClose={onClose} wide>
      {error && <p className="ska-form-error">{error}</p>}

      {/* Basic info */}
      <p className="ska-section-label" style={{ marginBottom: 12 }}>Basic Information</p>
      <div className="ska-form-grid">
        <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
          <span>Subject Name *</span>
          <input
            className="ska-input"
            placeholder="e.g. Mathematics"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label className="ska-form-group">
          <span>
            Subject Code *
            {mode === 'add' && <span className="subj-code-hint">(auto-suggested)</span>}
          </span>
          <input
            className="ska-input"
            placeholder="e.g. MATH101"
            value={form.code}
            disabled={mode === 'edit'}
            onChange={e => {
              setCodeEdited(true);
              setForm(f => ({ ...f, code: e.target.value.toUpperCase() }));
            }}
          />
        </label>
        <label className="ska-form-group">
          <span>Category</span>
          <select
            className="ska-input"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            style={{ cursor: 'pointer' }}
          >
            <option value="Core">Core</option>
            <option value="Elective">Elective</option>
          </select>
        </label>
        <label className="ska-form-group">
          <span>Grading Type</span>
          <select
            className="ska-input"
            value={form.grading_type}
            onChange={e => setForm(f => ({ ...f, grading_type: e.target.value }))}
            style={{ cursor: 'pointer' }}
          >
            <option value="Percentage">Percentage</option>
            <option value="Points">Points</option>
            <option value="Custom">Custom</option>
          </select>
        </label>
        <label className="ska-form-group">
          <span>Academic Year</span>
          <select
            className="ska-input"
            value={form.academic_year}
            onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
            style={{ cursor: 'pointer' }}
          >
            <option value="">Select year…</option>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
          <span>Description</span>
          <textarea
            className="ska-input"
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </label>
      </div>

      {/* Assign teachers */}
      {teachers.length > 0 && (
        <div className="subj-modal-section">
          <div className="subj-modal-section-label">
            <Ic name="school" size="sm" />
            Assign Teacher(s)
            {form.teacher_ids.length > 0 && <span className="cls-section-count">{form.teacher_ids.length}</span>}
            {suggestedTeacherIds.length > 0 && (
              <span className="subj-smart-hint">★ Smart suggestion active</span>
            )}
          </div>
          <div className="cls-assign-list">
            {teachers.map(t => (
              <div
                key={t.id}
                className={`cls-assign-item${form.teacher_ids.includes(t.id) ? ' cls-assign-item--checked' : ''}${suggestedTeacherIds.includes(t.id) && !form.teacher_ids.includes(t.id) ? ' subj-assign-suggested' : ''}`}
                onClick={() => toggleTeacher(t.id)}
              >
                <input type="checkbox" readOnly checked={form.teacher_ids.includes(t.id)} />
                <div className="cls-avatar cls-avatar--sm cls-avatar--teal">{getInitials(t.name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t.name}
                    {suggestedTeacherIds.includes(t.id) && (
                      <span className="subj-suggested-badge">★ Suggested</span>
                    )}
                  </div>
                  {t.email && <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)' }}>{t.email}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign classes */}
      {classes.length > 0 && (
        <div className="subj-modal-section">
          <div className="subj-modal-section-label">
            <Ic name="class" size="sm" />
            Assign to Classes
            {form.class_ids.length > 0 && <span className="cls-section-count">{form.class_ids.length}</span>}
          </div>
          <div className="cls-chips-grid">
            {classes.map(c => (
              <button
                key={c.id}
                type="button"
                className={`cls-chip${form.class_ids.includes(c.id) ? ' cls-chip--selected' : ''}`}
                onClick={() => toggleClass(c.id)}
              >
                {form.class_ids.includes(c.id) && <Ic name="check" />}
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="ska-modal-actions">
        <button className="ska-btn ska-btn--ghost" onClick={onClose}>Cancel</button>
        <button className="ska-btn ska-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : mode === 'add' ? 'Add Subject' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}

/* ============================================================
   ASSIGN TEACHER MODAL
   ============================================================ */
function AssignTeacherModal({ subject, teachers, meta, onSave, onClose }) {
  const m          = meta[subject.id] || defaultMeta();
  const [selected, setSelected] = useState([...m.teacher_ids]);
  const [saving,   setSaving]   = useState(false);

  const toggle = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(subject.id, { teacher_ids: selected });
    setSaving(false);
  };

  return (
    <Modal title={`Assign Teachers — ${subject.name}`} onClose={onClose}>
      {teachers.length === 0 ? (
        <div className="ska-empty">
          <p className="ska-empty-desc">No teachers found. Add teachers first.</p>
        </div>
      ) : (
        <div className="cls-assign-list">
          {teachers.map(t => (
            <div
              key={t.id}
              className={`cls-assign-item${selected.includes(t.id) ? ' cls-assign-item--checked' : ''}`}
              onClick={() => toggle(t.id)}
            >
              <input type="checkbox" readOnly checked={selected.includes(t.id)} />
              <div className="cls-avatar cls-avatar--teal">{getInitials(t.name)}</div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text)' }}>{t.name}</div>
                {t.email && <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)' }}>{t.email}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="ska-modal-actions">
        <button className="ska-btn ska-btn--ghost" onClick={onClose}>Cancel</button>
        <button
          className="ska-btn ska-btn--primary"
          onClick={handleSave}
          disabled={saving || teachers.length === 0}
        >
          {saving ? 'Saving…' : 'Save Assignment'}
        </button>
      </div>
    </Modal>
  );
}

/* ============================================================
   ASSIGN CLASSES MODAL
   ============================================================ */
function AssignClassesModal({ subject, classes, meta, onSave, onClose }) {
  const m          = meta[subject.id] || defaultMeta();
  const [selected, setSelected] = useState([...m.class_ids]);
  const [saving,   setSaving]   = useState(false);

  const toggle = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(subject.id, { class_ids: selected });
    setSaving(false);
  };

  return (
    <Modal title={`Assign to Classes — ${subject.name}`} onClose={onClose}>
      {classes.length === 0 ? (
        <div className="ska-empty">
          <p className="ska-empty-desc">No classes found. Add classes first.</p>
        </div>
      ) : (
        <div className="cls-chips-grid" style={{ marginBottom: 16 }}>
          {classes.map(c => (
            <button
              key={c.id}
              type="button"
              className={`cls-chip${selected.includes(c.id) ? ' cls-chip--selected' : ''}`}
              onClick={() => toggle(c.id)}
            >
              {selected.includes(c.id) && <Ic name="check" />}
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="ska-modal-actions">
        <button className="ska-btn ska-btn--ghost" onClick={onClose}>Cancel</button>
        <button
          className="ska-btn ska-btn--primary"
          onClick={handleSave}
          disabled={saving || classes.length === 0}
        >
          {saving ? 'Saving…' : 'Save Assignment'}
        </button>
      </div>
    </Modal>
  );
}

/* ============================================================
   MAIN — SubjectsPage
   ============================================================ */
export function SubjectsPage({ school }) {
  const [subjects,      setSubjects]      = useState([]);
  const [teachers,      setTeachers]      = useState([]);
  const [classes,       setClasses]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [meta,          setMeta]          = useState({});       // { [subject.id]: { teacher_ids, class_ids, category, grading_type, status } }
  const [detailSubject, setDetailSubject] = useState(null);
  const [modal,         setModal]         = useState(null);     // { type: 'add'|'edit'|'assign_teacher'|'assign_classes', subject }
  const [search,        setSearch]        = useState('');
  const [filters,       setFilters]       = useState({ status: '', category: '', teacher: '', class: '' });

  const STORAGE_KEY = `ek_subj_meta_${school?.id || 'default'}`;

  /* Load extended metadata from localStorage */
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      setMeta(stored);
    } catch { /* ignore */ }
  }, [STORAGE_KEY]);

  /* Persist metadata changes */
  const saveMeta = useCallback((newMeta) => {
    setMeta(newMeta);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newMeta)); } catch { /* ignore */ }
  }, [STORAGE_KEY]);

  /* Fetch subjects + teachers + classes */
  const load = useCallback(async () => {
    setLoading(true);
    const [sRes, tRes, cRes] = await Promise.allSettled([
      ApiClient.get('/api/school/subjects/'),
      ApiClient.get('/api/school/teachers/'),
      ApiClient.get('/api/school/classes/'),
    ]);

    if (sRes.status === 'fulfilled') {
      setSubjects(sRes.value.subjects || sRes.value || []);
    }
    if (tRes.status === 'fulfilled') {
      const raw = tRes.value.teachers || tRes.value || [];
      setTeachers(raw.map(x => ({
        id:    x.id,
        name:  x.full_name || x.name || `${x.first_name || ''} ${x.last_name || ''}`.trim() || 'Unknown',
        email: x.email || '',
      })));
    }
    if (cRes.status === 'fulfilled') {
      const raw = cRes.value.classes || cRes.value || [];
      setClasses(raw.map(x => ({
        id:            x.id,
        name:          x.name || x.class_name || 'Unknown',
        student_count: x.student_count ?? x.students_count,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Filtered list */
  const filtered = useMemo(() => {
    return subjects.filter(s => {
      const m = meta[s.id] || defaultMeta();
      const q = search.toLowerCase();
      if (q && !s.name.toLowerCase().includes(q) && !s.code.toLowerCase().includes(q)) return false;
      if (filters.status   && m.status   !== filters.status)                              return false;
      if (filters.category && m.category !== filters.category)                            return false;
      if (filters.teacher  && !m.teacher_ids.includes(Number(filters.teacher)))           return false;
      if (filters.class    && !m.class_ids.includes(Number(filters.class)))               return false;
      return true;
    });
  }, [subjects, meta, search, filters]);

  /* ── Save handlers ── */
  const handleAddSave = async (apiData, metaData) => {
    await ApiClient.post('/api/school/subjects/', apiData);
    const res  = await ApiClient.get('/api/school/subjects/');
    const all  = res.subjects || res || [];
    const newS = all.find(s => s.code.toUpperCase() === apiData.code.toUpperCase());
    if (newS) saveMeta({ ...meta, [newS.id]: { ...defaultMeta(), ...metaData } });
    setSubjects(all);
    setModal(null);
  };

  const handleEditSave = async (apiData, metaData) => {
    await ApiClient.put(`/api/school/subjects/${modal.subject.id}/`, apiData);
    saveMeta({ ...meta, [modal.subject.id]: { ...(meta[modal.subject.id] || defaultMeta()), ...metaData } });
    setModal(null);
    load();
  };

  const handleAssignMetaSave = async (subjectId, metaUpdate) => {
    saveMeta({ ...meta, [subjectId]: { ...(meta[subjectId] || defaultMeta()), ...metaUpdate } });
    setModal(null);
  };

  const handleToggleStatus = subject => {
    const m = meta[subject.id] || defaultMeta();
    saveMeta({ ...meta, [subject.id]: { ...m, status: m.status === 'Archived' ? 'Active' : 'Archived' } });
  };

  const handleDelete = async id => {
    if (!window.confirm('Remove this subject? This cannot be undone.')) return;
    try {
      await ApiClient.delete(`/api/school/subjects/${id}/`);
      const newMeta = { ...meta };
      delete newMeta[id];
      saveMeta(newMeta);
      load();
    } catch (e) { alert(e.message || 'Failed to remove subject.'); }
  };

  const existingCodes = subjects.map(s => s.code);

  /* ── Shared modal layer (renders in both list and detail views) ── */
  const modalLayer = (
    <>
      {modal?.type === 'add' && (
        <AddSubjectModal
          mode="add"
          subject={null}
          teachers={teachers}
          classes={classes}
          existingCodes={existingCodes}
          meta={meta}
          onSave={handleAddSave}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'edit' && (
        <AddSubjectModal
          mode="edit"
          subject={modal.subject}
          teachers={teachers}
          classes={classes}
          existingCodes={existingCodes}
          meta={meta}
          onSave={handleEditSave}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'assign_teacher' && (
        <AssignTeacherModal
          subject={modal.subject}
          teachers={teachers}
          meta={meta}
          onSave={handleAssignMetaSave}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'assign_classes' && (
        <AssignClassesModal
          subject={modal.subject}
          classes={classes}
          meta={meta}
          onSave={handleAssignMetaSave}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );

  /* ── Detail view ── */
  if (detailSubject) {
    const live = subjects.find(s => s.id === detailSubject.id) || detailSubject;
    return (
      <>
        <SubjectDetails
          subject={live}
          teachers={teachers}
          classes={classes}
          meta={meta}
          onBack={() => setDetailSubject(null)}
          onEdit={s => { setDetailSubject(null); setModal({ type: 'edit', subject: s }); }}
          onAssignTeacher={s => setModal({ type: 'assign_teacher', subject: s })}
          onAssignClasses={s => setModal({ type: 'assign_classes', subject: s })}
        />
        {modalLayer}
      </>
    );
  }

  /* ── List view ── */
  return (
    <>
      <div className="ska-content">
        {/* Header */}
        <div className="ska-page-head ska-page-head--action">
          <div>
            <h1 className="ska-page-title">Subjects</h1>
            <p className="ska-page-sub">
              {school?.name} — {subjects.length} total{filtered.length !== subjects.length ? `, ${filtered.length} shown` : ''}
            </p>
          </div>
          <button className="ska-btn ska-btn--primary" onClick={() => setModal({ type: 'add', subject: null })}>
            <Ic name="add" size="sm" /> Add Subject
          </button>
        </div>

        {/* Stats */}
        <StatsCards subjects={subjects} meta={meta} />

        {/* Filters */}
        <FiltersBar
          search={search}
          setSearch={setSearch}
          filters={filters}
          setFilters={setFilters}
          teachers={teachers}
          classes={classes}
        />

        {/* Table */}
        <div className="ska-card" style={{ overflowX: 'auto' }}>
          <SubjectsTable
            subjects={filtered}
            teachers={teachers}
            classes={classes}
            meta={meta}
            loading={loading}
            onView={setDetailSubject}
            onEdit={s => setModal({ type: 'edit', subject: s })}
            onAssignTeacher={s => setModal({ type: 'assign_teacher', subject: s })}
            onAssignClasses={s => setModal({ type: 'assign_classes', subject: s })}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {modalLayer}
    </>
  );
}
