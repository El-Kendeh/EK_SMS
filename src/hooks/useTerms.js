import { useState, useEffect, useCallback } from 'react';
import ApiClient from '../api/client';

const api = new ApiClient();

const cache = { terms: null, years: null, fetchedAt: 0 };

export function useTerms() {
  const [terms, setTerms] = useState(cache.terms || []);
  const [years, setYears] = useState(cache.years || []);
  const [loading, setLoading] = useState(!cache.terms);
  const [error, setError] = useState(null);

  const fetchTerms = useCallback(async (force = false) => {
    if (!force && cache.terms && Date.now() - cache.fetchedAt < 30000) {
      setTerms(cache.terms);
      setYears(cache.years);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [termsRes, yearsRes] = await Promise.all([
        api.request('/api/school/terms/', { method: 'GET' }),
        api.request('/api/school/academic-years/', { method: 'GET' }),
      ]);
      const t = termsRes.data?.terms || [];
      const y = yearsRes.data?.years || [];
      cache.terms = t;
      cache.years = y;
      cache.fetchedAt = Date.now();
      setTerms(t);
      setYears(y);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTerm = useCallback(async (data) => {
    const res = await api.request('/api/school/terms/', { method: 'POST', body: data });
    const newTerm = res.data?.term;
    if (newTerm) {
      cache.terms = [newTerm, ...(cache.terms || [])];
      cache.fetchedAt = Date.now();
      setTerms([...cache.terms]);
    }
    return res;
  }, []);

  const updateTerm = useCallback(async (id, data) => {
    const res = await api.request(`/api/school/terms/${id}/`, { method: 'PUT', body: data });
    const updated = res.data?.term;
    if (updated && cache.terms) {
      cache.terms = cache.terms.map(t => t.id === id ? updated : t);
      cache.fetchedAt = Date.now();
      setTerms([...cache.terms]);
    }
    return res;
  }, []);

  const deleteTerm = useCallback(async (id) => {
    await api.request(`/api/school/terms/${id}/`, { method: 'DELETE' });
    if (cache.terms) {
      cache.terms = cache.terms.filter(t => t.id !== id);
      cache.fetchedAt = Date.now();
      setTerms([...cache.terms]);
    }
  }, []);

  const refresh = useCallback(() => {
    cache.terms = null;
    cache.years = null;
    return fetchTerms(true);
  }, [fetchTerms]);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  return { terms, years, loading, error, createTerm, updateTerm, deleteTerm, refresh };
}
