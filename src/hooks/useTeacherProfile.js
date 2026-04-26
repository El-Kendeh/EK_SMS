import { useState, useEffect } from 'react';
import { teacherApi } from '../api/teacherApi';
import { useTeacher } from '../context/TeacherContext';

export function useTeacherProfile() {
  const { profile, setProfile } = useTeacher();
  const [loading, setLoading] = useState(!profile);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile) return;
    let cancelled = false;
    teacherApi.getTeacherProfile()
      .then(data => { if (!cancelled) setProfile(data.teacher || data); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profile, setProfile]);

  return { profile, loading, error };
}
