import { useEffect, useRef, useState, useCallback } from 'react';

// Tiny SWR-lite cache: stale-while-revalidate keyed by string.
// Shared across components in a single page lifecycle.
const cache = new Map();
const subs = new Map();

function notify(key) {
  const set = subs.get(key);
  if (set) set.forEach((cb) => cb());
}

export function useStudentData(key, fetcher, { revalidateOnFocus = true, revalidateOnMount = true } = {}) {
  const [, force] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // subscribe to key
  useEffect(() => {
    if (!key) return;
    const cb = () => force((n) => n + 1);
    if (!subs.has(key)) subs.set(key, new Set());
    subs.get(key).add(cb);
    return () => {
      subs.get(key)?.delete(cb);
    };
  }, [key]);

  const revalidate = useCallback(async () => {
    if (!key || !fetcherRef.current) return;
    const cur = cache.get(key) || {};
    cache.set(key, { ...cur, isLoading: true, error: null });
    notify(key);
    try {
      const data = await fetcherRef.current();
      cache.set(key, { data, isLoading: false, error: null, fetchedAt: Date.now() });
    } catch (error) {
      cache.set(key, { ...(cache.get(key) || {}), isLoading: false, error });
    }
    notify(key);
  }, [key]);

  useEffect(() => {
    if (!key) return;
    if (revalidateOnMount && (!cache.get(key) || cache.get(key).error)) revalidate();
  }, [key, revalidateOnMount, revalidate]);

  useEffect(() => {
    if (!revalidateOnFocus || !key) return;
    const onFocus = () => {
      const entry = cache.get(key);
      if (!entry || (Date.now() - (entry.fetchedAt || 0)) > 30000) revalidate();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [revalidateOnFocus, key, revalidate]);

  const entry = cache.get(key) || { isLoading: true };
  return { data: entry.data, error: entry.error, isLoading: entry.isLoading, revalidate, mutate: (next) => {
    cache.set(key, { ...(cache.get(key) || {}), data: typeof next === 'function' ? next((cache.get(key) || {}).data) : next });
    notify(key);
  } };
}

export function clearStudentCache() {
  cache.clear();
  subs.forEach((set, key) => notify(key));
}
