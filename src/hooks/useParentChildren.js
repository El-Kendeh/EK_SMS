import { useState, useEffect } from 'react';
import { fetchParentChildren } from '../api/parentApi';

export function useParentChildren() {
  const [children, setChildren] = useState([]);
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchParentChildren()
      .then((data) => {
        if (cancelled) return;
        setChildren(data.children || []);
        setParent(data.parent || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load children');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { children, parent, loading, error };
}
