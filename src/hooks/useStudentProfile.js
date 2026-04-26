import { useState, useEffect, useCallback } from 'react';
import { studentApi } from '../api/studentApi';

export function useStudentProfile() {
  const [profile, setProfile] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, accountData] = await Promise.all([
        studentApi.getProfile(),
        studentApi.getAccountInfo(),
      ]);
      setProfile(profileData);
      setAccountInfo(accountData);
    } catch (err) {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, accountInfo, loading, error, refetch: fetchProfile };
}
