import React, { useEffect, useState } from 'react';
import ApiClient from '../../api/client';

/*
 * UpcomingMeetings — portal-agnostic card that lists the virtual meetings an
 * audience has been invited to, with a Join link. Pass the role's read endpoint:
 *   student → /api/student/virtual-meetings/
 *   teacher → /api/teacher/virtual-meetings/
 *   parent  → /api/parent/virtual-meetings/
 * Renders nothing while loading or when there are no scheduled meetings, so it's
 * safe to drop into any portal home.
 */

function fmtWhen(iso) {
  if (!iso) return 'Time to be confirmed';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Time to be confirmed';
    return d.toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return 'Time to be confirmed'; }
}

export default function UpcomingMeetings({ endpoint, title = 'Upcoming meetings' }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    ApiClient.get(endpoint)
      .then(d => { if (alive) setMeetings(Array.isArray(d?.meetings) ? d.meetings : []); })
      .catch(() => { if (alive) setMeetings([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [endpoint]);

  if (loading || !meetings.length) return null;

  return (
    <div style={{
      background: 'var(--card-bg, #fff)', border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 14, padding: 18, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className="material-symbols-outlined" style={{ color: '#2563eb' }}>videocam</span>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{title}</h3>
        <span style={{
          marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700,
          background: 'rgba(37,99,235,0.12)', color: '#2563eb', padding: '2px 8px', borderRadius: 20,
        }}>{meetings.length}</span>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {meetings.map(m => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            padding: '12px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.025)',
            border: '1px solid rgba(0,0,0,0.05)',
          }}>
            <div style={{ minWidth: 0, flex: '1 1 200px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{m.title}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {fmtWhen(m.scheduled_at)}
                {m.duration_minutes ? ` · ${m.duration_minutes} min` : ''}
                {m.host ? ` · ${m.host}` : ''}
              </div>
              {m.description && (
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 2 }}>{m.description}</div>
              )}
            </div>
            {m.meeting_url ? (
              <a href={m.meeting_url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
                  background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: '0.82rem',
                  padding: '8px 14px', borderRadius: 9, minHeight: 40,
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>login</span>
                Join
              </a>
            ) : (
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Link pending</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
