import { useState, useEffect } from 'react';
import { fetchChildGrades } from '../api/parentApi';

export function useChildGrades(childId, termId) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchChildGrades(childId, termId)
      .then((data) => { if (!cancelled) setGrades(data.grades || []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [childId, termId]);

  return { grades, loading, error };
}
