import { createContext, useContext, useState, useCallback } from 'react';

const PrincipalContext = createContext(null);

export function PrincipalProvider({ children }) {
  const [dashboard, setDashboard] = useState(null);
  const [classPerf, setClassPerf] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [financeData, setFinanceData] = useState(null);
  const [activityItems, setActivityItems] = useState([]);
  const [syllabus, setSyllabus] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const [actionFeedback, setActionFeedbackRaw] = useState(null);
  const setActionFeedback = useCallback((feedback) => setActionFeedbackRaw(feedback), []);
  const clearActionFeedback = useCallback(() => setActionFeedbackRaw(null), []);

  return (
    <PrincipalContext.Provider value={{
      dashboard, setDashboard,
      classPerf, setClassPerf,
      teacherData, setTeacherData,
      financeData, setFinanceData,
      activityItems, setActivityItems,
      syllabus, setSyllabus,
      loaded, setLoaded,
      actionFeedback, setActionFeedback, clearActionFeedback,
    }}>
      {children}
    </PrincipalContext.Provider>
  );
}

export const usePrincipal = () => {
  const ctx = useContext(PrincipalContext);
  if (!ctx) throw new Error('usePrincipal must be used within PrincipalProvider');
  return ctx;
};
