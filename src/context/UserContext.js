import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUser(parsed);
      } catch { setUser(null); }
    }
    const handler = () => {
      const r = localStorage.getItem('user');
      if (r) {
        try { setUser(JSON.parse(r)); } catch { setUser(null); }
      } else { setUser(null); }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}

export default UserContext;
