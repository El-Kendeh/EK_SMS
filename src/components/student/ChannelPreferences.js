import { useEffect, useState } from 'react';
import { studentApi } from '../../api/studentApi';
import { Skeleton } from '../common/Skeleton';
import './ChannelPreferences.css';

const CATEGORIES = [
  { key: 'gradePosted',         label: 'Grade posted',         icon: 'auto_stories' },
  { key: 'modificationAttempt', label: 'Modification attempt', icon: 'shield' },
  { key: 'feeDue',              label: 'Fee reminders',        icon: 'payments' },
  { key: 'event',               label: 'Events & calendar',    icon: 'event_note' },
  { key: 'message',             label: 'Messages from staff',  icon: 'chat' },
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
    studentApi.getChannelPreferences()
      .then(setPrefs)
      .catch(() => setError('Could not load preferences.'));
  }, []);

  const toggle = (channelKey, categoryKey) => {
    setPrefs((cur) => ({
      ...cur,
      [channelKey]: { ...cur[channelKey], [categoryKey]: !cur[channelKey][categoryKey] },
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await studentApi.updateChannelPreferences(prefs);
      setSavedAt(new Date());
    } catch {
      setError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!prefs && !error) {
    return (
      <div className="cp">
        <Skeleton height={26} width="40%" />
        <Skeleton height={14} width="65%" style={{ marginTop: 8 }} />
        <Skeleton height={260} style={{ marginTop: 20, borderRadius: 14 }} />
      </div>
    );
  }

  if (error && !prefs) return <p className="cp__error">{error}</p>;

  return (
    <div className="cp">
      <header>
        <h2>
          <span className="material-symbols-outlined">tune</span>
          Notification preferences
        </h2>
        <p>Choose which channels deliver each kind of alert. SMS is reserved for time-critical alerts (cost applies).</p>
      </header>

      <div className="cp__grid">
        <div className="cp__row cp__row--head">
          <div></div>
          {CHANNELS.map((c) => (
            <div key={c.key} className="cp__head-cell">
              <span className="material-symbols-outlined">{c.icon}</span>
              <span>{c.label}</span>
              {c.cost && <small>cost</small>}
            </div>
          ))}
        </div>
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="cp__row">
            <div className="cp__cat-cell">
              <span className="material-symbols-outlined">{cat.icon}</span>
              <span>{cat.label}</span>
            </div>
            {CHANNELS.map((ch) => (
              <label key={ch.key} className="cp__cell">
                <input
                  type="checkbox"
                  checked={!!prefs[ch.key]?.[cat.key]}
                  onChange={() => toggle(ch.key, cat.key)}
                />
                <span className="cp__switch" aria-hidden="true" />
              </label>
            ))}
          </div>
        ))}
      </div>

      <footer>
        {savedAt && <span className="cp__saved">Saved {savedAt.toLocaleTimeString()}</span>}
        {error && <span className="cp__error">{error}</span>}
        <button className="cp__btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </footer>
    </div>
  );
}
