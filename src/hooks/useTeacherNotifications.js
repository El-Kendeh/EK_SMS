import { useState, useEffect, useCallback } from 'react';
import { teacherApi } from '../api/teacherApi';
import { sortTeacherNotifications } from '../utils/teacherUtils';

export function useTeacherNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    teacherApi.getNotifications()
      .then(data => { 
        if (!cancelled) {
          // Handle both array and object responses
          const notifs = Array.isArray(data) ? data : (data?.notifications || data?.results || []);
          setNotifications(sortTeacherNotifications(notifs));
        }
      })
      .catch(err => { 
        if (!cancelled) {
          console.warn('Failed to load notifications:', err.message);
          setError(err.message);
          setNotifications([]); // Set empty array on error
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Safely handle undefined notifications
  const safeNotifications = notifications || [];
  const unreadCount = safeNotifications.filter(n => !n.isRead).length;
  const securityAlertCount = safeNotifications.filter(n => n.isSecurityAlert && !n.isRead).length;

  const markRead = useCallback(async (id) => {
    await teacherApi.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    await teacherApi.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  return { notifications, loading, error, unreadCount, securityAlertCount, markRead, markAllRead };
}
