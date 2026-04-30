import { useEffect, useState, useRef, useCallback } from 'react';

// Debounced auto-save into localStorage. Returns [value, setValue, { restored, clear }].
export function useAutoSave(key, initialValue = '', { delayMs = 600 } = {}) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored != null ? stored : initialValue;
    } catch { return initialValue; }
  });
  const [restored, setRestored] = useState(() => {
    try { return localStorage.getItem(key) != null; } catch { return false; }
  });
  const timer = useRef();

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        if (value) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
      } catch {}
    }, delayMs);
    return () => clearTimeout(timer.current);
  }, [key, value, delayMs]);

  const clear = useCallback(() => {
    try { localStorage.removeItem(key); } catch {}
    setValue('');
    setRestored(false);
  }, [key]);

  return [value, setValue, { restored, clear }];
}
