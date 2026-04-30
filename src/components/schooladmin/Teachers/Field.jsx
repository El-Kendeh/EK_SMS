import React from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Tea-Field — labelled input with green tick on valid blur, red ✕ on error.
 * Pass `hint` for inline hint, `error` for the error string, `valid` to force a tick.
 */
export default function Field({
  label, required, error, valid, hint, children, span,
}) {
  const showTick = valid && !error;
  return (
    <label className={`tea-field ${error ? 'has-error' : ''} ${showTick ? 'is-valid' : ''}`}
           style={span === 'full' ? { gridColumn: '1/-1' } : null}>
      {label && (
        <span className="tea-field__label">
          {label}{required && <em>*</em>}
        </span>
      )}
      <div className="tea-field__body">
        {children}
        {showTick && <Ic name="check_circle" size="sm" className="tea-field__icon tea-field__icon--ok" />}
        {error    && <Ic name="error"        size="sm" className="tea-field__icon tea-field__icon--err" />}
      </div>
      {error && <span className="tea-field__msg tea-field__msg--err">{error}</span>}
      {!error && hint && <span className="tea-field__msg tea-field__msg--hint">{hint}</span>}
    </label>
  );
}
