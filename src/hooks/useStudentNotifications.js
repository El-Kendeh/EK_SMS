import { useState, useEffect, useCallback, useRef } from 'react';
import { studentApi } from '../api/studentApi';
import { useNotifications } from '../context/NotificationContext';

export function useStudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { updateUnreadCount } = useNotifications();
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await studentApi.getNotifications();
      setNotifications(data);
      const unread = data.filter((n) => !n.isRead).length;
      updateUnreadCount(unread);
    } catch (err) {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [updateUnreadCount]);

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchNotifications]);

  const markRead = useCallback(
    async (id) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      updateUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await studentApi.markNotificationRead(id);
      } catch {
        fetchNotifications();
      }
    },
    [fetchNotifications, updateUnreadCount]
  );

  const markAllRead = useCallback(async () => {
    const prev = notifications;
    setNotifications((n) => n.map((item) => ({ ...item, isRead: true })));
    updateUnreadCount(0);
    try {
      await studentApi.markAllNotificationsRead();
    } catch {
      setNotifications(prev);
      fetchNotifications();
    }
  }, [notifications, fetchNotifications, updateUnreadCount]);

  const hasUnread = notifications.some((n) => !n.isRead);

  return { notifications, loading, error, markRead, markAllRead, hasUnread, refetch: fetchNotifications };
}
