import { useState, useEffect } from 'react';
import { principalApi } from '../api/adminApi';

export function usePrincipalDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [classPerf, setClassPerf] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [financeData, setFinanceData] = useState(null);
  const [activityItems, setActivityItems] = useState([]);
  const [syllabus, setSyllabus] = useState(null);

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      principalApi.overview(),
      principalApi.getDashboard(),
      principalApi.getClassPerformance(),
      principalApi.getTeacherInsights(),
      principalApi.getFinanceSnapshot(),
      principalApi.getActivityFeed(),
      principalApi.getSyllabusProgress(),
    ]).then(([ov, dash, cls, teach, fin, act, syl]) => {
      if (cancelled) return;

      if (ov.status === 'fulfilled' && ov.value?.success !== false) setOverview(ov.value);
      if (dash.status === 'fulfilled' && dash.value?.success !== false) setDashboard(dash.value);
      if (cls.status === 'fulfilled' && cls.value?.success !== false) setClassPerf(cls.value);
      if (teach.status === 'fulfilled' && teach.value?.success !== false) setTeacherData(teach.value);
      if (fin.status === 'fulfilled' && fin.value?.success !== false) setFinanceData(fin.value);
      if (act.status === 'fulfilled' && act.value?.success !== false) setActivityItems(act.value.items || []);
      if (syl.status === 'fulfilled' && syl.value?.success !== false) setSyllabus(syl.value);

      const allFailed = [ov, dash, cls, teach, fin, act, syl].every(
        (r) => r.status === 'rejected' || r.value?.success === false
      );
      if (allFailed) {
        setError('Failed to load dashboard data');
      }
    }).catch((err) => {
      if (!cancelled) setError(err.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  return { loading, error, overview, dashboard, classPerf, teacherData, financeData, activityItems, syllabus };
}
