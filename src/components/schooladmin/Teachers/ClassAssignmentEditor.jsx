import React from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function ClassAssignmentEditor({
  classes, subjects, assignments, onAdd, onRemove,
}) {
  const [classroom_id, setClassroomId] = React.useState('');
  const [subject_id,   setSubjectId]   = React.useState('');

  const submit = () => {
    if (!classroom_id || !subject_id) return;
    const cls = classes.find(c => String(c.id) === String(classroom_id));
    const sub = subjects.find(s => String(s.id) === String(subject_id));
    if (!cls || !sub) return;
    const dupe = assignments.some(
      ca => String(ca.classroom_id) === String(classroom_id) &&
            String(ca.subject_id)   === String(subject_id)
    );
    if (dupe) return;
    onAdd({
      classroom_id: parseInt(classroom_id, 10),
      subject_id:   parseInt(subject_id, 10),
      class_name:   cls.name,
      subject_name: sub.name,
      periods_per_week: Number(sub.periods_per_week) || 4,
    });
    setClassroomId('');
    setSubjectId('');
  };

  return (
    <div className="tea-class-editor">
      <div className="tea-class-editor__row">
        <select className="ska-input" value={classroom_id} onChange={e => setClassroomId(e.target.value)}>
          <option value="">Class…</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="ska-input" value={subject_id} onChange={e => setSubjectId(e.target.value)}>
          <option value="">Subject…</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}{s.periods_per_week ? ` · ${s.periods_per_week}p/wk` : ''}
            </option>
          ))}
        </select>
        <button type="button" className="ska-btn ska-btn--primary"
          onClick={submit} disabled={!classroom_id || !subject_id}>
          <Ic name="add" size="sm" /> Add
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="tea-class-editor__empty">
          <Ic name="school" /> No classes assigned yet
        </div>
      ) : (
        <div className="tea-class-editor__list">
          {assignments.map((ca, i) => (
            <div key={i} className="tea-class-editor__row-item">
              <Ic name="class" style={{ color: 'var(--ska-primary)' }} />
              <strong>{ca.class_name}</strong>
              <span>· {ca.subject_name}</span>
              {ca.periods_per_week ? <span className="tea-pill">{ca.periods_per_week}p/wk</span> : null}
              <button type="button" onClick={() => onRemove(i)} aria-label="Remove">
                <Ic name="close" size="sm" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
