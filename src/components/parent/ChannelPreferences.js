import { useEffect, useState } from 'react';
import { fetchChannelPreferences, updateChannelPreferences } from '../../api/parentApi';
import { Skeleton } from '../common/Skeleton';
import './ChannelPreferences.css';

// The backend stores ONE on/off flag per channel (no per-alert-type matrix),
// so the UI shows exactly that — a flat channel list, not a fake grid.
const CHANNELS = [
  { key: 'inApp',    label: 'In-app',   icon: 'circle_notifications', desc: 'Alerts inside this portal' },
  { key: 'push',     label: 'Push',     icon: 'notifications_active', desc: 'Phone push notifications' },
  { key: 'email',    label: 'Email',    icon: 'mail',                 desc: 'Sent to your registered email' },
  { key: 'sms',      label: 'SMS',      icon: 'sms',                  desc: 'Time-critical alerts (cost applies)', cost: true },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'chat',                 desc: 'Via the school WhatsApp line' },
];

export default function ChannelPreferences() {
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    fetchChannelPreferences().then(setPrefs).catch(() => setError('Could not load preferences.'));
  }, []);

  const toggle = (key) => {
    setPrefs((cur) => ({ ...cur, [key]: !cur[key] }));
    setSavedAt(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateChannelPreferences(prefs);
      if (res?.preferences) setPrefs(res.preferences);
      setSavedAt(new Date());
    } catch { setError('Could not save.'); }
    finally { setSaving(false); }
  };

  if (!prefs && !error) {
    return (
      <div className="pcp">
        <Skeleton height={26} width="40%" />
        <Skeleton height={220} radius={14} style={{ marginTop: 16 }} />
      </div>
    );
  }
  if (error && !prefs) return <p className="pcp__error">{error}</p>;

  return (
    <div className="pcp">
      <header>
        <h2><span className="material-symbols-outlined">tune</span> Notification channels</h2>
        <p>Turn each delivery channel on or off. Right now alerts are delivered in-app; email, SMS and WhatsApp delivery are being connected — your choices are saved and will apply as soon as each channel goes live.</p>
      </header>
      <div className="pcp__grid">
        {CHANNELS.map((ch) => (
          <div key={ch.key} className="pcp__row pcp__row--flat">
            <div className="pcp__cat-cell">
              <span className="material-symbols-outlined">{ch.icon}</span>
              <span>
                {ch.label}
                {ch.cost && <small style={{ color: '#fbbf24', marginLeft: 6 }}>cost</small>}
                <em className="pcp__desc">{ch.desc}</em>
              </span>
            </div>
            <label className="pcp__cell pcp__cell--flat">
              <input
                type="checkbox"
                checked={!!prefs[ch.key]}
                onChange={() => toggle(ch.key)}
                aria-label={`Toggle ${ch.label}`}
              />
              <span className="pcp__switch" aria-hidden="true" />
            </label>
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
