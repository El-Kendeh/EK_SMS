import { createContext, useContext, useEffect, useState } from 'react';

// Theme is locked to DARK — light mode has been removed.
// The accessibility preferences below remain user-toggleable:
//   contrast:   'normal' | 'high'      — high-contrast mode (a11y)
//   colorBlind: 'off' | 'on'           — patterns + safer hues for charts/badges
// Applied on the <html> data attributes so CSS can opt in via
// [data-contrast=...] and [data-cblind=...].

const ThemeCtx = createContext({
  theme: 'dark', toggleTheme: () => {},
  contrast: 'normal', toggleContrast: () => {},
  colorBlind: 'off', toggleColorBlind: () => {},
});

export function ThemeProvider({ children }) {
  const [contrast, setContrast] = useState(() => localStorage.getItem('ek-sms-contrast') || 'normal');
  const [colorBlind, setColorBlind] = useState(() => localStorage.getItem('ek-sms-cblind') || 'off');

  // Hard-lock to dark. Light mode is gone; overwrite any previously-stored
  // 'light' preference so returning users always get dark.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('ek-sms-theme', 'dark'); } catch { /* storage unavailable */ }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-contrast', contrast);
    localStorage.setItem('ek-sms-contrast', contrast);
  }, [contrast]);
  useEffect(() => {
    document.documentElement.setAttribute('data-cblind', colorBlind);
    localStorage.setItem('ek-sms-cblind', colorBlind);
  }, [colorBlind]);

  const toggleContrast   = () => setContrast((c) => c === 'normal' ? 'high' : 'normal');
  const toggleColorBlind = () => setColorBlind((c) => c === 'off' ? 'on' : 'off');

  // theme/toggleTheme are kept in the context value (as constant dark / no-op)
  // so any remaining consumer keeps working without switching to light.
  return (
    <ThemeCtx.Provider value={{
      theme: 'dark', toggleTheme: () => {},
      contrast, toggleContrast, colorBlind, toggleColorBlind,
    }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
