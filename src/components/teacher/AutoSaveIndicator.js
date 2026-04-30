import { useEffect, useState } from 'react';
import { useTeacher } from '../../context/TeacherContext';
import { useTicker } from '../../hooks/useTicker';
import { formatSaveStatus } from '../../hooks/useGradeAutoSave';
import './AutoSaveIndicator.css';

// Tiny pill that surfaces auto-save state from TeacherContext.
// Re-renders every 30s so "Saved 12s ago" → "Saved 1m ago" without manual triggers.
export default function AutoSaveIndicator() {
  const { autoSaveStatus, lastSavedAt } = useTeacher();
  useTicker(30_000);
  const [pulse, setPulse] = useState(false);

  // Brief pulse when status flips to 'saved'
  useEffect(() => {
    if (autoSaveStatus === 'saved') {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1200);
      return () => clearTimeout(t);
    }
  }, [autoSaveStatus, lastSavedAt]);

  const label = formatSaveStatus(autoSaveStatus, lastSavedAt);
  if (!label) return null;

  const tone =
    autoSaveStatus === 'error'  ? 'error' :
    autoSaveStatus === 'saving' ? 'busy'  : 'ok';

  return (
    <span className={`tt-asi tt-asi--${tone} ${pulse ? 'is-pulse' : ''}`}>
      <span className="material-symbols-outlined">
        {tone === 'busy' ? 'autorenew' : tone === 'error' ? 'error' : 'cloud_done'}
      </span>
      {label}
    </span>
  );
}
