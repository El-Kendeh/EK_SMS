import { useState, useEffect } from 'react';
import { fetchChildReportCards } from '../api/parentApi';

export function useChildReportCards(childId) {
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchChildReportCards(childId)
      .then((data) => { if (!cancelled) setReportCards(data.reportCards || []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [childId]);

  return { reportCards, loading, error };
}
