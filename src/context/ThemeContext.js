import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeCtx = createContext({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ek-sms-theme') || 'dark';
    // Set synchronously to prevent flash of wrong theme on load
    try { document.documentElement.setAttribute('data-theme', saved); } catch (e) {}
    return saved;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ek-sms-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeCtx.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
