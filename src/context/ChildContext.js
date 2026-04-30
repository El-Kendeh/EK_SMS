import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Persists the active child across every Parent dashboard section.
// Source of truth order: URL `?child=<id>` → localStorage → first child in list.
// Updating the active child rewrites the URL so links remain shareable / refresh-safe.

const ChildContext = createContext({
  children: [],
  activeChild: null,
  activeChildId: null,
  setActiveChildId: () => {},
  isLoading: true,
});

const LS_KEY = 'ek-sms-active-child';

function readUrlChild() {
  try {
    const u = new URLSearchParams(window.location.search);
    return u.get('child');
  } catch { return null; }
}

function writeUrlChild(id) {
  try {
    const u = new URL(window.location.href);
    if (id) u.searchParams.set('child', id);
    else u.searchParams.delete('child');
    window.history.replaceState({}, '', u.toString());
  } catch {}
}

export function ChildProvider({ children: kids, initialChildren = [], isLoading = false }) {
  const list = useMemo(
    () => (Array.isArray(initialChildren) ? initialChildren : []),
    [initialChildren]
  );

  const initial = useMemo(() => {
    const fromUrl = readUrlChild();
    const fromLs = (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })();
    const ids = list.map((c) => String(c.id));
    if (fromUrl && ids.includes(String(fromUrl))) return fromUrl;
    if (fromLs && ids.includes(String(fromLs))) return fromLs;
    return list[0]?.id || null;
  }, [list]);

  const [activeChildId, setActiveChildIdRaw] = useState(initial);

  // Reset when the children list itself first arrives or changes membership
  useEffect(() => {
    const ids = list.map((c) => String(c.id));
    if (!activeChildId || !ids.includes(String(activeChildId))) {
      setActiveChildIdRaw(list[0]?.id || null);
    }
  }, [list, activeChildId]);

  // Mirror to URL + localStorage whenever it changes
  useEffect(() => {
    if (!activeChildId) return;
    writeUrlChild(activeChildId);
    try { localStorage.setItem(LS_KEY, activeChildId); } catch {}
  }, [activeChildId]);

  const setActiveChildId = useCallback((id) => {
    setActiveChildIdRaw(String(id));
  }, []);

  const activeChild = useMemo(
    () => list.find((c) => String(c.id) === String(activeChildId)) || list[0] || null,
    [list, activeChildId]
  );

  const value = useMemo(() => ({
    children: list,
    activeChild,
    activeChildId,
    setActiveChildId,
    isLoading,
  }), [list, activeChild, activeChildId, setActiveChildId, isLoading]);

  return <ChildContext.Provider value={value}>{kids}</ChildContext.Provider>;
}

export function useActiveChild() {
  return useContext(ChildContext);
}
