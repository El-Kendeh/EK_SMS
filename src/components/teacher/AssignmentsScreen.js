import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacherApi';
import './AssignmentsScreen.css';

// Backend exam_type values map to display config
const TYPE_CONFIG_EXTRA = {
  ca:      { label: 'C.A.',     cls: 'tch-badge--blue',    icon: 'home_work' },
  midterm: { label: 'Midterm',  cls: 'tch-badge--red',     icon: 'quiz' },
  final:   { label: 'Final',    cls: 'tch-badge--amber',   icon: 'school' },
  mock:    { label: 'Mock',     cls: 'tch-badge--primary', icon: 'fact_check' },
};

const TYPE_CONFIG = {
  homework: { label: 'Homework', cls: 'tch-badge--blue',    icon: 'home_work' },
  test:     { label: 'Test',     cls: 'tch-badge--red',     icon: 'quiz' },
  project:  { label: 'Project',  cls: 'tch-badge--amber',   icon: 'science' },
  quiz:     { label: 'Quiz',     cls: 'tch-badge--primary', icon: 'fact_check' },
};

function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function dueDateBadge(days, status) {
  if (status === 'completed') return { cls: 'tch-badge--grey', label: 'Completed' };
  if (days < 0) return { cls: 'tch-badge--red', label: `${Math.abs(days)}d overdue` };
  if (days === 0) return { cls: 'tch-badge--amber', label: 'Due today' };
  if (days === 1) return { cls: 'tch-badge--amber', label: 'Due tomorrow' };
  if (days <= 3) return { cls: 'tch-badge--amber', label: `${days}d left` };
  return { cls: 'tch-badge--green', label: `${days}d left` };
}

const BLANK_FORM = { title: '', type: 'homework', dueDate: '', classId: '', description: '' };

