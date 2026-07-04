import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { fetchParentNotifications, markParentNotificationRead, markAllParentNotificationsRead } from '../api/parentApi';

const Ctx = createContext(null);
const POLL_MS = 30_000;

export function ParentNotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState(null);
  const lastTopId = useRef(null);

  const refetch = useCallback(async () => {
    try {
      const { notifications: list = [], unread: unreadTotal } = await fetchParentNotifications(20);
      setNotifications(list);
      // Server sends camelCase isRead; the server-side `unread` total covers
      // rows beyond the 20 fetched here.
      const unread = typeof unreadTotal === 'number'
        ? unreadTotal
        : list.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
      const top = list[0] || null;
      if (top && lastTopId.current && top.id !== lastTopId.current) {
        setLatest(top);
      }
      lastTopId.current = top?.id || null;
    } catch {
      // silent — keep last known state
    }
  }, []);

  useEffect(() => {
    let id;
    refetch();
    id = setInterval(() => {
      if (document.visibilityState === 'visible') refetch();
    }, POLL_MS);
    const onVis = () => { if (document.visibilityState === 'visible') refetch(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [refetch]);

  const markRead = useCallback(async (id) => {
    setNotifications((cur) => cur.map((n) => n.id === id ? { ...n, isRead: true, is_read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    try { await markParentNotificationRead(id); } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((cur) => cur.map((n) => ({ ...n, isRead: true, is_read: true })));
    setUnreadCount(0);
    try { await markAllParentNotificationsRead(); } catch {}
  }, []);

  const dismissLatest = useCallback(() => setLatest(null), []);

  return (
    <Ctx.Provider value={{ notifications, unreadCount, latest, dismissLatest, markRead, markAllRead, refetch }}>
      {children}
    </Ctx.Provider>
  );
}

export function useParentNotifyCtx() {
  return useContext(Ctx) || { notifications: [], unreadCount: 0, latest: null, dismissLatest: () => {}, markRead: () => {}, markAllRead: () => {}, refetch: () => {} };
}
