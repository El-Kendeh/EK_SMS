import { createContext, useContext, useEffect, useState } from 'react';

// Theme system supports:
//   theme: 'dark' | 'light'           — surface palette
//   contrast: 'normal' | 'high'       — high-contrast mode (a11y)
//   colorBlind: 'off' | 'on'          — adds patterns + safer hues for charts/badges
// All three persist to localStorage. Apply on the <html> data attributes so CSS
// can opt in via [data-theme=...], [data-contrast=...], [data-cblind=...].

const ThemeCtx = createContext({
  theme: 'dark', toggleTheme: () => {},
  contrast: 'normal', toggleContrast: () => {},
  colorBlind: 'off', toggleColorBlind: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('ek-sms-theme') || 'dark');
  const [contrast, setContrast] = useState(() => localStorage.getItem('ek-sms-contrast') || 'normal');
  const [colorBlind, setColorBlind] = useState(() => localStorage.getItem('ek-sms-cblind') || 'off');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ek-sms-theme', theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.setAttribute('data-contrast', contrast);
    localStorage.setItem('ek-sms-contrast', contrast);
  }, [contrast]);
  useEffect(() => {
    document.documentElement.setAttribute('data-cblind', colorBlind);
    localStorage.setItem('ek-sms-cblind', colorBlind);
  }, [colorBlind]);

  const toggleTheme      = () => setTheme((t) => t === 'dark' ? 'light' : 'dark');
  const toggleContrast   = () => setContrast((c) => c === 'normal' ? 'high' : 'normal');
  const toggleColorBlind = () => setColorBlind((c) => c === 'off' ? 'on' : 'off');

  return (
    <ThemeCtx.Provider value={{ theme, toggleTheme, contrast, toggleContrast, colorBlind, toggleColorBlind }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
