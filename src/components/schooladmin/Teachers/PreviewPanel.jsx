import React from 'react';
import { TEACHER_WIZARD_STEPS } from './teachers.constants';
import { avatarInitials, completionPercent } from './teachers.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function PreviewPanel({ school, form, photoPreview, classAssignments, documents, step, onJumpStep, hasDraft, onClearDraft }) {
  const initials  = avatarInitials(form.first_name, form.last_name);
  const fullName  = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ') || 'New Teacher';
  const pct       = completionPercent(form, photoPreview, classAssignments, documents);

  return (
    <div className="tea-preview">
      {/* School label */}
      <div className="tea-preview__sch">
        <p className="tea-preview__sch-name">{school?.name || 'Your School'}</p>
        <p className="tea-preview__sch-sub">New Teacher Registration</p>
      </div>

      {/* Avatar */}
      <div className="tea-preview__avatar-wrap">
        <div className="tea-preview__avatar">
          {photoPreview
            ? <img src={photoPreview} alt="" />
            : <span>{initials}</span>}
        </div>
        <p className="tea-preview__name">{fullName}</p>
        {form.employee_id && <p className="tea-preview__id">ID: {form.employee_id}</p>}
        {form.qualification && <span className="tea-preview__qual">{form.qualification}</span>}
        {form.role_tier && form.role_tier !== 'teacher' && (
          <span className="tea-preview__role">
            <Ic name="workspace_premium" size="sm" /> {form.role_tier.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Completion */}
      <div className="tea-preview__bar-wrap">
        <div className="tea-preview__bar-head">
          <span>Profile completion</span>
          <strong>{pct}%</strong>
        </div>
        <div className="tea-preview__bar">
          <div className="tea-preview__bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Step tracker */}
      <nav className="tea-preview__steps">
        {TEACHER_WIZARD_STEPS.map((s, i) => {
          const state = i < step ? 'done' : i === step ? 'now' : 'todo';
          return (
            <button
              key={s.key}
              type="button"
              className={`tea-preview__step is-${state}`}
              onClick={() => onJumpStep && onJumpStep(i)}
            >
              <span className="tea-preview__step-icon">
                <Ic name={state === 'done' ? 'check' : s.icon} size="sm" />
              </span>
              <span className="tea-preview__step-label">{s.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="tea-preview__foot">
        {hasDraft && (
          <button type="button" className="tea-preview__draft" onClick={onClearDraft}>
            <Ic name="delete_outline" size="sm" /> Clear saved draft
          </button>
        )}
        <p>The teacher will use their email &amp; password to log in to their dashboard.</p>
      </div>
    </div>
  );
}
