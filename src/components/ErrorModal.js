import React, { useEffect } from 'react';
import './ErrorModal.css';
import PruhLogo from './PruhLogo';

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 8.5v4" />
    <path d="M12 15.5h.01" />
    <path d="M10.07 3.51l-8 14A1 1 0 003 19.5h18a1 1 0 00.87-1.49l-8-14a1 1 0 00-1.74 0z" />
  </svg>
);

export default function ErrorModal({ title = 'Login issue', message, onClose }) {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="error-modal__backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="error-modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="error-modal__brand">
          <div className="error-modal__brand-ring" />
          <PruhLogo size={40} showText={false} />
        </div>

        <div className="error-modal__icon-box">
          <WarningIcon />
        </div>

        <h2 className="error-modal__title">{title}</h2>
        <p className="error-modal__message">{message}</p>

        <button type="button" className="error-modal__action" onClick={onClose}>
          Try again
        </button>
      </div>
    </div>
  );
}
