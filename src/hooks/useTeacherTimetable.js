import { useState, useEffect } from 'react';
import { teacherApi } from '../api/teacherApi';

export function useTeacherTimetable() {
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    teacherApi.getTeacherTimetable()
      .then(data => {
        if (cancelled) return;
        // Normalise shape: callers expect { periods: [...] }.
        // Backend may return { timetable: [...] } or { periods: [...] }
        // or a bare array — flatten all of them.
        const periods = Array.isArray(data)
          ? data
          : (data?.periods || data?.timetable || []);
        setTimetable({ periods });
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { timetable, loading, error };
}
