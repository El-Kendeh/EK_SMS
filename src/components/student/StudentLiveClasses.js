import { useEffect, useState } from 'react';
import { studentApi } from '../../api/studentApi';

export default function StudentLiveClasses() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    studentApi.listLiveClasses({ upcoming: '1' })
      .then((d) => { if (d.success !== false) setItems(d.live_classes || []); else setErr(d.message); })
      .catch((e) => setErr(e.message));
  }, []);

  if (err) {
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ margin: 0 }}>Live Classes</h1>
        <p style={{ color: '#dc2626', marginTop: 12 }}>{err}</p>
      </div>
    );
  }
  if (!items) {
    return (
      <div style={{ padding: 20 }}>
        <h1 style={{ margin: 0 }}>Live Classes</h1>
        <p style={{ color: '#94A3B8', marginTop: 12 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Live Classes</h1>
        <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '0.875rem' }}>
          Upcoming sessions for your class. Tap "Join" when the session is live.
        </p>
      </header>

      {items.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center', borderRadius: 12,
          border: '1px dashed rgba(255,255,255,0.1)', color: '#94A3B8',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>
            videocam_off
          </span>
          No upcoming live classes.
        </div>
      )}

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))' }}>
        {items.map((lc) => {
          const start = lc.scheduled_start ? new Date(lc.scheduled_start) : null;
          const startsSoon = start && start.getTime() - Date.now() < 15 * 60 * 1000;
          const live = lc.status === 'live' || (start && start.getTime() <= Date.now()
                       && Date.now() <= start.getTime() + lc.duration_minutes * 60 * 1000);
          return (
            <article key={lc.id} style={{
              background: 'var(--student-surface, rgba(255,255,255,0.04))',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{lc.title}</h3>
                <span style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  background: live ? 'rgba(220,38,38,0.15)' : 'rgba(27,63,175,0.15)',
                  color:      live ? '#f87171' : '#93c5fd',
                }}>{live ? 'Live now' : lc.status}</span>
              </header>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.75rem',
                          display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>person</span>
                  {' '}{lc.teacher?.name}</span>
                {lc.subject && (
                  <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>menu_book</span>
                    {' '}{lc.subject.name}</span>
                )}
                {start && (
                  <span><span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>schedule</span>
                    {' '}{start.toLocaleString()} · {lc.duration_minutes} min</span>
                )}
              </p>
              {lc.description && (
                <p style={{ margin: 0, fontSize: '0.825rem', lineHeight: 1.4 }}>{lc.description}</p>
              )}
              <a href={lc.meeting_url || '#'}
                 target="_blank" rel="noreferrer"
                 onClick={(e) => { if (!lc.meeting_url) e.preventDefault(); }}
                 style={{
                   marginTop: 4,
                   display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                   padding: '8px 14px', borderRadius: 8,
                   background: live ? '#dc2626' : startsSoon ? '#1B3FAF' : 'transparent',
                   color: live || startsSoon ? 'white' : '#1B3FAF',
                   border: live || startsSoon ? 'none' : '1px solid #1B3FAF',
                   fontWeight: 700, fontSize: '0.825rem',
                   textDecoration: 'none', opacity: lc.meeting_url ? 1 : 0.5,
                 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>video_call</span>
                {live ? 'Join now' : startsSoon ? 'Get ready' : 'Open link'}
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}