export default function AssignmentsScreen({ navigateTo }) {
  const { assignedClasses } = useTeacher();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showPast, setShowPast] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    setLoading(true);
    teacherApi.getAssignments(filterClass || undefined)
      .then(data => setAssignments(data.assignments || []))
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, [filterClass]);

  const filtered = useMemo(() => {
    const now = new Date();
    return assignments.filter(a => {
      if (filterClass && String(a.classId) !== String(filterClass)) return false;
      if (filterType && a.type !== filterType) return false;
      const due = new Date(a.dueDate);
      if (!showPast && due < now && a.status !== 'active') return false;
      return true;
    });
  }, [assignments, filterClass, filterType, showPast]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!form.dueDate) { setFormError('Due date is required.'); return; }
    if (!form.classId) { setFormError('Please select a class.'); return; }
    setFormError('');
    setSaving(true);
    try {
      const cls = assignedClasses.find(c => String(c.id) === String(form.classId));
      const res = await teacherApi.createAssignment({
        title:    form.title,
        type:     form.type,
        dueDate:  form.dueDate,
        classId:  form.classId,
        subjectId: cls?.subject?.id,
      });
      if (res.success) {
        // Reload list from server
        const data = await teacherApi.getAssignments(filterClass || undefined);
        setAssignments(data.assignments || []);
      } else {
        setFormError(res.message || 'Failed to create assignment.');
        return;
      }
      setForm(BLANK_FORM);
      setShowCreate(false);
    } catch {
      setFormError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const res = await teacherApi.deleteAssignment(id);
    if (res.success) setAssignments(prev => prev.filter(a => a.id !== id));
    setConfirmDeleteId(null);
  };

  return (
    <div className="as-root">
      {/* Header */}
      <div className="as-top-bar">
        <div>
          <h1 className="tch-page-title" style={{ margin: 0 }}>Assignments & Tests</h1>
          <p className="tch-page-sub" style={{ margin: '2px 0 0' }}>
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="tch-btn tch-btn--primary" onClick={() => setShowCreate(true)}>
          <span className="material-symbols-outlined">add</span>
          New Assignment
        </button>
      </div>

      {/* Filters */}
      <div className="as-filters">
        <select className="tch-select as-filter-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {assignedClasses.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
        <select className="tch-select as-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <label className="as-toggle-label">
          <input
            type="checkbox"
            checked={showPast}
            onChange={e => setShowPast(e.target.checked)}
            style={{ accentColor: 'var(--tch-primary)', width: 15, height: 15 }}
          />
          Show completed
        </label>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="tch-card tch-card--pad as-create-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="as-create-header">
              <p className="as-section-label">New Assignment</p>
              <button
                className="tch-btn tch-btn--ghost tch-btn--sm"
                onClick={() => { setShowCreate(false); setForm(BLANK_FORM); setFormError(''); }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="as-create-fields">
              <div>
                <label className="tch-label">Title *</label>
                <input
                  className="tch-input"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Assignment title..."
                  maxLength={120}
                />
              </div>

              <div className="as-create-row">
                <div>
                  <label className="tch-label">Type</label>
                  <select className="tch-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="tch-label">Class</label>
                  <select className="tch-select" value={form.classId} onChange={e => setForm(p => ({ ...p, classId: e.target.value }))}>
                    <option value="">All my classes</option>
                    {assignedClasses.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="tch-label">Due Date *</label>
                  <input
                    type="date"
                    className="tch-input"
                    value={form.dueDate}
                    onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="tch-label">Description</label>
                <textarea
                  className="tch-textarea"
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Assignment description or instructions..."
                  maxLength={400}
                />
              </div>

              {formError && (
                <p style={{ color: 'var(--tch-error)', fontSize: 13, margin: 0 }}>{formError}</p>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="tch-btn tch-btn--ghost"
                  onClick={() => { setShowCreate(false); setForm(BLANK_FORM); setFormError(''); }}
                >
                  Cancel
                </button>
                <button type="submit" className="tch-btn tch-btn--primary" disabled={saving}>
                  <span className="material-symbols-outlined">{saving ? 'sync' : 'save'}</span>
                  {saving ? 'Saving…' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assignment list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {[0,1,2].map(i => <div key={i} className="tch-skeleton" style={{ height: 90 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="tch-empty">
          <span className="material-symbols-outlined">assignment</span>
          <p>No assignments found</p>
          <button className="tch-btn tch-btn--primary" onClick={() => setShowCreate(true)}>
            Create First Assignment
          </button>
        </div>
      ) : (
        <div className="as-list">
          {filtered.map((a, i) => {
            const days = daysUntil(a.dueDate);
            const badge = dueDateBadge(days, a.status);
            const typeConf = TYPE_CONFIG[a.type] || TYPE_CONFIG_EXTRA[a.type] || TYPE_CONFIG.homework;
            return (
              <motion.div
                key={a.id}
                className="tch-card as-item"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="as-item__icon-wrap">
                  <span className="material-symbols-outlined">{typeConf.icon}</span>
                </div>

                <div className="as-item__info">
                  <p className="as-item__title">{a.title}</p>
                  <div className="as-item__meta">
                    <span className={`tch-badge ${typeConf.cls}`}>{typeConf.label}</span>
                    <span className="tch-chip">
                      <span className="material-symbols-outlined">school</span>
                      {a.className}
                    </span>
                    {a.subjectName && (
                      <span className="tch-chip">
                        <span className="material-symbols-outlined">subject</span>
                        {a.subjectName}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="as-item__desc">{a.description}</p>
                  )}
                </div>

                <div className="as-item__right">
                  <span className={`tch-badge ${badge.cls}`}>
                    <span className="material-symbols-outlined">schedule</span>
                    {badge.label}
                  </span>
                  <p className="as-item__due-date">
                    {new Date(a.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {confirmDeleteId === a.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="tch-btn tch-btn--sm"
                        style={{ background: 'var(--tch-error)', color: '#fff' }}
                        onClick={() => handleDelete(a.id)}
                      >
                        Delete
                      </button>
                      <button
                        className="tch-btn tch-btn--ghost tch-btn--sm"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="tch-btn tch-btn--ghost tch-btn--sm"
                      onClick={() => setConfirmDeleteId(a.id)}
                      title="Delete"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
