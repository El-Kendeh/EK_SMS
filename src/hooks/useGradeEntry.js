import { useState, useEffect, useCallback, useRef } from 'react';
import { teacherApi } from '../api/teacherApi';
import { useTeacher } from '../context/TeacherContext';
import { calculateGradeLetter } from '../utils/gradeUtils';

const AVATAR_COLOURS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];
function avatarColorFor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLOURS[Math.abs(hash) % AVATAR_COLOURS.length];
}

// The roster endpoint returns raw rows (id/first_name/last_name/full_name/...) with no
// currentGrade/initials/avatarColor/studentNumber — GradeEntryRow read those unguarded and
// crashed the whole screen (audit #14). Normalise each row into the shape the row expects.
function normaliseStudent(s) {
  const fullName = s.fullName || s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Student';
  return {
    ...s,
    fullName,
    studentNumber: s.studentNumber || s.admission_number || '',
    initials: fullName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'S',
    avatarColor: s.avatarColor || avatarColorFor(fullName),
    currentGrade: s.currentGrade || {
      id: null, score: null, status: 'draft', remarks: '', gradeLetter: null,
      lastUpdated: null, hasModificationAttempt: false,
    },
  };
}

export function useGradeEntry(classId, subjectId, termId) {
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
      .then(([studsRes, schemeData]) => {
        if (cancelled) return;
        const rawStuds = studsRes?.students || studsRes?.data || (Array.isArray(studsRes) ? studsRes : []);
        const studsArray = rawStuds.map(normaliseStudent);
        setStudents(studsArray);
        setScheme(schemeData);
        // Initialize local grades from student data
        const initial = {};
        studsArray.forEach(s => {
          if (s.currentGrade?.status !== 'locked') {
            initial[s.id] = {
              score: s.currentGrade?.score !== null ? String(s.currentGrade.score) : '',
              remarks: s.currentGrade?.remarks || '',
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
        await teacherApi.saveGradeDraft({ classId, subject_id: subjectId, term_id: termId, studentId, field, value });
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch {
        setAutoSaveStatus('error');
      }
    }, 1500);
  }, [classId, subjectId, termId, setAutoSaveStatus]);

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

    return teacherApi.submitGradesForLocking(gradesArray, subjectId, termId, classId);
  }, [localGrades, getComputedGradeLetter, classId]);

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
