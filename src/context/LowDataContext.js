import { createContext, useContext, useState } from 'react';

const LowDataContext = createContext({ lowData: false, toggleLowData: () => {} });

export function LowDataProvider({ children }) {
  const [lowData, setLowData] = useState(
    () => localStorage.getItem('stu_low_data') === 'true'
  );

  const toggleLowData = () => {
    setLowData((prev) => {
      const next = !prev;
      localStorage.setItem('stu_low_data', String(next));
      return next;
    });
  };

  return (
    <LowDataContext.Provider value={{ lowData, toggleLowData }}>
      {children}
    </LowDataContext.Provider>
  );
}

export function useLowData() {
  return useContext(LowDataContext);
}
