import { useEffect, useState } from 'react';
import { teacherApi } from '../../api/teacherApi';
import { Skeleton } from '../common/Skeleton';
import './TeacherChannelPreferences.css';

// The backend stores 5 global per-channel toggles (push/email/sms/in_app/whatsapp).
// The old 6×4 category×channel matrix had no backing schema — every box loaded
// unchecked and per-category granularity was silently dropped on save (audit #88).
const CHANNELS = [
  { key: 'in_app',   label: 'In-app',   icon: 'circle_notifications', desc: 'Alerts inside the dashboard' },
  { key: 'push',     label: 'Push',     icon: 'notifications_active',  desc: 'Browser / device push' },
  { key: 'email',    label: 'Email',    icon: 'mail',                 desc: 'To your registered email' },
  { key: 'sms',      label: 'SMS',      icon: 'sms',                  desc: 'Time-critical alerts only (cost applies)' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'chat',                 desc: 'Via WhatsApp where available' },
];

export default function TeacherChannelPreferences() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    teacherApi.getChannelPreferences().then(setPrefs).catch(() => setError('Could not load preferences.'));
  }, []);

  const toggle = (ch) => setPrefs((cur) => ({ ...cur, [ch]: !cur[ch] }));

  const save = async () => {
    setSaving(true); setError(null);
    try { await teacherApi.updateChannelPreferences(prefs); setSavedAt(new Date()); }
    catch { setError('Could not save.'); }
    finally { setSaving(false); }
  };

  if (!prefs && !error) return <div className="tcp"><Skeleton height={280} radius={14} /></div>;
  if (error && !prefs) return <p className="tcp__error">{error}</p>;

  return (
    <div className="tcp">
      <header>
        <h2><span className="material-symbols-outlined">tune</span> Notification preferences</h2>
        <p>Choose how you receive alerts. SMS is reserved for time-critical alerts (cost applies).</p>
      </header>

      <div className="tcp__channels">
        {CHANNELS.map((ch) => (
          <label
            key={ch.key}
            className="tcp__channel"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderBottom: '1px solid var(--tch-border, rgba(0,0,0,0.08))', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22, opacity: 0.8 }}>{ch.icon}</span>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <strong style={{ fontSize: 14 }}>{ch.label}</strong>
              <small style={{ fontSize: 12, opacity: 0.65 }}>{ch.desc}</small>
            </span>
            <input
              type="checkbox"
              checked={!!prefs[ch.key]}
              onChange={() => toggle(ch.key)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
            <span className="tcp__switch" aria-hidden="true" />
          </label>
        ))}
      </div>

      <footer>
        {savedAt && <span className="tcp__saved">Saved {savedAt.toLocaleTimeString()}</span>}
        {error && <span className="tcp__error">{error}</span>}
        <button onClick={save} disabled={saving} className="tcp__btn">
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </footer>
    </div>
  );
}
