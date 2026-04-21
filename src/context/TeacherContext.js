import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const TeacherContext = createContext(null);

export function TeacherProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [currentTerm, setCurrentTerm] = useState(null);

  const [selectedClassId, setSelectedClassIdRaw] = useState(
    () => sessionStorage.getItem('teacher_selected_class') || null
  );
  const setSelectedClassId = useCallback((id) => {
    setSelectedClassIdRaw(id);
    if (id) sessionStorage.setItem('teacher_selected_class', id);
  }, []);

  const [selectedTermId, setSelectedTermIdRaw] = useState(
    () => sessionStorage.getItem('teacher_selected_term') || null
  );
  const setSelectedTermId = useCallback((id) => {
    setSelectedTermIdRaw(id);
    if (id) sessionStorage.setItem('teacher_selected_term', id);
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

  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');

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
      autoSaveStatus, setAutoSaveStatus,
      pendingCounts
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
