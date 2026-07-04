import React, { useEffect, useRef, useId } from 'react';

/**
 * Accessible modal wrapper reusing the existing .ga-modal* classes:
 * role="dialog", aria-modal, labelled title, focus trap, Escape-to-close,
 * focus restore on unmount, overlay click closes.
 */
export default function Modal({ title, onClose, children, className = '' }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;

    const focusables = () => Array.from(
      dialog?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) || []
    ).filter(el => !el.disabled && el.offsetParent !== null);

    // Autofocus the first focusable element, else the dialog itself.
    const first = focusables()[0];
    (first || dialog)?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (!els.length) { e.preventDefault(); return; }
      const firstEl = els[0];
      const lastEl = els[els.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault(); lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault(); firstEl.focus();
      }
    };

    dialog?.addEventListener('keydown', onKeyDown);
    return () => {
      dialog?.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [onClose]);

  return (
    <div className="ga-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`ga-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {title != null && <h3 id={titleId} className="ga-modal__title">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
