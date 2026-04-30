import { useEffect, useState } from 'react';

// Re-renders every `intervalMs`. Pauses when tab hidden to save battery.
export function useTicker(intervalMs = 1000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let id;
    const start = () => {
      stop();
      id = setInterval(() => setTick((t) => t + 1), intervalMs);
    };
    const stop = () => { if (id) { clearInterval(id); id = undefined; } };
    const onVis = () => {
      if (document.visibilityState === 'visible') start(); else stop();
    };
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [intervalMs]);
  return tick;
}

export function useNow(intervalMs = 30000) {
  useTicker(intervalMs);
  return Date.now();
}
