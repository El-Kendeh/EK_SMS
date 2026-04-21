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
      .then(classes => {
        if (cancelled) return;
        setAssignedClasses(classes || []);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Failed to load classes');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [setAssignedClasses]);

  return { classes: assignedClasses, loading, error };
}
