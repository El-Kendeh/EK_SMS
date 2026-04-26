import { useState, useEffect } from 'react';
import { fetchParentProfile } from '../api/parentApi';

export function useParentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchParentProfile()
      .then((data) => { if (!cancelled) setProfile(data.profile || null); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { profile, loading, error };
}
