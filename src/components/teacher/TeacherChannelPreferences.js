import { useEffect, useState } from 'react';
import { teacherApi } from '../../api/teacherApi';
import { Skeleton } from '../common/Skeleton';
import './TeacherChannelPreferences.css';

const CATEGORIES = [
  { key: 'gradePosted',         label: 'Grade-related events',     icon: 'auto_stories' },
  { key: 'modificationAttempt', label: 'Modification attempt',     icon: 'shield' },
  { key: 'message',             label: 'Student / parent messages',icon: 'chat' },
  { key: 'parentReply',         label: 'Parent reply / objection', icon: 'family_restroom' },
  { key: 'conferenceBooked',    label: 'Conference booked',        icon: 'co_present' },
  { key: 'systemAlert',         label: 'System / admin alerts',    icon: 'campaign' },
];

const CHANNELS = [
  { key: 'inApp', label: 'In-app',  icon: 'circle_notifications' },
  { key: 'push',  label: 'Push',    icon: 'notifications_active' },
  { key: 'email', label: 'Email',   icon: 'mail' },
  { key: 'sms',   label: 'SMS',     icon: 'sms', cost: true },
];

export default function TeacherChannelPreferences() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    teacherApi.getChannelPreferences().then(setPrefs).catch(() => setError('Could not load preferences.'));
  }, []);

  const toggle = (channel, category) => {
    setPrefs((cur) => ({
      ...cur,
      [channel]: { ...cur[channel], [category]: !cur[channel][category] },
    }));
  };

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
        <p>Choose which channels deliver each kind of alert. SMS is reserved for time-critical alerts (cost applies).</p>
      </header>
      <div className="tcp__grid">
        <div className="tcp__row tcp__row--head">
          <div></div>
          {CHANNELS.map((c) => (
            <div key={c.key} className="tcp__head-cell">
              <span className="material-symbols-outlined">{c.icon}</span>
              <span>{c.label}</span>
              {c.cost && <small>cost</small>}
            </div>
          ))}
        </div>
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="tcp__row">
            <div className="tcp__cat-cell">
              <span className="material-symbols-outlined">{cat.icon}</span>
              <span>{cat.label}</span>
            </div>
            {CHANNELS.map((ch) => (
              <label key={ch.key} className="tcp__cell">
                <input
                  type="checkbox"
                  checked={!!prefs[ch.key]?.[cat.key]}
                  onChange={() => toggle(ch.key, cat.key)}
                />
                <span className="tcp__switch" aria-hidden="true" />
              </label>
            ))}
          </div>
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
