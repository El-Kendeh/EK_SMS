import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';
import './LiveNotificationToast.css';

export default function LiveNotificationToast({ onOpen }) {
  const { latest, dismissLatest } = useNotifications();

  useEffect(() => {
    if (!latest) return;
    const t = setTimeout(() => dismissLatest(), 8000);
    return () => clearTimeout(t);
  }, [latest, dismissLatest]);

  return (
    <AnimatePresence>
      {latest && (
        <motion.button
          type="button"
          className="ek-toast"
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={() => { onOpen?.(latest); dismissLatest(); }}
          aria-live="polite"
        >
          <span className="ek-toast__pulse" aria-hidden="true" />
          <span className="material-symbols-outlined">notifications</span>
          <div className="ek-toast__body">
            <strong>{latest.title || 'New notification'}</strong>
            {latest.message && <span>{latest.message}</span>}
          </div>
          <span
            className="ek-toast__close"
            role="button"
            aria-label="Dismiss"
            onClick={(e) => { e.stopPropagation(); dismissLatest(); }}
          >
            <span className="material-symbols-outlined">close</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
