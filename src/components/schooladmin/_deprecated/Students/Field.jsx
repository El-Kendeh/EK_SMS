import React, { forwardRef } from 'react';

const Ic = ({ name, size, className = '', style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''} ${className}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * stu-Field — labelled input with green tick on valid blur, red ✕ on error,
 * optional hint text, optional left-side icon. `name` enables auto-focus
 * from the wizard footer when validation fails.
 */
const Field = forwardRef(function Field(
  { label, required, error, valid, hint, children, span, name, action },
  ref,
) {
  const showTick = valid && !error;
  return (
    <label
      data-field={name}
      className={`stu-field ${error ? 'has-error' : ''} ${showTick ? 'is-valid' : ''}`}
      style={span === 'full' ? { gridColumn: '1/-1' } : null}
    >
      {label && (
        <span className="stu-field__label">
          {label}{required && <em>*</em>}
          {action}
        </span>
      )}
      <div className="stu-field__body" ref={ref}>
        {children}
        {showTick && <Ic name="check_circle" size="sm" className="stu-field__icon stu-field__icon--ok" />}
        {error && <Ic name="error" size="sm" className="stu-field__icon stu-field__icon--err" />}
      </div>
      {error && <span className="stu-field__msg stu-field__msg--err">{error}</span>}
      {!error && hint && <span className="stu-field__msg stu-field__msg--hint">{hint}</span>}
    </label>
  );
});
export default Field;
