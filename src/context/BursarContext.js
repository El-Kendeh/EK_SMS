import { createContext, useContext, useState, useCallback } from 'react';

const BursarContext = createContext(null);

export function BursarProvider({ children }) {
  const [stats, setStats] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [feeCategories, setFeeCategories] = useState([]);
  const [activityItems, setActivityItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const invalidate = useCallback(() => setLoaded(false), []);

  return (
    <BursarContext.Provider value={{
      stats, setStats,
      snapshot, setSnapshot,
      recentPayments, setRecentPayments,
      recentExpenses, setRecentExpenses,
      feeCategories, setFeeCategories,
      activityItems, setActivityItems,
      loaded, setLoaded,
      invalidate,
    }}>
      {children}
    </BursarContext.Provider>
  );
}

export const useBursar = () => {
  const ctx = useContext(BursarContext);
  if (!ctx) throw new Error('useBursar must be used within BursarProvider');
  return ctx;
};
