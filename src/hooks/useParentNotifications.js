import { useState, useEffect, useCallback } from 'react';
import {
  fetchParentNotifications,
  markParentNotificationRead,
  markAllParentNotificationsRead,
} from '../api/parentApi';

export function useParentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchParentNotifications()
      .then((data) => { if (!cancelled) setNotifications(data.notifications || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    markParentNotificationRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    markAllParentNotificationsRead().catch(() => {});
  }, []);

  const hasUnread = notifications.some((n) => !n.isRead);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return { notifications, loading, markRead, markAllRead, hasUnread, unreadCount };
}
