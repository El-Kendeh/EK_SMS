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
      .then(data => { if (!cancelled) setNotifications(sortTeacherNotifications(data || [])); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const securityAlertCount = notifications.filter(n => n.isSecurityAlert && !n.isRead).length;

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
