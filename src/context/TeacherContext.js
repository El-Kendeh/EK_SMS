import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const TeacherContext = createContext(null);

// URL-aware setter helpers. Mirror ?class=X&term=Y to the address bar so links
// remain shareable / refresh-safe. Also persist to sessionStorage as a backup.
function readUrlParam(name) {
  try { return new URLSearchParams(window.location.search).get(name); } catch { return null; }
}
function writeUrlParam(name, value) {
  try {
    const u = new URL(window.location.href);
    if (value) u.searchParams.set(name, value);
    else u.searchParams.delete(name);
    window.history.replaceState({}, '', u.toString());
  } catch {}
}

export function TeacherProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [currentTerm, setCurrentTerm] = useState(null);

  const [selectedClassId, setSelectedClassIdRaw] = useState(
    () => readUrlParam('class') || sessionStorage.getItem('teacher_selected_class') || null
  );
  const setSelectedClassId = useCallback((id) => {
    setSelectedClassIdRaw(id);
    if (id) sessionStorage.setItem('teacher_selected_class', id);
    writeUrlParam('class', id);
  }, []);

  const [selectedTermId, setSelectedTermIdRaw] = useState(
    () => readUrlParam('term') || sessionStorage.getItem('teacher_selected_term') || null
  );
  const setSelectedTermId = useCallback((id) => {
    setSelectedTermIdRaw(id);
    if (id) sessionStorage.setItem('teacher_selected_term', id);
    writeUrlParam('term', id);
  }, []);

  const [gradeDrafts, setGradeDrafts] = useState({});

  const updateGradeDraft = useCallback((key, studentId, data) => {
    setGradeDrafts(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [studentId]: data }
    }));
  }, []);

  const clearGradeDraft = useCallback((key) => {
    setGradeDrafts(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Auto-save status — driven by the real scheduler in useGradeAutoSave hook
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const markSaved = useCallback(() => {
    setAutoSaveStatus('saved');
    setLastSavedAt(Date.now());
  }, []);

  const [actionFeedback, setActionFeedbackRaw] = useState(null);
  const setActionFeedback = useCallback((feedback) => setActionFeedbackRaw(feedback), []);
  const clearActionFeedback = useCallback(() => setActionFeedbackRaw(null), []);

  // "Substitute mode" — temporary delegated access (mostly UI state)
  const [substituteMode, setSubstituteMode] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('teacher_sub_mode') || 'null'); } catch { return null; }
  });
  useEffect(() => {
    if (substituteMode) sessionStorage.setItem('teacher_sub_mode', JSON.stringify(substituteMode));
    else sessionStorage.removeItem('teacher_sub_mode');
  }, [substituteMode]);

  const selectedClass = useMemo(
    () => assignedClasses.find(c => c.id === selectedClassId) || null,
    [assignedClasses, selectedClassId]
  );

  const setAssignedClassesWithDefault = useCallback((classes) => {
    setAssignedClasses(classes);
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [selectedClassId, setSelectedClassId]);

  const pendingCounts = useMemo(() => {
    return assignedClasses.reduce((acc, cls) => {
      acc.totalPending += (cls.gradeStats?.pending || 0);
      acc.totalDraft += (cls.gradeStats?.draft || 0);
      acc.classesIncomplete += (cls.gradeStats?.pending > 0 || cls.gradeStats?.draft > 0) ? 1 : 0;
      return acc;
    }, { totalPending: 0, totalDraft: 0, classesIncomplete: 0 });
  }, [assignedClasses]);

  return (
    <TeacherContext.Provider value={{
      profile, setProfile,
      assignedClasses,
      setAssignedClasses: setAssignedClassesWithDefault,
      selectedClassId, setSelectedClassId,
      selectedClass,
      selectedTermId, setSelectedTermId,
      currentTerm, setCurrentTerm,
      gradeDrafts, updateGradeDraft, clearGradeDraft,
      autoSaveStatus, setAutoSaveStatus, lastSavedAt, markSaved,
      pendingCounts,
      actionFeedback, setActionFeedback, clearActionFeedback,
      substituteMode, setSubstituteMode,
    }}>
      {children}
    </TeacherContext.Provider>
  );
}

export const useTeacher = () => {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error('useTeacher must be used within TeacherProvider');
  return ctx;
};
