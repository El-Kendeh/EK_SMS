import React, { createContext, useContext, useEffect } from 'react';

const ThemeCtx = createContext({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('ek-sms-theme', 'dark');
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme: 'dark', toggleTheme: () => {} }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
