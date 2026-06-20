import { useState, useEffect } from 'react';
import financeApi from '../api/financeApi';
import { useBursar } from '../context/BursarContext';

export function useBursarDashboard() {
  const {
    stats, setStats,
    snapshot, setSnapshot,
    recentPayments, setRecentPayments,
    recentExpenses, setRecentExpenses,
    feeCategories, setFeeCategories,
    activityItems, setActivityItems,
    loaded, setLoaded,
  } = useBursar();

  const [loading, setLoading] = useState(!loaded);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (loaded) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    Promise.allSettled([
      financeApi.getStats(),
      financeApi.getFinanceSnapshot(),
      financeApi.getPayments(),
      financeApi.getExpenses(),
      financeApi.getFeeCategories(),
      financeApi.getActivityFeed(),
    ]).then(([st, sn, pay, exp, cat, act]) => {
      if (cancelled) return;

      if (st.status === 'fulfilled' && st.value?.success !== false) setStats(st.value);
      if (sn.status === 'fulfilled' && sn.value?.success !== false) setSnapshot(sn.value);
      if (pay.status === 'fulfilled' && pay.value?.success !== false) setRecentPayments(pay.value.payments || []);
      if (exp.status === 'fulfilled' && exp.value?.success !== false) setRecentExpenses(exp.value.expenses || []);
      if (cat.status === 'fulfilled' && cat.value?.success !== false) setFeeCategories(cat.value.categories || []);
      if (act.status === 'fulfilled' && act.value?.success !== false) setActivityItems(act.value.items || []);

      const allFailed = [st, sn, pay, exp, cat, act].every(
        (r) => r.status === 'rejected' || r.value?.success === false
      );
      if (allFailed) {
        setError('Failed to load finance dashboard data');
      }
      setLoaded(true);
    }).catch((err) => {
      if (!cancelled) setError(err.message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [loaded, setStats, setSnapshot, setRecentPayments, setRecentExpenses, setFeeCategories, setActivityItems, setLoaded]);

  return { loading, error, stats, snapshot, recentPayments, recentExpenses, feeCategories, activityItems };
}
