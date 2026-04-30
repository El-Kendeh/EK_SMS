import { useEffect, useRef } from 'react';
import { useTeacher } from '../context/TeacherContext';
import { teacherApi } from '../api/teacherApi';

const DEBOUNCE_MS = 700;
const RECOVERY_KEY = (classId, termId) => `teacher_grade_drafts_${classId}_${termId}`;

// Debounced auto-save scheduler for the GradeEntry table.
// Persists drafts to sessionStorage so an unexpected page reload survives.
// Calls teacherApi.saveGradeDraft when input is stable, updates context status.
export function useGradeAutoSave(classId, termId, drafts) {
  const { setAutoSaveStatus, markSaved } = useTeacher();
  const timer = useRef();
  const lastSerialized = useRef('');

  // Hydrate drafts from sessionStorage on mount (caller can use this to repopulate)
  useEffect(() => {
    if (!classId || !termId) return;
    try {
      const raw = sessionStorage.getItem(RECOVERY_KEY(classId, termId));
      if (raw) lastSerialized.current = raw;
    } catch {}
  }, [classId, termId]);

  // Persist + push to server on every change, debounced
  useEffect(() => {
    if (!classId || !termId || !drafts) return;
    const serialized = JSON.stringify(drafts);
    if (serialized === lastSerialized.current) return;

    setAutoSaveStatus('saving');

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        sessionStorage.setItem(RECOVERY_KEY(classId, termId), serialized);
        lastSerialized.current = serialized;
        await teacherApi.saveGradeDraft({
          class_id: classId,
          term_id: termId,
          drafts: Object.entries(drafts).map(([studentId, d]) => ({ student_id: studentId, ...d })),
        });
        markSaved();
      } catch {
        setAutoSaveStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer.current);
  }, [classId, termId, drafts, setAutoSaveStatus, markSaved]);
}

// Recover any drafts saved from a previous session
export function recoverDrafts(classId, termId) {
  if (!classId || !termId) return null;
  try {
    const raw = sessionStorage.getItem(RECOVERY_KEY(classId, termId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearRecoveredDrafts(classId, termId) {
  if (!classId || !termId) return;
  try { sessionStorage.removeItem(RECOVERY_KEY(classId, termId)); } catch {}
}

export function formatSaveStatus(status, lastSavedAt) {
  if (status === 'saving') return 'Saving…';
  if (status === 'error') return 'Save failed';
  if (status === 'saved' && lastSavedAt) {
    const sec = Math.floor((Date.now() - lastSavedAt) / 1000);
    if (sec < 5) return 'Saved just now';
    if (sec < 60) return `Saved ${sec}s ago`;
    if (sec < 3600) return `Saved ${Math.floor(sec / 60)}m ago`;
    return `Saved at ${new Date(lastSavedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return '';
}
