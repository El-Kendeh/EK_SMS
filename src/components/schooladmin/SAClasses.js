import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ApiClient from '../../api/client';
import ClassProfileDrawer from './ClassProfileDrawer';
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
   QUICK STATS STRIP — actionable chips above the table
   ============================================================ */
function QuickStatsStrip({ classes, filterStatus, filterTeacher, onFilterStatus, onFilterTeacher }) {
  const noTeacher = classes.filter(c => !c.class_teacher_id && !c.teacher_id).length;
  const overCap   = classes.filter(c => (c.density_pct || 0) >= 100).length;
  const atRisk    = classes.filter(c => c.is_at_risk).length;
  const noSubj    = classes.filter(c =>
    Array.isArray(c.subjects) ? c.subjects.length === 0 : (c.subjects_count || 0) === 0
  ).length;
  const totalEnrolled = classes.reduce((s, c) => s + (c.enrolled || c.student_count || 0), 0);
  const totalCap      = classes.reduce((s, c) => s + (c.capacity || 0), 0);
  const fillRate      = totalCap > 0 ? Math.round((totalEnrolled / totalCap) * 100) : 0;

  const chips = [
    { key: 'fill',     label: `Avg fill ${fillRate}%`,
      color: fillRate >= 80 ? '#ffb786' : 'var(--ska-green)',
      bg:    fillRate >= 80 ? 'rgba(255,183,134,0.12)' : 'rgba(34,211,163,0.12)',
      icon:  'speed' },
    { key: 'no-teacher', label: `${noTeacher} unassigned teacher`,
      color: noTeacher > 0 ? 'var(--ska-error)' : 'var(--ska-text-3)',
      bg:    noTeacher > 0 ? 'var(--ska-error-dim)' : 'var(--ska-surface-high)',
      icon:  'person_off',
      onClick: noTeacher > 0 ? () => onFilterTeacher('unassigned') : null,
      active: filterTeacher === 'unassigned' },
    { key: 'no-subj', label: `${noSubj} no subjects`,
      color: noSubj > 0 ? 'var(--ska-error)' : 'var(--ska-text-3)',
      bg:    noSubj > 0 ? 'var(--ska-error-dim)' : 'var(--ska-surface-high)',
      icon:  'menu_book' },
    { key: 'over',   label: `${overCap} over capacity`,
      color: overCap > 0 ? 'var(--ska-error)' : 'var(--ska-text-3)',
      bg:    overCap > 0 ? 'var(--ska-error-dim)' : 'var(--ska-surface-high)',
      icon:  'warning' },
    { key: 'risk',   label: `${atRisk} at risk`,
      color: atRisk > 0 ? '#ffb786' : 'var(--ska-text-3)',
      bg:    atRisk > 0 ? 'rgba(255,183,134,0.12)' : 'var(--ska-surface-high)',
      icon:  'health_and_safety' },
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      {chips.map(c => {
        const isClickable = !!c.onClick;
        return (
          <button
            key={c.key}
            onClick={c.onClick || undefined}
            disabled={!isClickable}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
              background: c.active ? c.color : c.bg,
              color: c.active ? '#fff' : c.color,
              border: c.active ? `1px solid ${c.color}` : '1px solid transparent',
              cursor: isClickable ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
            title={isClickable ? 'Click to filter' : ''}
          >
            <Ic name={c.icon} size="sm" />
            {c.label}
          </button>
        );
      })}
    </div>
  );
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
        <option value="unassigned">— Unassigned —</option>
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
  const count    = cls.enrolled ?? cls.student_count ?? 0;
  const cap      = cls.capacity ?? 1;
  const pct      = cls.density_pct != null
                    ? Math.min(100, Math.round(cls.density_pct))
                    : Math.min(100, Math.round((count / Math.max(cap, 1)) * 100));
  const status   = capStatus(count, cap);
  const color    = capColor(status);
  const isActive = cls.is_active !== false;
  const tag      = cls.colour_tag || '#3B82F6';
  // New-shape (class_teacher object) with legacy fallback (teacher_name)
  const teacherName = cls.class_teacher?.name || cls.teacher_name;
  const subjectsCount = Array.isArray(cls.subjects)
                        ? cls.subjects.length
                        : (cls.subjects_count || 0);
  const atRisk = cls.is_at_risk;

  return (
    <tr style={atRisk ? { background: 'rgba(220, 38, 38, 0.04)' } : undefined}>
      {/* Class name with colour-tag accent */}
      <td>
        <div className="cls-name-cell" style={{ borderLeft: `3px solid ${tag}`, paddingLeft: 10 }}>
          <div className="cls-avatar" style={{ background: tag }}>
            {(cls.name || 'C').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="cls-name-text">
              {cls.name}
              {cls.stream && (
                <span style={{ color: 'var(--ska-text-3)', fontWeight: 600, marginLeft: 6 }}>
                  · {cls.stream}
                </span>
              )}
            </div>
            {cls.room && <div className="cls-name-meta">Room {cls.room}</div>}
            {atRisk && (
              <div style={{ fontSize: '0.7rem', color: 'var(--ska-error)', fontWeight: 700, marginTop: 2 }}>
                ⚠ Needs attention
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Code */}
      <td><span className="ska-badge ska-badge--cyan">{cls.code}</span></td>

      {/* Form */}
      <td>Form {cls.form_number}</td>

      {/* Capacity */}
      <td>{cls.capacity}</td>

      {/* Students + density bar */}
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

      {/* Class teacher */}
      <td>
        {teacherName ? (
          <div className="cls-teacher-cell">
            <div className="cls-avatar cls-avatar--sm cls-avatar--teal">
              {teacherName.charAt(0)}
            </div>
            <span className="cls-teacher-name">{teacherName}</span>
            {Array.isArray(cls.assistant_teachers) && cls.assistant_teachers.length > 0 && (
              <span className="ska-badge ska-badge--grey" style={{ marginLeft: 6, fontSize: '0.625rem' }}>
                +{cls.assistant_teachers.length}
              </span>
            )}
          </div>
        ) : (
          <span className="cls-unassigned" style={{ color: 'var(--ska-error)' }}>
            Unassigned
          </span>
        )}
      </td>

      {/* Subjects count */}
      <td>
        <span className={`ska-badge ${subjectsCount > 0 ? 'ska-badge--primary' : 'ska-badge--inactive'}`}>
          {subjectsCount} subj.
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
function AddClassModal({ mode, initialForm, existingCodes, existingClasses = [], teachers, subjects, academicYears, onSave, onBulkSave, onClose }) {
  const [form, setForm]           = useState(initialForm);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [codeManual, setCodeManual] = useState(false);
  const [streamManual, setStreamManual] = useState(false);
  const [formManual,   setFormManual]   = useState(false);
  const [bulkMode,     setBulkMode]     = useState(false);
  const [bulkStreams,  setBulkStreams]  = useState('A, B, C');
  const [bulkResult,   setBulkResult]   = useState(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleNameChange = e => {
    const name = e.target.value;
    set('name', name);
    if (mode === 'add') {
      // Auto-fill code, form_number, stream from "Grade 10A"-style names
      if (!codeManual) set('code', suggestCode(name));
      const parsed = parseClassName(name);
      if (!formManual && parsed.form_number) set('form_number', parsed.form_number);
      if (!streamManual && parsed.stream)    set('stream', parsed.stream);
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
    // Sanity on times
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      setError('End time must be after start time.'); return;
    }
    setSaving(true); setError('');
    try {
      await onSave({ ...form, code: codeUp });
    } catch (e) {
      setError(e.message || 'Failed to save.');
      setSaving(false);
    }
  };

  const saveBulk = async () => {
    const streams = bulkStreams.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    if (streams.length < 2) {
      setError('Enter at least 2 streams (e.g. A, B, C).'); return;
    }
    if (streams.length > 20) {
      setError('Maximum 20 variants per bulk-create.'); return;
    }
    if (!form.name?.trim()) {
      setError('Base class name is required (e.g. "Grade 10").'); return;
    }
    setSaving(true); setError(''); setBulkResult(null);
    try {
      const res = await onBulkSave({
        name_template:    form.name.trim(),
        code_template:    form.code?.trim() || '',
        form_number:      form.form_number,
        capacity:         form.capacity,
        education_level:  form.education_level,
        track:            form.track,
        colour_tag:       form.colour_tag,
        start_time:       form.start_time || null,
        end_time:         form.end_time || null,
        room:             form.room || '',
        notes:            form.notes || '',
        class_teacher_id: form.teacher_id || null,
        streams,
      });
      setBulkResult(res);
    } catch (e) {
      setError(e.message || 'Bulk-create failed.');
    }
    setSaving(false);
  };

  const capWarn = (form.capacity || 0) > 60;

  // Sister-class hint (other classes already in this form_number)
  const sisterClasses = mode === 'add' && form.form_number
    ? (existingClasses || []).filter(c => Number(c.form_number) === Number(form.form_number))
    : [];

  return (
    <Modal title={mode === 'add' ? 'Add New Class' : 'Edit Class'} onClose={onClose} wide>
      {error && <p className="ska-form-error">{error}</p>}

      {/* Mode toggle (Add only) */}
      {mode === 'add' && (
        <div style={{
          display: 'flex', gap: 6, padding: 4, marginBottom: 16,
          background: 'var(--ska-surface-high)', borderRadius: 10, width: 'fit-content',
        }}>
          {[
            { k: false, l: 'Single class',     i: 'add_box' },
            { k: true,  l: 'Bulk variants',    i: 'library_add' },
          ].map(opt => (
            <button
              key={String(opt.k)} type="button"
              onClick={() => { setBulkMode(opt.k); setError(''); setBulkResult(null); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: bulkMode === opt.k ? 'var(--ska-primary)' : 'transparent',
                color:      bulkMode === opt.k ? '#fff' : 'var(--ska-text-2)',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Ic name={opt.i} size="sm" /> {opt.l}
            </button>
          ))}
        </div>
      )}

      {bulkResult ? (
        /* ── Bulk-create result screen ── */
        <div style={{ padding: '12px 0' }}>
          <div style={{
            padding: 16, borderRadius: 10, background: 'var(--ska-green-dim)',
            color: 'var(--ska-green)', fontWeight: 700, marginBottom: 16,
          }}>
            <Ic name="check_circle" /> {bulkResult.message}
          </div>
          {bulkResult.created?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <strong style={{ fontSize: '0.85rem' }}>Created:</strong>
              <ul style={{ marginTop: 6 }}>
                {bulkResult.created.map(c => (
                  <li key={c.id} style={{ fontSize: '0.85rem' }}>
                    {c.name} <span className="ska-badge ska-badge--cyan">{c.code}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bulkResult.skipped?.length > 0 && (
            <div>
              <strong style={{ fontSize: '0.85rem', color: 'var(--ska-error)' }}>Skipped:</strong>
              <ul style={{ marginTop: 6 }}>
                {bulkResult.skipped.map((s, i) => (
                  <li key={i} style={{ fontSize: '0.85rem', color: 'var(--ska-text-2)' }}>
                    {s.code} — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="ska-btn ska-btn--primary" onClick={onClose}>Done</button>
          </div>
        </div>
      ) : (
      <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 280px)',
        gap: 20,
      }} className="cls-form-and-preview">
      <div className="ska-form-grid">
        {/* Name */}
        <label className="ska-form-group">
          <span>{bulkMode ? 'Base Class Name *' : 'Class Name *'}</span>
          <input className="ska-input"
            placeholder={bulkMode ? 'e.g. Grade 10' : 'e.g. Grade 10A'}
            value={form.name}
            onChange={handleNameChange} />
          {bulkMode && (
            <span className="cls-hint">
              Streams will be appended (e.g. "Grade 10" + "A" = "Grade 10A")
            </span>
          )}
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
            onChange={e => { setFormManual(true); set('form_number', parseInt(e.target.value) || 1); }} />
          {sisterClasses.length > 0 && (
            <span className="cls-hint">
              You already have {sisterClasses.length} class{sisterClasses.length !== 1 ? 'es' : ''}
              {' '}in Form {form.form_number}
              {' ('}{sisterClasses.slice(0, 3).map(c => c.code).join(', ')}
              {sisterClasses.length > 3 ? `, +${sisterClasses.length - 3}` : ''}{')'}
            </span>
          )}
        </label>

        {/* Stream / Section */}
        <label className="ska-form-group">
          <span>Stream / Section <span className="cls-hint">(optional)</span></span>
          <input className="ska-input" placeholder="A, B, Sciences…" maxLength={10}
            value={form.stream || ''}
            onChange={e => { setStreamManual(true); set('stream', e.target.value); }} />
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

        {/* Colour tag */}
        <label className="ska-form-group" style={{ gridColumn: '1 / -1' }}>
          <span>Colour Tag <span className="cls-hint">(shown across the table, timetable, and grade screens)</span></span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 4 }}>
            {[
              '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
              '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#64748B',
            ].map(c => {
              const sel = (form.colour_tag || '#3B82F6') === c;
              return (
                <button key={c} type="button"
                  onClick={() => set('colour_tag', c)}
                  aria-label={`Use colour ${c}`}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: c,
                    border: sel ? '3px solid var(--ska-text)' : '2px solid var(--ska-border)',
                    cursor: 'pointer', flexShrink: 0,
                    transition: 'transform 0.15s',
                    transform: sel ? 'scale(1.08)' : 'scale(1)',
                  }} />
              );
            })}
            <input type="color"
                   value={form.colour_tag || '#3B82F6'}
                   onChange={e => set('colour_tag', e.target.value)}
                   style={{ width: 36, height: 36, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                   aria-label="Pick custom colour" />
          </div>
        </label>

        {/* Education level */}
        <label className="ska-form-group">
          <span>Education Level <span className="cls-hint">(optional)</span></span>
          <select className="ska-input" value={form.education_level || ''}
            onChange={e => set('education_level', e.target.value)}>
            {EDUCATION_LEVEL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        {/* Track */}
        <label className="ska-form-group">
          <span>Track / Specialisation</span>
          <select className="ska-input" value={form.track || ''}
            onChange={e => set('track', e.target.value)}>
            {TRACK_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        {/* Start time */}
        <label className="ska-form-group">
          <span>Default start time <span className="cls-hint">(optional)</span></span>
          <input className="ska-input" type="time"
            value={form.start_time || ''}
            onChange={e => set('start_time', e.target.value)} />
        </label>

        {/* End time */}
        <label className="ska-form-group">
          <span>Default end time <span className="cls-hint">(optional)</span></span>
          <input className="ska-input" type="time"
            value={form.end_time || ''}
            onChange={e => set('end_time', e.target.value)} />
        </label>

        {/* Auto-promotion target */}
        {!bulkMode && existingClasses.length > 0 && (
          <label className="ska-form-group" style={{ gridColumn: '1 / -1' }}>
            <span>Auto-promotion target <span className="cls-hint">(class students promote into at year-end)</span></span>
            <select className="ska-input"
              value={form.auto_promotion_target_id || ''}
              onChange={e => set('auto_promotion_target_id',
                                e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">— None —</option>
              {existingClasses
                .filter(c => c.id !== form.id)  // can't promote into self
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.stream ? `· ${c.stream}` : ''} (Form {c.form_number})
                  </option>
                ))}
            </select>
          </label>
        )}

        {/* Notes */}
        <label className="ska-form-group" style={{ gridColumn: '1 / -1' }}>
          <span>Internal notes <span className="cls-hint">(admin-only memo)</span></span>
          <textarea className="ska-input" rows={2}
            placeholder="e.g. Split next term, moved to Block C…"
            maxLength={5000}
            value={form.notes || ''}
            onChange={e => set('notes', e.target.value)} />
        </label>

        {/* Bulk streams (only when bulk-mode is on) */}
        {bulkMode && (
          <label className="ska-form-group" style={{ gridColumn: '1 / -1' }}>
            <span>Streams to create *</span>
            <input className="ska-input"
              placeholder="A, B, C, D"
              value={bulkStreams}
              onChange={e => setBulkStreams(e.target.value)} />
            <span className="cls-hint">
              Comma- or space-separated. Up to 20 variants. Codes auto-derive from "{form.code || 'CODE'}" + stream.
            </span>
          </label>
        )}
      </div>

      {/* ── Live preview pane (right column) ── */}
      <ClassPreviewPane form={form} bulkMode={bulkMode} bulkStreams={bulkStreams}
                        teachers={teachers} subjects={subjects} />
      </div>

      {/* Assistant Teachers + Subjects only when single-class mode (bulk uses shared) */}
      {!bulkMode && teachers.length > 0 && (
        <div className="cls-subjects-section">
          <div className="cls-subjects-label">
            <Ic name="group" size="sm" style={{ color: 'var(--ska-tertiary)' }} />
            Assistant Teachers <span className="cls-hint">(optional co-teachers)</span>
            {(form.assistant_teacher_ids || []).length > 0 && (
              <span className="cls-section-count">{form.assistant_teacher_ids.length} selected</span>
            )}
          </div>
          <div className="cls-chips-grid">
            {teachers.filter(t => t.id !== form.teacher_id).map(t => {
              const ids = form.assistant_teacher_ids || [];
              const sel = ids.includes(t.id);
              const toggle = () => set(
                'assistant_teacher_ids',
                sel ? ids.filter(x => x !== t.id) : [...ids, t.id]
              );
              return (
                <button key={t.id} type="button"
                  className={`cls-chip${sel ? ' cls-chip--selected' : ''}`}
                  onClick={toggle}>
                  {sel && <Ic name="check" size="sm" />}
                  {t.full_name || t.username}
                </button>
              );
            })}
            {teachers.filter(t => t.id !== form.teacher_id).length === 0 && (
              <span className="cls-hint" style={{ padding: '6px 0' }}>
                No additional teachers available — assign a class teacher first.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Subjects multi-select */}
      {!bulkMode && subjects.length > 0 && (
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
        <button className="ska-btn ska-btn--primary"
                onClick={bulkMode ? saveBulk : save}
                disabled={saving}>
          {saving ? 'Saving…'
            : bulkMode ? `Create ${(bulkStreams.split(/[,\s]+/).filter(Boolean).length || 0)} classes`
            : mode === 'add' ? 'Add Class'
            : 'Save Changes'}
        </button>
      </div>
      </>
      )}
    </Modal>
  );
}

/* ============================================================
   CLASS PREVIEW PANE — live preview of the class card
   ============================================================ */
function ClassPreviewPane({ form, bulkMode, bulkStreams, teachers, subjects }) {
  const tag = form.colour_tag || '#3B82F6';
  const teacher = teachers.find(t => t.id === form.teacher_id);
  const assistantNames = (form.assistant_teacher_ids || [])
    .map(id => teachers.find(t => t.id === id))
    .filter(Boolean)
    .map(t => t.full_name || t.username);
  const subjectsSelected = (form.subject_ids || [])
    .map(id => subjects.find(s => s.id === id))
    .filter(Boolean);
  const variantsCount = bulkMode
    ? bulkStreams.split(/[,\s]+/).filter(Boolean).length
    : 1;

  const previewName = bulkMode
    ? `${form.name || 'Base name'} A · B · C…`
    : (form.name || 'Class name');

  return (
    <aside className="cls-preview" aria-label="Live preview">
      <div style={{
        position: 'sticky', top: 0,
        fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--ska-text-3)',
        marginBottom: 10,
      }}>
        Live preview {bulkMode && `· ${variantsCount} variant${variantsCount !== 1 ? 's' : ''}`}
      </div>

      <div style={{
        background: 'var(--ska-surface)',
        border: '1px solid var(--ska-border)',
        borderLeft: `4px solid ${tag}`,
        borderRadius: 14,
        padding: 16,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
      }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: tag,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1rem', flexShrink: 0,
          }}>{(form.name || 'C').charAt(0).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--ska-text)', lineHeight: 1.15 }}>
              {previewName}
              {!bulkMode && form.stream && (
                <span style={{ marginLeft: 6, color: 'var(--ska-text-3)', fontWeight: 600 }}>· {form.stream}</span>
              )}
            </div>
            {form.code && (
              <div style={{ fontSize: '0.7rem', color: 'var(--ska-text-3)', marginTop: 2,
                            letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700 }}>
                {bulkMode && form.code ? `${form.code}A · ${form.code}B · …` : form.code}
              </div>
            )}
          </div>
        </div>

        {/* Capacity bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem',
                        color: 'var(--ska-text-3)', marginBottom: 4 }}>
            <span>Capacity</span><span style={{ fontWeight: 700, color: 'var(--ska-text-2)' }}>{form.capacity || 0}</span>
          </div>
          <div style={{ height: 6, background: 'var(--ska-surface-high)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: '0%', height: '100%', background: tag }} />
          </div>
        </div>

        {/* Mini-meta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          <span className="ska-badge ska-badge--grey" style={{ fontSize: '0.65rem' }}>
            Form {form.form_number || '?'}
          </span>
          {form.education_level && (
            <span className="ska-badge ska-badge--primary" style={{ fontSize: '0.65rem' }}>
              {EDUCATION_LEVEL_OPTIONS.find(o => o.value === form.education_level)?.label || form.education_level}
            </span>
          )}
          {form.track && (
            <span className="ska-badge ska-badge--cyan" style={{ fontSize: '0.65rem' }}>
              {TRACK_OPTIONS.find(o => o.value === form.track)?.label || form.track}
            </span>
          )}
          {form.room && (
            <span className="ska-badge ska-badge--inactive" style={{ fontSize: '0.65rem' }}>
              📍 {form.room}
            </span>
          )}
        </div>

        {/* Schedule preview */}
        {(form.start_time || form.end_time) && (
          <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 8,
                        background: 'var(--ska-surface-high)', fontSize: '0.75rem',
                        color: 'var(--ska-text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Ic name="schedule" size="sm" />
            {form.start_time || '—'} – {form.end_time || '—'}
          </div>
        )}

        {/* Teaching team */}
        {!bulkMode && (teacher || assistantNames.length > 0) && (
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8,
                        background: 'var(--ska-surface-high)' }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase',
                          letterSpacing: '0.06em', color: 'var(--ska-text-3)', marginBottom: 6 }}>
              Teaching team
            </div>
            {teacher && (
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--ska-text)' }}>
                {teacher.full_name || teacher.username}
              </div>
            )}
            {assistantNames.length > 0 && (
              <div style={{ fontSize: '0.7rem', color: 'var(--ska-text-2)', marginTop: 2 }}>
                +{assistantNames.length} assistant{assistantNames.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Subjects */}
        {!bulkMode && subjectsSelected.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase',
                          letterSpacing: '0.06em', color: 'var(--ska-text-3)', marginBottom: 4 }}>
              {subjectsSelected.length} subject{subjectsSelected.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {subjectsSelected.slice(0, 6).map(s => (
                <span key={s.id} className="ska-badge ska-badge--inactive"
                      style={{ fontSize: '0.625rem' }}>{s.name}</span>
              ))}
              {subjectsSelected.length > 6 && (
                <span className="ska-badge ska-badge--inactive" style={{ fontSize: '0.625rem' }}>
                  +{subjectsSelected.length - 6}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <p style={{ margin: '12px 4px 0', fontSize: '0.7rem', color: 'var(--ska-text-3)', lineHeight: 1.5 }}>
        Updates as you type. Capacity bar shows 0% — fills once students are enrolled.
      </p>
    </aside>
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
  // Extended (round 1)
  stream: '', colour_tag: '#3B82F6', notes: '',
  assistant_teacher_ids: [],
  // Curriculum & schedule (round 2)
  education_level: '', track: '',
  start_time: '', end_time: '',
  auto_promotion_target_id: null,
};

const EDUCATION_LEVEL_OPTIONS = [
  { value: '',        label: '— Select level —' },
  { value: 'pre_k',   label: 'Pre-Kindergarten' },
  { value: 'primary', label: 'Primary' },
  { value: 'jss',     label: 'Junior Secondary (JSS)' },
  { value: 'sss',     label: 'Senior Secondary (SSS)' },
  { value: 'college', label: 'College / Tertiary' },
];

const TRACK_OPTIONS = [
  { value: '',           label: '— None —' },
  { value: 'sciences',   label: 'Sciences' },
  { value: 'arts',       label: 'Arts / Humanities' },
  { value: 'commerce',   label: 'Commerce / Business' },
  { value: 'vocational', label: 'Vocational / Technical' },
  { value: 'mixed',      label: 'Mixed / General' },
];

/* Parse "Grade 10A" / "Form 5 B" / "JSS 1A" → { form_number, stream } */
function parseClassName(name) {
  if (!name) return { form_number: null, stream: null };
  // Capture digits + optional space + letters (1-3) at the end
  const m = name.match(/(\d+)\s*([A-Za-z]{1,3})?\s*$/);
  if (!m) return { form_number: null, stream: null };
  return {
    form_number: parseInt(m[1], 10) || null,
    stream: m[2] ? m[2].toUpperCase() : null,
  };
}

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
  const [drawerClass, setDrawerClass] = useState(null);

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
      if (filterTeacher === 'unassigned') {
        if (c.class_teacher_id || c.teacher_id) return false;
      } else if (filterTeacher) {
        const tid = c.class_teacher_id || c.teacher_id;
        if (String(tid) !== String(filterTeacher)) return false;
      }
      if (filterStatus === 'active'   && c.is_active === false) return false;
      if (filterStatus === 'archived' && c.is_active !== false) return false;
      return true;
    });
  }, [classes, search, filterForm, filterTeacher, filterStatus]);

  const existingCodes = classes.map(c => (c.code || '').toUpperCase());

  /* ── Handlers: navigation ── */
  // View click now opens the drawer overlay (faster, keeps list context)
  const openDetail = cls => setDrawerClass(cls);
  const backToList = ()  => setView('list');

  /* ── Handlers: modals ── */
  const openAdd = () => {
    setEditForm({ ...EMPTY_FORM });
    setActiveClass(null);
    setModal('add');
  };
  const openEdit = cls => {
    const teacherId = cls.class_teacher_id || cls.class_teacher?.id || cls.teacher_id || null;
    setEditForm({
      name: cls.name, code: cls.code, form_number: cls.form_number,
      capacity: cls.capacity,
      teacher_id: teacherId,
      subject_ids: Array.isArray(cls.subjects)
        ? cls.subjects.map(s => s.id)
        : (cls.subject_ids || []),
      academic_year_id: cls.academic_year_id || null,
      room: cls.room || '',
      is_active: cls.is_active !== false,
      // Extended fields
      stream:      cls.stream || '',
      colour_tag:  cls.colour_tag || '#3B82F6',
      notes:       cls.notes || '',
      assistant_teacher_ids: Array.isArray(cls.assistant_teachers)
        ? cls.assistant_teachers.map(t => t.id)
        : [],
      // Curriculum & schedule
      education_level: cls.education_level || '',
      track:           cls.track || '',
      start_time:      cls.start_time || '',
      end_time:        cls.end_time || '',
      auto_promotion_target_id: cls.auto_promotion_target_id || null,
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

  const handleBulkSave = async payload => {
    const res = await ApiClient.post('/api/school/classes/bulk-create/', payload);
    load();
    return res; // caller (modal) shows the created/skipped summary
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
            existingClasses={classes}
            teachers={teachers}
            subjects={subjects}
            academicYears={academicYears}
            onSave={handleSave}
            onBulkSave={handleBulkSave}
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

      {/* Quick-stats strip — clickable filter chips */}
      <QuickStatsStrip
        classes={classes}
        filterStatus={filterStatus}
        filterTeacher={filterTeacher}
        onFilterStatus={setFilterStatus}
        onFilterTeacher={setFilterTeacher}
      />

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

      {/* Class profile drawer (slide-up overlay) */}
      {drawerClass && (
        <ClassProfileDrawer
          cls={drawerClass}
          onClose={() => setDrawerClass(null)}
          onEdit={(cls) => { setDrawerClass(null); openEdit(cls); }}
          onAssignStudents={(cls) => { setDrawerClass(null); openAssignStudents(cls); }}
          onAssignTeacher={(cls) => { setDrawerClass(null); openAssignTeacher(cls); }}
        />
      )}
    </div>
  );
}
