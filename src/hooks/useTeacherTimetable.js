import { useState, useEffect } from 'react';
import { teacherApi } from '../api/teacherApi';

export function useTeacherTimetable() {
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    teacherApi.getTeacherTimetable()
      .then(data => { if (!cancelled) setTimetable(data); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { timetable, loading, error };
}
