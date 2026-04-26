import { useState, useEffect, useCallback } from 'react';
import { studentApi } from '../api/studentApi';

export function useStudentGrades(termId) {
  const [grades, setGrades] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGrades = useCallback(async () => {
    if (!termId) return;
    setLoading(true);
    setError(null);
    try {
      const [gradesData, summaryData] = await Promise.all([
        studentApi.getGrades(termId),
        studentApi.getGradesSummary(termId),
      ]);
      setGrades(gradesData);
      setSummary(summaryData);
    } catch (err) {
      setError('Failed to load grades. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [termId]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  return { grades, summary, loading, error, refetch: fetchGrades };
}
