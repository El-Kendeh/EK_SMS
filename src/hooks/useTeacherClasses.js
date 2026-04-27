import { useState, useEffect } from 'react';
import { teacherApi } from '../api/teacherApi';
import { useTeacher } from '../context/TeacherContext';

export function useTeacherClasses() {
  const { setAssignedClasses, assignedClasses } = useTeacher();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    teacherApi.getAssignedClasses()
      .then(data => {
        if (cancelled) return;
        // The API returns { success: true, classes: [...] }
        const classesArray = data.classes || (Array.isArray(data) ? data : []);
        setAssignedClasses(classesArray);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Failed to load classes');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [setAssignedClasses]);

  return { classes: assignedClasses, loading, error };
}
