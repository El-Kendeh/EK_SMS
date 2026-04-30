import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '../../context/I18nContext';
import './KeyboardShortcuts.css';

// Detects key sequences like "g g" (go home), "g r" (grades), and shows a help modal on "?".
// Renders nothing visible except the help overlay when open.
export default function KeyboardShortcuts({ onNavigate }) {
  const { t } = useT();
  const [helpOpen, setHelpOpen] = useState(false);
  const [pending, setPending] = useState(null);

  const close = useCallback(() => {
    setHelpOpen(false);
    document.querySelectorAll('[data-modal-close]').forEach((el) => {
      try { el.click(); } catch {}
    });
  }, []);

  useEffect(() => {
    let resetTimer;
    const map = {
      'g g': 'home',
      'g d': 'home',
      'g r': 'grades',
      'g R': 'report-cards',
      'g a': 'attendance',
      'g A': 'assignments',
      'g t': 'timetable',
      'g m': 'messages',
      'g n': 'notifications',
      'g p': 'profile',
      'g s': 'subject',
      'g v': 'verify',
      'g w': 'safe-report',
      'g f': 'financials',
      'g e': 'events',
      'g D': 'documents',
      'g i': 'id-card',
    };

    const onKey = (e) => {
      // Ignore when typing in an input/textarea
      const tag = (e.target.tagName || '').toLowerCase();
      const isEditable = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if (e.key === 'Escape') { close(); return; }
      if (isEditable) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setHelpOpen((v) => !v);
        return;
      }

      const key = e.shiftKey ? e.key : e.key.toLowerCase();
      if (pending) {
        const combo = `${pending} ${key}`;
        if (map[combo]) {
          e.preventDefault();
          onNavigate?.(map[combo]);
        }
        setPending(null);
        return;
      }
      if (key === 'g') {
        setPending('g');
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => setPending(null), 1200);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(resetTimer); };
  }, [pending, onNavigate, close]);

  const rows = [
    ['g g', t('shortcuts.goHome')],
    ['g r', t('shortcuts.goGrades')],
    ['g R', t('shortcuts.goReports')],
    ['g a', t('shortcuts.goAttendance')],
    ['g A', t('shortcuts.goAssignments')],
    ['g t', t('shortcuts.goTimetable')],
    ['g m', t('shortcuts.goMessages')],
    ['g n', t('shortcuts.goNotifications')],
    ['g p', t('shortcuts.goProfile')],
    ['?',   t('shortcuts.openHelp')],
    ['Esc', t('shortcuts.closeAny')],
  ];

  return (
    <AnimatePresence>
      {helpOpen && (
        <motion.div
          className="ek-shortcuts-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) setHelpOpen(false); }}
        >
          <motion.div
            className="ek-shortcuts-panel"
            role="dialog"
            aria-label={t('shortcuts.title')}
            initial={{ y: 16, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.96 }}
          >
            <div className="ek-shortcuts-header">
              <h3>
                <span className="material-symbols-outlined">keyboard</span>
                {t('shortcuts.title')}
              </h3>
              <button onClick={() => setHelpOpen(false)} aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <ul className="ek-shortcuts-list">
              {rows.map(([k, label]) => (
                <li key={k}>
                  <kbd>{k}</kbd>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
            <p className="ek-shortcuts-hint">Tip: press <kbd>g</kbd> then a letter within 1 second.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
