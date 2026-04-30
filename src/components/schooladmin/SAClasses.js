import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ApiClient from '../../api/client';
import './Classes.css';

/* ─── Material Symbol icon shorthand ─── */
const Ic = ({ name, size, className = '', style }) => (
  <span
    className={`ska-icon${size ? ` ska-icon--${size}` : ''} ${className}`}
    style={style}
    aria-hidden="true"
  >
    {name}
  </span>
);

/* ─── Reusable modal shell ─── */
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

/* ─── Utilities ─── */
function suggestCode(name) {
  if (!name?.trim()) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
  return parts.map((p, i) => i === 0 ? p[0] : p.replace(/[^A-Za-z0-9]/g, '')).join('').toUpperCase().slice(0, 8);
}

function capStatus(count, cap) {
  const pct = cap > 0 ? (count / cap) * 100 : 0;
  if (pct >= 100) return 'full';
  if (pct >= 80)  return 'warn';
  return 'ok';
}

function capColor(status) {
  if (status === 'full') return 'var(--ska-error)';
  if (status === 'warn') return '#ffb786';
  return 'var(--ska-green)';
}

/* ============================================================
   STATS CARDS
   ============================================================ */
function StatsCards({ classes }) {
  const total          = classes.length;
  const totalStudents  = classes.reduce((s, c) => s + (c.student_count || 0), 0);
  const totalCapacity  = classes.reduce((s, c) => s + (c.capacity    || 0), 0);
  const avgPct         = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;
  const active         = classes.filter(c => c.is_active !== false).length;

  const cards = [
    {
      label: 'Total Classes',
      value: total,
      icon: 'class',
      color: 'var(--ska-primary)',
      bg: 'var(--ska-primary-dim)',
    },
    {
      label: 'Total Students',
      value: totalStudents,
      icon: 'group',
      color: 'var(--ska-secondary)',
      bg: 'var(--ska-secondary-dim)',
    },
    {
      label: 'Avg Capacity Usage',
      value: `${avgPct}%`,
      icon: 'speed',
      color: avgPct >= 80 ? '#ffb786' : 'var(--ska-green)',
      bg: avgPct >= 80 ? 'rgba(255,183,134,0.12)' : 'var(--ska-green-dim)',
    },
    {
      label: 'Active Classes',
      value: active,
      icon: 'check_circle',
      color: 'var(--ska-green)',
      bg: 'var(--ska-green-dim)',
    },
  ];

  return (
    <div className="cls-stats-grid">
      {cards.map(c => (
        <div key={c.label} className="ska-metric-card cls-stat-card">
          <div className="ska-metric-top">
            <div className="ska-metric-icon" style={{ background: c.bg, color: c.color }}>
              <Ic name={c.icon} />
            </div>
          </div>
          <p className="ska-metric-label">{c.label}</p>
          <p className="ska-metric-value" style={{ color: c.color }}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   FILTERS BAR
   ============================================================ */
function FiltersBar({ search, onSearch, filterForm, onFilterForm, filterStatus, onFilterStatus, filterTeacher, onFilterTeacher, teachers }) {
  return (
    <div className="cls-filters">
      <div className="ska-search cls-search-box">
        <Ic name="search" size="sm" />
        <input
          className="ska-search-input"
          placeholder="Search by name or code…"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
        {search && (
          <button className="cls-clear-btn" onClick={() => onSearch('')} aria-label="Clear">
            <Ic name="close" size="sm" />
          </button>
        )}
      </div>

      <select className="ska-chart-select cls-select" value={filterForm} onChange={e => onFilterForm(e.target.value)}>
        <option value="">All Forms</option>
        {[1,2,3,4,5,6].map(n => <option key={n} value={n}>Form {n}</option>)}
      </select>

      <select className="ska-chart-select cls-select" value={filterTeacher} onChange={e => onFilterTeacher(e.target.value)}>
        <option value="">All Teachers</option>
        {teachers.map(t => (
          <option key={t.id} value={t.id}>{t.full_name || t.username}</option>
        ))}
      </select>

      <select className="ska-chart-select cls-select" value={filterStatus} onChange={e => onFilterStatus(e.target.value)}>
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>
    </div>
  );
}

/* ============================================================
   CLASS ROW
   ============================================================ */
function ClassRow({ cls, onView, onEdit, onDelete, onAssignStudents, onAssignTeacher, onManageSubjects, onViewTimetable }) {
  const count   = cls.student_count || 0;
  const cap     = cls.capacity     || 1;
  const pct     = Math.min(100, Math.round((count / cap) * 100));
  const status  = capStatus(count, cap);
  const color   = capColor(status);
  const isActive = cls.is_active !== false;

  return (
    <tr>
      {/* Class name */}
      <td>
        <div className="cls-name-cell">
          <div className="cls-avatar">{(cls.name || 'C').charAt(0).toUpperCase()}</div>
          <div>
            <div className="cls-name-text">{cls.name}</div>
            {cls.room && <div className="cls-name-meta">Room {cls.room}</div>}
          </div>
        </div>
      </td>

      {/* Code */}
      <td><span className="ska-badge ska-badge--cyan">{cls.code}</span></td>

      {/* Form */}
      <td>Form {cls.form_number}</td>

      {/* Capacity */}
      <td>{cls.capacity}</td>

      {/* Students + progress */}
      <td style={{ minWidth: 160 }}>
        <div className="cls-cap-cell">
          <div className="cls-cap-row">
            <span>{count} / {cap}</span>
            <span style={{ color, fontWeight: 700, fontSize: '0.75rem' }}>{pct}%</span>
          </div>
          <div className="ska-progress-track cls-progress-track">
            <div className="ska-progress-fill" style={{ width: `${pct}%`, background: color }} />
          </div>
          {status === 'warn' && <span className="cls-cap-warn">⚠ Almost full</span>}
          {status === 'full' && <span className="cls-cap-warn cls-cap-warn--red">Full</span>}
        </div>
      </td>

      {/* Teacher */}
      <td>
        {cls.teacher_name ? (
          <div className="cls-teacher-cell">
            <div className="cls-avatar cls-avatar--sm cls-avatar--teal">
              {cls.teacher_name.charAt(0)}
            </div>
            <span className="cls-teacher-name">{cls.teacher_name}</span>
          </div>
        ) : (
          <span className="cls-unassigned">Unassigned</span>
        )}
      </td>

      {/* Subjects count */}
      <td>
        <span className="ska-badge ska-badge--primary">
          {cls.subjects_count || 0} subj.
        </span>
      </td>

      {/* Status */}
      <td>
        <span className={`ska-badge ${isActive ? 'ska-badge--active' : 'ska-badge--inactive'}`}>
          {isActive ? 'Active' : 'Archived'}
        </span>
      </td>

      {/* Actions */}
      <td>
        <div className="cls-row-actions">
          <button className="ska-btn ska-btn--ghost ska-btn--sm" title="View Class"         onClick={() => onView(cls)}>
            <Ic name="visibility" size="sm" />
          </button>
          <button className="ska-btn ska-btn--ghost ska-btn--sm" title="Assign Students"    onClick={() => onAssignStudents(cls)}>
            <Ic name="group_add" size="sm" />
          </button>
          <button className="ska-btn ska-btn--ghost ska-btn--sm" title="Assign Teacher"     onClick={() => onAssignTeacher(cls)}>
            <Ic name="person_add" size="sm" />
          </button>
          <button className="ska-btn ska-btn--ghost ska-btn--sm" title="Manage Subjects"    onClick={() => onManageSubjects(cls)}>
            <Ic name="menu_book" size="sm" />
          </button>
          <button className="ska-btn ska-btn--ghost ska-btn--sm" title="View Timetable"     onClick={() => onViewTimetable(cls)}>
            <Ic name="calendar_today" size="sm" />
          </button>
          <button className="ska-btn ska-btn--ghost ska-btn--sm" title="Edit"               onClick={() => onEdit(cls)}>
            <Ic name="edit" size="sm" />
          </button>
          <button className="ska-btn ska-btn--ghost ska-btn--sm ska-btn--danger" title="Delete" onClick={() => onDelete(cls.id)}>
            <Ic name="delete" size="sm" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ============================================================
   CLASSES TABLE
   ============================================================ */
function ClassesTable({ classes, loading, onView, onEdit, onDelete, onAssignStudents, onAssignTeacher, onManageSubjects, onViewTimetable }) {
  if (loading) {
    return (
      <div className="ska-card ska-card-pad">
        <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="ska-card ska-card-pad">
        <div className="ska-empty">
          <Ic name="class" size="xl" style={{ color: 'var(--ska-tertiary)', marginBottom: 12 }} />
          <p className="ska-empty-title">No classes found</p>
          <p className="ska-empty-desc">Try adjusting your filters or add a new class.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ska-card cls-table-wrap">
      <table className="ska-table">
        <thead>
          <tr>
            <th>Class</th>
            <th>Code</th>
            <th>Form</th>
            <th>Capacity</th>
            <th>Students</th>
            <th>Teacher</th>
            <th>Subjects</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {classes.map(cls => (
            <ClassRow
              key={cls.id}
              cls={cls}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onAssignStudents={onAssignStudents}
              onAssignTeacher={onAssignTeacher}
              onManageSubjects={onManageSubjects}
              onViewTimetable={onViewTimetable}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   CLASS DETAILS PAGE
   ============================================================ */
function ClassDetails({ cls, students, teachers, subjects, onBack, onAssignStudents, onAssignTeacher, onEdit }) {
  const count    = cls.student_count || 0;
  const cap      = cls.capacity     || 1;
  const pct      = Math.min(100, Math.round((count / cap) * 100));
  const status   = capStatus(count, cap);
  const isActive = cls.is_active !== false;

  const teacher       = teachers.find(t => t.id === cls.teacher_id);
  const classStudents = students.filter(s => s.class_id === cls.id || s.current_class === cls.id);
  const classSubjects = subjects.filter(s => (cls.subject_ids || []).includes(s.id));

  const DAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const PERIODS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM'];

  return (
    <div className="ska-content">
      {/* Header */}
      <div className="ska-page-head ska-page-head--action">
        <div>
          <button className="cls-back-btn" onClick={onBack}>
            <Ic name="arrow_back" size="sm" /> Back to Classes
          </button>
          <h1 className="ska-page-title" style={{ marginTop: 6 }}>{cls.name}</h1>
          <p className="ska-page-sub">
            Code: {cls.code} · Form {cls.form_number}
            {cls.room ? ` · Room ${cls.room}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="ska-btn ska-btn--ghost" onClick={() => onAssignStudents(cls)}>
            <Ic name="group_add" size="sm" /> Assign Students
          </button>
          <button className="ska-btn ska-btn--primary" onClick={() => onEdit(cls)}>
            <Ic name="edit" size="sm" /> Edit Class
          </button>
        </div>
      </div>

      {/* Overview metric cards */}
      <div className="cls-detail-overview">
        {/* Enrollment */}
        <div className="ska-metric-card">
          <div className="ska-metric-top">
            <div className="ska-metric-icon" style={{ background: 'var(--ska-green-dim)', color: 'var(--ska-green)' }}>
              <Ic name="group" />
            </div>
            <span className={`ska-badge ${isActive ? 'ska-badge--active' : 'ska-badge--inactive'}`}>
              {isActive ? 'Active' : 'Archived'}
            </span>
          </div>
          <p className="ska-metric-label">Enrollment</p>
          <p className="ska-metric-value" style={{ color: capColor(status) }}>{count}</p>
          <p className="ska-metric-desc">of {cap} seats · {pct}% full</p>
          <div className="ska-progress-track" style={{ marginTop: 10 }}>
            <div className="ska-progress-fill" style={{ width: `${pct}%`, background: capColor(status) }} />
          </div>
        </div>

        {/* Teacher */}
        <div className="ska-metric-card">
          <div className="ska-metric-top">
            <div className="ska-metric-icon" style={{ background: 'var(--ska-secondary-dim)', color: 'var(--ska-secondary)' }}>
              <Ic name="school" />
            </div>
          </div>
          <p className="ska-metric-label">Class Teacher</p>
          {teacher ? (
            <>
              <p className="ska-metric-value" style={{ fontSize: '1.1rem', lineHeight: 1.3 }}>
                {teacher.full_name || teacher.username}
              </p>
              <p className="ska-metric-desc">{teacher.email || ''}</p>
            </>
          ) : (
            <>
              <p className="ska-metric-value cls-unassigned" style={{ fontSize: '0.95rem' }}>Not assigned</p>
              <button className="ska-btn ska-btn--ghost ska-btn--sm" style={{ marginTop: 8 }} onClick={() => onAssignTeacher(cls)}>
                <Ic name="person_add" size="sm" /> Assign Teacher
              </button>
            </>
          )}
        </div>

        {/* Subjects */}
        <div className="ska-metric-card">
          <div className="ska-metric-top">
            <div className="ska-metric-icon" style={{ background: 'var(--ska-tertiary-dim)', color: 'var(--ska-tertiary)' }}>
              <Ic name="menu_book" />
            </div>
          </div>
          <p className="ska-metric-label">Subjects</p>
          <p className="ska-metric-value" style={{ color: 'var(--ska-tertiary)' }}>
            {cls.subjects_count || classSubjects.length}
          </p>
          <p className="ska-metric-desc">assigned subjects</p>
        </div>

        {/* Capacity */}
        <div className="ska-metric-card">
          <div className="ska-metric-top">
            <div className="ska-metric-icon" style={{ background: 'var(--ska-primary-dim)', color: 'var(--ska-primary)' }}>
              <Ic name="chair" />
            </div>
          </div>
          <p className="ska-metric-label">Capacity</p>
          <p className="ska-metric-value">{cap}</p>
          <p className="ska-metric-desc">{cap - count} seat{cap - count !== 1 ? 's' : ''} available</p>
        </div>
      </div>

      {/* Detail sections grid */}
      <div className="cls-detail-grid">
        {/* Students list */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h3 className="ska-card-title">
              <Ic name="group" size="sm" style={{ marginRight: 6, color: 'var(--ska-secondary)' }} />
              Students
              <span className="cls-section-count">{classStudents.length || count}</span>
            </h3>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onAssignStudents(cls)}>
              <Ic name="add" size="sm" /> Add
            </button>
          </div>
          {classStudents.length === 0 ? (
            <p className="ska-empty-desc" style={{ padding: '12px 0' }}>
              Use "Assign Students" to manage class enrollment.
            </p>
          ) : (
            <div className="cls-member-list">
              {classStudents.slice(0, 8).map(s => {
                const name = s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Student';
                return (
                  <div key={s.id} className="cls-member-item">
                    <div className="cls-avatar cls-avatar--sm">{name.charAt(0)}</div>
                    <div>
                      <div className="cls-member-name">{name}</div>
                      <div className="cls-member-id">{s.admission_number || `ID: ${s.id}`}</div>
                    </div>
                  </div>
                );
              })}
              {classStudents.length > 8 && (
                <p className="ska-metric-desc" style={{ textAlign: 'center', marginTop: 8 }}>
                  +{classStudents.length - 8} more students
                </p>
              )}
            </div>
          )}
        </div>

        {/* Subjects list */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h3 className="ska-card-title">
              <Ic name="menu_book" size="sm" style={{ marginRight: 6, color: 'var(--ska-tertiary)' }} />
              Subjects
              <span className="cls-section-count">{classSubjects.length}</span>
            </h3>
          </div>
          {classSubjects.length === 0 ? (
            <p className="ska-empty-desc" style={{ padding: '12px 0' }}>
              No subjects assigned. Edit the class to add subjects.
            </p>
          ) : (
            <div className="cls-subject-list">
              {classSubjects.map(s => (
                <div key={s.id} className="cls-subject-item">
                  <div className="cls-subject-dot" />
                  <span className="cls-subject-name">{s.name}</span>
                  <span className="ska-badge ska-badge--cyan" style={{ marginLeft: 'auto' }}>{s.code}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Teacher card */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h3 className="ska-card-title">
              <Ic name="school" size="sm" style={{ marginRight: 6, color: 'var(--ska-secondary)' }} />
              Class Teacher
            </h3>
            {teacher && (
              <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onAssignTeacher(cls)}>
                <Ic name="swap_horiz" size="sm" /> Change
              </button>
            )}
          </div>
          {teacher ? (
            <div className="cls-teacher-profile">
              <div className="cls-avatar cls-avatar--lg cls-avatar--teal">{(teacher.full_name || teacher.username || 'T').charAt(0)}</div>
              <div>
                <div className="cls-teacher-fullname">{teacher.full_name || teacher.username}</div>
                <div className="cls-teacher-email">{teacher.email || ''}</div>
                {teacher.department && <div className="cls-teacher-dept">{teacher.department}</div>}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Ic name="person_off" style={{ fontSize: 32, color: 'var(--ska-text-3)' }} />
              <p className="ska-empty-desc" style={{ marginTop: 8 }}>No teacher assigned</p>
              <button className="ska-btn ska-btn--ghost ska-btn--sm" style={{ marginTop: 8 }} onClick={() => onAssignTeacher(cls)}>
                <Ic name="person_add" size="sm" /> Assign Teacher
              </button>
            </div>
          )}
        </div>

        {/* Timetable preview */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head">
            <h3 className="ska-card-title">
              <Ic name="calendar_today" size="sm" style={{ marginRight: 6, color: 'var(--ska-primary)' }} />
              Timetable Preview
            </h3>
            <button className="ska-btn ska-btn--ghost ska-btn--sm">
              <Ic name="open_in_new" size="sm" /> Full View
            </button>
          </div>
          <div className="cls-timetable">
            <div className="cls-tt-header">
              <div className="cls-tt-time-col" />
              {DAYS.map(d => <div key={d} className="cls-tt-day">{d}</div>)}
            </div>
            {PERIODS.map(p => (
              <div key={p} className="cls-tt-row">
                <div className="cls-tt-time">{p}</div>
                {DAYS.map(d => <div key={d} className="cls-tt-cell" />)}
              </div>
            ))}
          </div>
          <p className="ska-metric-desc" style={{ textAlign: 'center', marginTop: 10 }}>
            Full timetable management coming soon
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ADD / EDIT CLASS MODAL
   ============================================================ */
function AddClassModal({ mode, initialForm, existingCodes, teachers, subjects, academicYears, onSave, onClose }) {
  const [form, setForm]           = useState(initialForm);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [codeManual, setCodeManual] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleNameChange = e => {
    const name = e.target.value;
    set('name', name);
    if (!codeManual && mode === 'add') {
      set('code', suggestCode(name));
    }
  };

  const toggleSubject = id => {
    const ids = form.subject_ids || [];
    set('subject_ids', ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  };

  const save = async () => {
    if (!form.name?.trim())  { setError('Class name is required.');  return; }
    if (!form.code?.trim())  { setError('Class code is required.');  return; }
    const codeUp = form.code.trim().toUpperCase();
    if (existingCodes.map(c => c.toUpperCase()).includes(codeUp)) {
      setError(`Code "${codeUp}" already exists. Please use a unique code.`);
      return;
    }
    setSaving(true); setError('');
    try {
      await onSave({ ...form, code: codeUp });
    } catch (e) {
      setError(e.message || 'Failed to save.');
      setSaving(false);
    }
  };

  const capWarn = (form.capacity || 0) > 60;

  return (
    <Modal title={mode === 'add' ? 'Add New Class' : 'Edit Class'} onClose={onClose} wide>
      {error && <p className="ska-form-error">{error}</p>}

      <div className="ska-form-grid">
        {/* Name */}
        <label className="ska-form-group">
          <span>Class Name *</span>
          <input className="ska-input" placeholder="e.g. Grade 10A" value={form.name}
            onChange={handleNameChange} />
        </label>

        {/* Code */}
        <label className="ska-form-group">
          <span>
            Code *{' '}
            {mode === 'add' && <span className="cls-hint">(auto-suggested)</span>}
          </span>
          <input
            className="ska-input"
            placeholder="e.g. G10A"
            value={form.code}
            disabled={mode === 'edit'}
            onChange={e => { setCodeManual(true); set('code', e.target.value); }}
          />
        </label>

        {/* Form number */}
        <label className="ska-form-group">
          <span>Form / Grade</span>
          <input className="ska-input" type="number" min="1" max="6" value={form.form_number}
            onChange={e => set('form_number', parseInt(e.target.value) || 1)} />
        </label>

        {/* Capacity */}
        <label className="ska-form-group">
          <span>Capacity</span>
          <input className="ska-input" type="number" min="1" value={form.capacity}
            onChange={e => set('capacity', parseInt(e.target.value) || 50)} />
          {capWarn && (
            <span className="cls-cap-warn" style={{ marginTop: 4, fontSize: '0.75rem' }}>
              ⚠ High capacity — consider splitting into sections
            </span>
          )}
        </label>

        {/* Teacher */}
        <label className="ska-form-group">
          <span>Class Teacher</span>
          <select className="ska-input" value={form.teacher_id || ''}
            onChange={e => set('teacher_id', e.target.value ? parseInt(e.target.value) : null)}>
            <option value="">— No teacher assigned —</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.full_name || t.username}</option>
            ))}
          </select>
        </label>

        {/* Academic Year */}
        {academicYears.length > 0 && (
          <label className="ska-form-group">
            <span>Academic Year</span>
            <select className="ska-input" value={form.academic_year_id || ''}
              onChange={e => set('academic_year_id', e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">— Select year —</option>
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </label>
        )}

        {/* Room */}
        <label className="ska-form-group">
          <span>Room <span className="cls-hint">(optional)</span></span>
          <input className="ska-input" placeholder="e.g. Block A, Room 12" value={form.room || ''}
            onChange={e => set('room', e.target.value)} />
        </label>

        {/* Status */}
        <label className="ska-form-group">
          <span>Status</span>
          <select className="ska-input" value={form.is_active ? 'active' : 'archived'}
            onChange={e => set('is_active', e.target.value === 'active')}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      {/* Subjects multi-select */}
      {subjects.length > 0 && (
        <div className="cls-subjects-section">
          <div className="cls-subjects-label">
            <Ic name="menu_book" size="sm" style={{ color: 'var(--ska-tertiary)' }} />
            Assign Subjects
            {(form.subject_ids || []).length > 0 && (
              <span className="cls-section-count">{form.subject_ids.length} selected</span>
            )}
          </div>
          <div className="cls-chips-grid">
            {subjects.map(s => {
              const sel = (form.subject_ids || []).includes(s.id);
              return (
                <button key={s.id} type="button"
                  className={`cls-chip${sel ? ' cls-chip--selected' : ''}`}
                  onClick={() => toggleSubject(s.id)}>
                  {sel && <Ic name="check" size="sm" />}
                  {s.name}
                  <span className="cls-chip-code">{s.code}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="ska-modal-actions">
        <button className="ska-btn ska-btn--ghost" onClick={onClose}>Cancel</button>
        <button className="ska-btn ska-btn--primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : mode === 'add' ? 'Add Class' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}

/* ============================================================
   ASSIGN STUDENTS MODAL
   ============================================================ */
function AssignStudentsModal({ cls, allStudents, onClose, onSave }) {
  const alreadyIn = new Set(
    allStudents
      .filter(s => s.class_id === cls.id || s.current_class === cls.id)
      .map(s => s.id)
  );
  const [selected, setSelected] = useState(new Set([...alreadyIn]));
  const [search,   setSearch]   = useState('');
  const [saving,   setSaving]   = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allStudents.filter(s => {
      const name = s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim();
      return name.toLowerCase().includes(q) || (s.admission_number || '').toLowerCase().includes(q);
    });
  }, [allStudents, search]);

  const toggle = id => setSelected(sel => {
    const next = new Set(sel);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    setSaving(true);
    try { await onSave(cls.id, [...selected]); }
    catch { setSaving(false); }
  };

  return (
    <Modal title={`Assign Students — ${cls.name}`} onClose={onClose} wide>
      <div className="ska-search cls-search-box" style={{ marginBottom: 12 }}>
        <Ic name="search" size="sm" />
        <input className="ska-search-input" placeholder="Search by name or admission number…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="cls-assign-list">
        {filtered.length === 0 ? (
          <p className="ska-empty-desc" style={{ padding: '24px 0', textAlign: 'center' }}>
            No students found.
          </p>
        ) : (
          filtered.map(s => {
            const name    = s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Student';
            const checked = selected.has(s.id);
            return (
              <label key={s.id} className={`cls-assign-item${checked ? ' cls-assign-item--checked' : ''}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(s.id)} />
                <div className="cls-avatar cls-avatar--sm">{name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cls-member-name">{name}</div>
                  <div className="cls-member-id">{s.admission_number || `ID: ${s.id}`}</div>
                </div>
                {checked && <Ic name="check_circle" size="sm" style={{ color: 'var(--ska-green)', flexShrink: 0 }} />}
              </label>
            );
          })
        )}
      </div>

      <div className="ska-modal-actions">
        <span className="ska-metric-desc">{selected.size} student{selected.size !== 1 ? 's' : ''} selected</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ska-btn ska-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="ska-btn ska-btn--primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   ASSIGN TEACHER MODAL
   ============================================================ */
function AssignTeacherModal({ cls, teachers, onClose, onSave }) {
  const [selected, setSelected] = useState(cls.teacher_id || null);
  const [saving,   setSaving]   = useState(false);

  const save = async () => {
    setSaving(true);
    try { await onSave(cls.id, selected); }
    catch { setSaving(false); }
  };

  return (
    <Modal title={`Assign Teacher — ${cls.name}`} onClose={onClose}>
      <p className="ska-page-sub" style={{ marginBottom: 14 }}>
        Select a teacher to assign as class teacher.
      </p>
      <div className="cls-assign-list">
        {teachers.length === 0 ? (
          <p className="ska-empty-desc" style={{ padding: '24px 0', textAlign: 'center' }}>
            No teachers found. Add teachers first.
          </p>
        ) : (
          teachers.map(t => {
            const name    = t.full_name || t.username;
            const checked = selected === t.id;
            return (
              <label key={t.id} className={`cls-assign-item${checked ? ' cls-assign-item--checked' : ''}`}>
                <input type="radio" name="teacher_pick" checked={checked} onChange={() => setSelected(t.id)} />
                <div className="cls-avatar cls-avatar--sm cls-avatar--teal">{name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cls-member-name">{name}</div>
                  <div className="cls-member-id">{t.email || t.department || ''}</div>
                </div>
                {checked && <Ic name="check_circle" size="sm" style={{ color: 'var(--ska-green)', flexShrink: 0 }} />}
              </label>
            );
          })
        )}
      </div>
      <div className="ska-modal-actions">
        <button className="ska-btn ska-btn--ghost" onClick={onClose}>Cancel</button>
        <button className="ska-btn ska-btn--primary" onClick={save} disabled={saving || !selected}>
          {saving ? 'Saving…' : 'Assign Teacher'}
        </button>
      </div>
    </Modal>
  );
}

/* ============================================================
   MANAGE SUBJECTS MODAL
   ============================================================ */
function ManageSubjectsModal({ cls, subjects, onClose, onSave }) {
  const [selected, setSelected] = useState(new Set(cls.subject_ids || []));
  const [saving,   setSaving]   = useState(false);

  const toggle = id => setSelected(sel => {
    const next = new Set(sel);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    setSaving(true);
    try { await onSave(cls.id, [...selected]); }
    catch { setSaving(false); }
  };

  return (
    <Modal title={`Manage Subjects — ${cls.name}`} onClose={onClose} wide>
      <p className="ska-page-sub" style={{ marginBottom: 14 }}>
        Select subjects to assign to this class.
      </p>
      {subjects.length === 0 ? (
        <p className="ska-empty-desc" style={{ padding: '24px 0', textAlign: 'center' }}>
          No subjects available. Add subjects first.
        </p>
      ) : (
        <div className="cls-chips-grid" style={{ marginBottom: 16 }}>
          {subjects.map(s => {
            const sel = selected.has(s.id);
            return (
              <button key={s.id} type="button"
                className={`cls-chip${sel ? ' cls-chip--selected' : ''}`}
                onClick={() => toggle(s.id)}>
                {sel && <Ic name="check" size="sm" />}
                {s.name}
                <span className="cls-chip-code">{s.code}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="ska-modal-actions">
        <span className="ska-metric-desc">{selected.size} subject{selected.size !== 1 ? 's' : ''} selected</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ska-btn ska-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="ska-btn ska-btn--primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Subjects'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   MAIN CLASSES PAGE
   ============================================================ */
const EMPTY_FORM = {
  name: '', code: '', form_number: 1, capacity: 50,
  teacher_id: null, subject_ids: [], academic_year_id: null,
  room: '', is_active: true,
};

export function ClassesPage({ school }) {
  /* ── Data state ── */
  const [classes,       setClasses]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [teachers,      setTeachers]      = useState([]);
  const [subjects,      setSubjects]      = useState([]);
  const [students,      setStudents]      = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  /* ── View state ── */
  const [view,        setView]        = useState('list'); // 'list' | 'detail'
  const [detailClass, setDetailClass] = useState(null);

  /* ── Modal state ── */
  const [modal,       setModal]       = useState(null); // null | 'add' | 'edit' | 'assign_students' | 'assign_teacher' | 'manage_subjects'
  const [activeClass, setActiveClass] = useState(null);
  const [editForm,    setEditForm]    = useState({ ...EMPTY_FORM });

  /* ── Filter state ── */
  const [search,        setSearch]        = useState('');
  const [filterForm,    setFilterForm]    = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');

  /* ── Track detailClass id across load() calls ── */
  const detailIdRef = useRef(null);
  useEffect(() => { detailIdRef.current = detailClass?.id ?? null; }, [detailClass]);

  /* ── Load all data ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cd, td, sd] = await Promise.all([
        ApiClient.get('/api/school/classes/').catch(() => ({ classes: [] })),
        ApiClient.get('/api/school/teachers/').catch(() => ({ teachers: [] })),
        ApiClient.get('/api/school/subjects/').catch(() => ({ subjects: [] })),
      ]);
      const freshClasses = cd.classes || [];
      setClasses(freshClasses);
      setTeachers(td.teachers || []);
      setSubjects(sd.subjects || []);

      /* Keep detailClass in sync */
      const did = detailIdRef.current;
      if (did) {
        const updated = freshClasses.find(c => c.id === did);
        if (updated) setDetailClass(updated);
      }

      /* Load students lazily in background */
      ApiClient.get('/api/school/students/')
        .then(r => setStudents(r.students || []))
        .catch(() => {});

      /* Load academic years lazily */
      ApiClient.get('/api/school/academic-years/')
        .then(r => setAcademicYears(r.academic_years || r.results || []))
        .catch(() => {});
    } catch {
      setClasses([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Derived: filtered classes ── */
  const filtered = useMemo(() => {
    return classes.filter(c => {
      const q = search.toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) return false;
      if (filterForm   && String(c.form_number) !== String(filterForm)) return false;
      if (filterTeacher && String(c.teacher_id)  !== String(filterTeacher)) return false;
      if (filterStatus === 'active'   && c.is_active === false) return false;
      if (filterStatus === 'archived' && c.is_active !== false) return false;
      return true;
    });
  }, [classes, search, filterForm, filterTeacher, filterStatus]);

  const existingCodes = classes.map(c => (c.code || '').toUpperCase());

  /* ── Handlers: navigation ── */
  const openDetail = cls => { setDetailClass(cls); setView('detail'); };
  const backToList = ()  => setView('list');

  /* ── Handlers: modals ── */
  const openAdd = () => {
    setEditForm({ ...EMPTY_FORM });
    setActiveClass(null);
    setModal('add');
  };
  const openEdit = cls => {
    setEditForm({
      name: cls.name, code: cls.code, form_number: cls.form_number,
      capacity: cls.capacity, teacher_id: cls.teacher_id || null,
      subject_ids: cls.subject_ids || [], academic_year_id: cls.academic_year_id || null,
      room: cls.room || '', is_active: cls.is_active !== false,
    });
    setActiveClass(cls);
    setModal('edit');
  };
  const openAssignStudents  = cls => { setActiveClass(cls); setModal('assign_students'); };
  const openAssignTeacher   = cls => { setActiveClass(cls); setModal('assign_teacher'); };
  const openManageSubjects  = cls => { setActiveClass(cls); setModal('manage_subjects'); };
  const openViewTimetable   = cls => {
    alert(`Timetable for ${cls.name} — full timetable management coming soon!`);
  };
  const closeModal = () => setModal(null);

  /* ── Handlers: CRUD ── */
  const handleSave = async form => {
    if (modal === 'add') {
      await ApiClient.post('/api/school/classes/', form);
    } else {
      await ApiClient.put(`/api/school/classes/${activeClass.id}/`, form);
    }
    closeModal();
    load();
  };

  const handleDelete = async id => {
    if (!window.confirm('Remove this class? This cannot be undone.')) return;
    try {
      await ApiClient.delete(`/api/school/classes/${id}/`);
      if (detailClass?.id === id) setView('list');
      load();
    } catch (e) {
      alert(e.message || 'Failed to remove class.');
    }
  };

  const handleAssignStudents = async (classId, studentIds) => {
    try {
      await ApiClient.post(`/api/school/classes/${classId}/assign-students/`, { student_ids: studentIds });
    } catch { /* endpoint may not exist yet — handled gracefully */ }
    closeModal();
    load();
  };

  const handleAssignTeacher = async (classId, teacherId) => {
    try {
      await ApiClient.put(`/api/school/classes/${classId}/`, { teacher_id: teacherId });
    } catch { /* handled gracefully */ }
    closeModal();
    load();
  };

  const handleManageSubjects = async (classId, subjectIds) => {
    try {
      await ApiClient.post(`/api/school/classes/${classId}/assign-subjects/`, { subject_ids: subjectIds });
    } catch { /* handled gracefully */ }
    closeModal();
    load();
  };

  /* ── Detail view ── */
  if (view === 'detail' && detailClass) {
    return (
      <>
        <ClassDetails
          cls={detailClass}
          students={students}
          teachers={teachers}
          subjects={subjects}
          onBack={backToList}
          onAssignStudents={openAssignStudents}
          onAssignTeacher={openAssignTeacher}
          onEdit={openEdit}
        />
        {/* Modals from detail view */}
        {(modal === 'add' || modal === 'edit') && (
          <AddClassModal
            mode={modal}
            initialForm={editForm}
            existingCodes={modal === 'edit' ? existingCodes.filter(c => c !== activeClass?.code?.toUpperCase()) : existingCodes}
            teachers={teachers}
            subjects={subjects}
            academicYears={academicYears}
            onSave={handleSave}
            onClose={closeModal}
          />
        )}
        {modal === 'assign_students' && activeClass && (
          <AssignStudentsModal cls={activeClass} allStudents={students} onClose={closeModal} onSave={handleAssignStudents} />
        )}
        {modal === 'assign_teacher' && activeClass && (
          <AssignTeacherModal cls={activeClass} teachers={teachers} onClose={closeModal} onSave={handleAssignTeacher} />
        )}
        {modal === 'manage_subjects' && activeClass && (
          <ManageSubjectsModal cls={activeClass} subjects={subjects} onClose={closeModal} onSave={handleManageSubjects} />
        )}
      </>
    );
  }

  /* ── List view ── */
  return (
    <div className="ska-content">
      {/* Page header */}
      <div className="ska-page-head ska-page-head--action">
        <div>
          <h1 className="ska-page-title">Classes</h1>
          <p className="ska-page-sub">
            {school?.name} — {classes.length} class{classes.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button className="ska-btn ska-btn--primary" onClick={openAdd}>
          <Ic name="add_box" size="sm" /> Add Class
        </button>
      </div>

      {/* Stats row */}
      <StatsCards classes={classes} />

      {/* Filters */}
      <FiltersBar
        search={search}             onSearch={setSearch}
        filterForm={filterForm}     onFilterForm={setFilterForm}
        filterTeacher={filterTeacher} onFilterTeacher={setFilterTeacher}
        filterStatus={filterStatus} onFilterStatus={setFilterStatus}
        teachers={teachers}
      />

      {/* Table */}
      <ClassesTable
        classes={filtered}
        loading={loading}
        onView={openDetail}
        onEdit={openEdit}
        onDelete={handleDelete}
        onAssignStudents={openAssignStudents}
        onAssignTeacher={openAssignTeacher}
        onManageSubjects={openManageSubjects}
        onViewTimetable={openViewTimetable}
      />

      {/* Modals */}
      {(modal === 'add' || modal === 'edit') && (
        <AddClassModal
          mode={modal}
          initialForm={editForm}
          existingCodes={modal === 'edit' ? existingCodes.filter(c => c !== activeClass?.code?.toUpperCase()) : existingCodes}
          teachers={teachers}
          subjects={subjects}
          academicYears={academicYears}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
      {modal === 'assign_students' && activeClass && (
        <AssignStudentsModal cls={activeClass} allStudents={students} onClose={closeModal} onSave={handleAssignStudents} />
      )}
      {modal === 'assign_teacher' && activeClass && (
        <AssignTeacherModal cls={activeClass} teachers={teachers} onClose={closeModal} onSave={handleAssignTeacher} />
      )}
      {modal === 'manage_subjects' && activeClass && (
        <ManageSubjectsModal cls={activeClass} subjects={subjects} onClose={closeModal} onSave={handleManageSubjects} />
      )}
    </div>
  );
}
