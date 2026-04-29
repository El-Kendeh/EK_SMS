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
    
    const token = localStorage.getItem('token');
    if (!token) {
      if (!cancelled) {
        setError('No authentication token found');
        setLoading(false);
      }
      return;
    }
    
    teacherApi.getTeacherProfile()
      .then(data => { 
        if (!cancelled) {
          if (data.success === false) {
            setError(data.message || 'Failed to load profile');
          } else {
            setProfile(data.teacher || data);
          }
        }
      })
      .catch(err => { 
        if (!cancelled) {
          console.error('Teacher profile error:', err);
          setError(err.message); 
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profile, setProfile]);

  return { profile, loading, error };
}
