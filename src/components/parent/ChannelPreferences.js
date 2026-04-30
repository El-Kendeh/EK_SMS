import { useEffect, useState } from 'react';
import { fetchChannelPreferences, updateChannelPreferences } from '../../api/parentApi';
import { Skeleton } from '../common/Skeleton';
import './ChannelPreferences.css';

const CATEGORIES = [
  { key: 'gradePosted',         label: 'Grade posted',         icon: 'auto_stories' },
  { key: 'modificationAttempt', label: 'Modification attempt', icon: 'shield' },
  { key: 'feeDue',              label: 'Fee reminders',        icon: 'payments' },
  { key: 'event',               label: 'Events & calendar',    icon: 'event_note' },
  { key: 'message',             label: 'Messages from staff',  icon: 'chat' },
  { key: 'pickup',              label: 'Pickup gate scans',    icon: 'directions_walk' },
  { key: 'permissionSlip',      label: 'Permission slips',     icon: 'task' },
];

const CHANNELS = [
  { key: 'inApp', label: 'In-app',  icon: 'circle_notifications' },
  { key: 'push',  label: 'Push',    icon: 'notifications_active' },
  { key: 'email', label: 'Email',   icon: 'mail' },
  { key: 'sms',   label: 'SMS',     icon: 'sms', cost: true },
];

export default function ChannelPreferences() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    fetchChannelPreferences().then(setPrefs).catch(() => setError('Could not load preferences.'));
  }, []);

  const toggle = (channel, category) => {
    setPrefs((cur) => ({
      ...cur,
      [channel]: { ...cur[channel], [category]: !cur[channel][category] },
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try { await updateChannelPreferences(prefs); setSavedAt(new Date()); }
    catch { setError('Could not save.'); }
    finally { setSaving(false); }
  };

  if (!prefs && !error) {
    return (
      <div className="pcp">
        <Skeleton height={26} width="40%" />
        <Skeleton height={300} radius={14} style={{ marginTop: 16 }} />
      </div>
    );
  }
  if (error && !prefs) return <p className="pcp__error">{error}</p>;

  return (
    <div className="pcp">
      <header>
        <h2><span className="material-symbols-outlined">tune</span> Notification preferences</h2>
        <p>Choose channels per alert type. SMS is reserved for time-critical alerts (cost applies).</p>
      </header>
      <div className="pcp__grid">
        <div className="pcp__row pcp__row--head">
          <div></div>
          {CHANNELS.map((c) => (
            <div key={c.key} className="pcp__head-cell">
              <span className="material-symbols-outlined">{c.icon}</span>
              <span>{c.label}</span>
              {c.cost && <small>cost</small>}
            </div>
          ))}
        </div>
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="pcp__row">
            <div className="pcp__cat-cell">
              <span className="material-symbols-outlined">{cat.icon}</span>
              <span>{cat.label}</span>
            </div>
            {CHANNELS.map((ch) => (
              <label key={ch.key} className="pcp__cell">
                <input
                  type="checkbox"
                  checked={!!prefs[ch.key]?.[cat.key]}
                  onChange={() => toggle(ch.key, cat.key)}
                />
                <span className="pcp__switch" aria-hidden="true" />
              </label>
            ))}
          </div>
        ))}
      </div>
      <footer>
        {savedAt && <span className="pcp__saved">Saved {savedAt.toLocaleTimeString()}</span>}
        {error && <span className="pcp__error">{error}</span>}
        <button onClick={save} disabled={saving} className="pcp__btn">
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </footer>
    </div>
  );
}
