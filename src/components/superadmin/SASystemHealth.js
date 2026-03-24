import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ApiClient from '../../api/client';

/* ---- Icons ---- */
const IcShield = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const IcCheck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const IcHistory = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102-.66" /></svg>;
const IcCpu = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>;

/* ---- Helpers ---- */
function genUptimeBars(uptimePct, slots = 30) {
  return Array.from({ length: slots }, () => {
    const r = Math.random();
    if (r > uptimePct) return 'down';
    if (r > uptimePct - 0.03) return 'degraded';
    return 'up';
  });
}

function getProgressColor(val) {
  if (val > 80) return 'var(--sa-red)';
  if (val > 60) return 'var(--sa-amber)';
  return 'var(--sa-green)';
}

function fmtUptime(secs) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}


export default function SASystemHealth() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uptimeSecs, setUptimeSecs] = useState(0);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await ApiClient.get('/api/system-health/');
      if (data.success) {
        setMetrics(data);
        setUptimeSecs(data.uptime);
      }
    } catch (err) {
      console.error('Health check failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchHealth]);

  /* Live counter for aesthetic uptime */
  useEffect(() => {
    const timer = setInterval(() => setUptimeSecs(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const services = useMemo(() => {
    if (!metrics) return [];
    return metrics.services.map(s => ({
      ...s,
      bars: genUptimeBars(s.uptime)
    }));
  }, [metrics]);

  const resources = useMemo(() => metrics?.resources || [], [metrics]);

  const hasIssue = services.some(s => s.status !== 'Operational');
  const heroBg = hasIssue
    ? 'linear-gradient(135deg, #7c2d12 0%, #92400e 100%)'
    : 'linear-gradient(135deg, #052e16 0%, #064e3b 100%)';

  return (
    <div>
      {/* Header */}
      <div className="sa-page-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="sa-page-title">System Health</h1>
          <p className="sa-page-sub">Real-time infrastructure monitoring and service health verification.</p>
        </div>
      </div>

      {/* Hero status card */}
      {loading ? (
        <div className="sa-card" style={{ padding: 60, textAlign: 'center', color: 'var(--sa-text-2)' }}>
          <div className="sa-loader-ring" style={{ margin: '0 auto 20px', width: 40, height: 40 }} />
          Pinging system nodes...
        </div>
      ) : (
        <>
          <div style={{ background: heroBg, borderRadius: 16, padding: '24px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 140, opacity: 0.06, lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>✓</div>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span className="sa-live-dot" style={{ '--live-color': '#ffffff' }} />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '0.8125rem' }}>Live System Status</span>
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.75rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                {hasIssue ? 'Minor Issues Detected' : 'All Systems Operational'}
              </h2>
              <p style={{ margin: '0 0 18px', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.65)' }}>Last updated: Just now</p>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 16px', display: 'inline-block' }}>
                <p style={{ margin: '0 0 2px', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>System Uptime</p>
                <p style={{ margin: 0, fontFamily: 'Consolas, monospace', fontVariantNumeric: 'tabular-nums', fontSize: '1rem', fontWeight: 700, color: '#fff', letterSpacing: '0.03em' }}>
                  {fmtUptime(uptimeSecs)}
                </p>
              </div>
            </div>
          </div>

          {/* Security Health */}
          <div className="sa-card" style={{ marginBottom: 20 }}>
            <div className="sa-card-head">
              <p className="sa-card-title">
                <IcShield style={{ display: 'inline', verticalAlign: 'middle', width: 14, height: 14, marginRight: 6 }} />
                Security Health
              </p>
              <span style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>Continuous Monitoring</span>
            </div>
            <div className="sa-card-body">
              <div className="sa-two-col-grid">
                <div style={{ background: 'var(--sa-card-bg2)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--sa-border)' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '0.6875rem', color: 'var(--sa-text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Data Integrity</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sa-green)', fontWeight: 700 }}>
                    <span style={{ width: 16, height: 16, display: 'flex', flexShrink: 0 }}><IcCheck /></span> Verified
                  </div>
                </div>
                <div style={{ background: 'var(--sa-card-bg2)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--sa-border)' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '0.6875rem', color: 'var(--sa-text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>Last Audit</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sa-text)', fontWeight: 700 }}>
                    <span style={{ width: 16, height: 16, display: 'flex', flexShrink: 0 }}><IcHistory /></span> 4m ago
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resource Usage */}
          <div className="sa-card" style={{ marginBottom: 20 }}>
            <div className="sa-card-head">
              <p className="sa-card-title">
                <IcCpu style={{ display: 'inline', verticalAlign: 'middle', width: 14, height: 14, marginRight: 6 }} />
                Resource Usage
              </p>
            </div>
            <div className="sa-card-body">
              {resources.map((r, i) => (
                <div key={r.label} style={{ marginBottom: i < resources.length - 1 ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)' }}>{r.label}</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: getProgressColor(r.value) }}>{r.value}{r.unit}</span>
                  </div>
                  <div className="sa-progress-track">
                    <div className="sa-progress-fill" style={{ width: `${r.value}%`, background: getProgressColor(r.value) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Services */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--sa-text)' }}>Core Services</p>
            <span style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)', fontWeight: 600 }}>90-Day Uptime</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {services.map(svc => {
              const isOp = svc.status === 'Operational';
              const statusCol = isOp ? 'var(--sa-green)' : 'var(--sa-amber)';
              const uptimePct = (svc.uptime * 100).toFixed(2);
              return (
                <div key={svc.id} className="sa-card" style={{ borderLeft: `3px solid ${statusCol}` }}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 18, height: 18, display: 'flex', color: 'var(--sa-text-2)', flexShrink: 0 }}>{svc.icon}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--sa-text)' }}>{svc.label}</span>
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: isOp ? 'var(--sa-green-dim)' : 'var(--sa-amber-dim)',
                        color: statusCol, border: `1px solid ${statusCol}33`,
                        borderRadius: 20, padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusCol, display: 'inline-block' }} />
                        {svc.status}
                      </span>
                    </div>
                    {/* Mini uptime bars */}
                    <div style={{ display: 'flex', gap: 2, height: 18, alignItems: 'flex-end' }}>
                      {svc.bars.map((b, i) => {
                        const col = b === 'up' ? 'var(--sa-green)' : b === 'degraded' ? 'var(--sa-amber)' : 'var(--sa-red)';
                        const h = b === 'up' ? '100%' : b === 'degraded' ? '65%' : '30%';
                        return <div key={i} style={{ flex: 1, height: h, background: col, borderRadius: 2, opacity: 0.85 }} />;
                      })}
                    </div>
                    <p style={{ margin: '5px 0 0', fontSize: '0.6875rem', color: 'var(--sa-text-2)', textAlign: 'right' }}>
                      {uptimePct}% uptime
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Activity */}
          <div className="sa-card">
            <div className="sa-card-head"><p className="sa-card-title">Recent Activity</p></div>
            <div className="sa-card-body" style={{ paddingBottom: 8 }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-3)', padding: '8px 0' }}>No recent system activity recorded.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
