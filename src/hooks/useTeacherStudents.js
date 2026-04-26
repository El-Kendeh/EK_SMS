import { useState, useEffect } from 'react';
import { teacherApi } from '../api/teacherApi';
import { mockStudents } from '../mock/teacherMockData';

export function useTeacherStudents(classId) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!classId) {
      // Load all students across all classes
      const all = Object.values(mockStudents).flat();
      setStudents(all);
      return;
    }
    let cancelled = false;
    setLoading(true);
    teacherApi.getClassStudents(classId)
      .then(studs => { if (!cancelled) setStudents(studs || []); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [classId]);

  return { students, loading, error };
}
