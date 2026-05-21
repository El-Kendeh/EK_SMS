import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import apiClient from '../api/client';

const cache = { data: null, fetchedAt: 0 };
const CACHE_DURATION = 60000;

const SchoolContext = createContext(null);

export function SchoolContextProvider({ children }) {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContext = useCallback(async (force = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    if (!force && cache.data && Date.now() - cache.fetchedAt < CACHE_DURATION) {
      setContext(cache.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/school/context/');
      const data = res.academic_year
        ? { academicYear: res.academic_year, term: res.term, terms: res.terms, school: res.school }
        : { academicYear: null, term: null, terms: res.terms || [], school: res.school };
      cache.data = data;
      cache.fetchedAt = Date.now();
      setContext(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch school context');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    cache.data = null;
    return fetchContext(true);
  }, [fetchContext]);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      fetchContext();
    } else {
      setLoading(false);
    }
  }, [fetchContext]);

  const value = { ...context, loading, error, refresh };

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchoolContext() {
  const ctx = useContext(SchoolContext);
  if (!ctx) {
    throw new Error('useSchoolContext must be used within a SchoolContextProvider');
  }
  return ctx;
}

export function useSchoolContextStandalone() {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContext = useCallback(async (force = false) => {
    if (!force && cache.data && Date.now() - cache.fetchedAt < CACHE_DURATION) {
      setContext(cache.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/school/context/');
      const data = {
        academicYear: res.academic_year || null,
        term: res.term || null,
        terms: res.terms || [],
        school: res.school || null,
      };
      cache.data = data;
      cache.fetchedAt = Date.now();
      setContext(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch school context');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    cache.data = null;
    return fetchContext(true);
  }, [fetchContext]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return { ...context, loading, error, refresh };
}
