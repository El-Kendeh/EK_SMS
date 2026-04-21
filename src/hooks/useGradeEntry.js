import { useState, useEffect, useCallback, useRef } from 'react';
import { teacherApi } from '../api/teacherApi';
import { useTeacher } from '../context/TeacherContext';
import { calculateGradeLetter } from '../utils/gradeUtils';

export function useGradeEntry(classId) {
  const { setAutoSaveStatus } = useTeacher();
  const [students, setStudents] = useState([]);
  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localGrades, setLocalGrades] = useState({});
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      teacherApi.getClassStudents(classId),
      teacherApi.getGradingScheme(),
    ])
      .then(([studs, schemeData]) => {
        if (cancelled) return;
        setStudents(studs || []);
        setScheme(schemeData);
        // Initialize local grades from student data
        const initial = {};
        (studs || []).forEach(s => {
          if (s.currentGrade.status !== 'locked') {
            initial[s.id] = {
              score: s.currentGrade.score !== null ? String(s.currentGrade.score) : '',
              remarks: s.currentGrade.remarks || '',
            };
          }
        });
        setLocalGrades(initial);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Failed to load grade data');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [classId]);

  const updateGrade = useCallback((studentId, field, value) => {
    setLocalGrades(prev => {
      const updated = { ...prev, [studentId]: { ...(prev[studentId] || {}), [field]: value } };
      return updated;
    });

    // Debounce auto-save
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveStatus('saving');
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await teacherApi.saveGradeDraft({ classId, studentId, field, value });
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch {
        setAutoSaveStatus('error');
      }
    }, 1500);
  }, [classId, setAutoSaveStatus]);

  const getComputedGradeLetter = useCallback((studentId) => {
    if (!scheme) return null;
    const score = localGrades[studentId]?.score;
    return calculateGradeLetter(score, scheme.boundaries);
  }, [localGrades, scheme]);

  const submitGrades = useCallback(async (studentIds, subjectId, termId) => {
    const gradesArray = studentIds.map(id => ({
      studentId: id,
      score: localGrades[id]?.score,
      remarks: localGrades[id]?.remarks,
      gradeLetter: getComputedGradeLetter(id),
    })).filter(g => g.score !== '' && g.score !== null && g.score !== undefined);

    return teacherApi.submitGradesForLocking(gradesArray, subjectId, termId);
  }, [localGrades, getComputedGradeLetter]);

  return {
    students,
    scheme,
    loading,
    error,
    localGrades,
    updateGrade,
    getComputedGradeLetter,
    submitGrades,
  };
}
