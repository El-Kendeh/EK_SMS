import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { studentApi } from '../api/studentApi';

const NotificationContext = createContext(null);

const POLL_MS = 30_000; // 30s — covers MVP "real-time" requirement without WebSocket

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState(null);
  const lastIdRef = useRef(null);

  const refetch = useCallback(async () => {
    try {
      const data = await studentApi.getNotifications(20);
      const list = Array.isArray(data) ? data : [];
      const unread = list.filter((n) => !n.isRead && !n.is_read).length;
      setUnreadCount(unread);
      const top = list[0] || null;
      // detect "new since last poll"
      if (top && lastIdRef.current && top.id !== lastIdRef.current) {
        setLatest(top);
      }
      lastIdRef.current = top?.id || null;
    } catch {
      // silent fail; keep last known count
    }
  }, []);

  useEffect(() => {
    let id;
    let stopped = false;

    const poll = () => {
      if (stopped) return;
      if (document.visibilityState === 'visible') refetch();
    };

    refetch();
    id = setInterval(poll, POLL_MS);

    const onVis = () => { if (document.visibilityState === 'visible') refetch(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refetch]);

  const updateUnreadCount = useCallback((count) => {
    setUnreadCount((prev) => typeof count === 'function' ? count(prev) : count);
  }, []);

  const decrementUnread = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  const dismissLatest = useCallback(() => setLatest(null), []);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      latest,
      dismissLatest,
      refetch,
      updateUnreadCount,
      decrementUnread,
      clearUnread,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
