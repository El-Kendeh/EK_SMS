import React, { useEffect } from 'react';
import './SuccessModal.css';
import PruhLogo from './PruhLogo';

const SuccessIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export default function SuccessModal({ username = 'User', role = 'User', onClose }) {
  const displayRole = role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  useEffect(() => {
    const timer = setTimeout(onClose, 1400);
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <div className="success-modal__backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="success-modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="success-modal__brand">
          <div className="success-modal__brand-ring" />
          <PruhLogo size={40} showText={false} />
        </div>

        <div className="success-modal__icon-box">
          <SuccessIcon />
        </div>

        <h2 className="success-modal__title">Welcome back, {username} ({displayRole})!</h2>
        <p className="success-modal__message">
          Your credentials are verified successfully. Redirecting you to your dashboard...
        </p>
      </div>
    </div>
  );
}
