import { useState, useEffect } from 'react';
import { teacherApi } from '../api/teacherApi';

export function useGradeHistory(gradeId) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!gradeId) { setHistory([]); return; }
    let cancelled = false;
    setLoading(true);
    teacherApi.getGradeHistory(gradeId)
      .then(data => { if (!cancelled) setHistory(data || []); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gradeId]);

  return { history, loading, error };
}
