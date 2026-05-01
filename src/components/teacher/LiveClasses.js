import { useEffect, useState, useCallback } from 'react';
import { teacherApi } from '../../api/teacherApi';
import { useTeacherClasses } from '../../hooks/useTeacherClasses';
import './LiveClasses.css';

const PROVIDERS = [
  { key: 'jitsi', label: 'Jitsi Meet (auto link)' },
  { key: 'meet',  label: 'Google Meet (paste link)' },
  { key: 'zoom',  label: 'Zoom (paste link)' },
  { key: 'teams', label: 'MS Teams (paste link)' },
  { key: 'other', label: 'Other (paste link)' },
];

export default function LiveClasses() {
  const { classes } = useTeacherClasses();
  const [items, setItems] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState(null);
  const [draft, setDraft] = useState({
    classroom_id: '', subject_id: '',
    title: '', description: '',
    scheduled_start: '',
    duration_minutes: 60,
    meeting_provider: 'jitsi',
    meeting_url: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    teacherApi.listLiveClasses({ upcoming: '0' })
      .then((d) => setItems(d.live_classes || []))
      .catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this live class?')) return;
    await teacherApi.updateLiveClass(id, { status: 'cancelled' });
    load();
  };
  const markEnded = async (id) => {
    await teacherApi.updateLiveClass(id, { status: 'ended' });
    load();
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this live class permanently?')) return;
    await teacherApi.deleteLiveClass(id);
    load();
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!draft.classroom_id || !draft.title || !draft.scheduled_start) {
      setErr('Class, title, and start time are required.'); return;
    }
    setSaving(true);
    try {
      const r = await teacherApi.createLiveClass({
        ...draft,
        scheduled_start: new Date(draft.scheduled_start).toISOString(),
        duration_minutes: Number(draft.duration_minutes) || 60,
      });
      if (r.success) {
        setShowForm(false);
        setDraft({
          classroom_id: '', subject_id: '', title: '', description: '',
          scheduled_start: '', duration_minutes: 60,
          meeting_provider: 'jitsi', meeting_url: '',
        });
        load();
      } else {
        setErr(r.message || 'Failed to create class.');
      }
    } catch (e2) { setErr(e2.message); }
    setSaving(false);
  };

  return (
    <div className="lcl">
      <header className="lcl__head">
        <div>
          <h1>Live Classes</h1>
          <p>Schedule and host video sessions for your classes. Students join from their dashboard.</p>
        </div>
        <button className="lcl__cta" onClick={() => setShowForm((s) => !s)}>
          <span className="material-symbols-outlined">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Close' : 'Schedule new'}
        </button>
      </header>

      {err && <p className="lcl__err">{err}</p>}

      {showForm && (
        <form className="lcl__form" onSubmit={submit}>
          <label>
            <span>Class</span>
            <select required value={draft.classroom_id}
                    onChange={(e) => setDraft({ ...draft, classroom_id: e.target.value })}>
              <option value="">Select class…</option>
              {(classes || []).map((c) => (
                <option key={c.id} value={c.classroom_id || c.id}>{c.name || c.classroom_name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Title</span>
            <input required value={draft.title}
                   placeholder="e.g. Algebra revision — Q4"
                   onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </label>
          <label>
            <span>Start time</span>
            <input required type="datetime-local" value={draft.scheduled_start}
                   onChange={(e) => setDraft({ ...draft, scheduled_start: e.target.value })} />
          </label>
          <label>
            <span>Duration (minutes)</span>
            <input type="number" min="10" max="240" value={draft.duration_minutes}
                   onChange={(e) => setDraft({ ...draft, duration_minutes: e.target.value })} />
          </label>
          <label>
            <span>Provider</span>
            <select value={draft.meeting_provider}
                    onChange={(e) => setDraft({ ...draft, meeting_provider: e.target.value })}>
              {PROVIDERS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
          {draft.meeting_provider !== 'jitsi' && (
            <label>
              <span>Meeting URL</span>
              <input value={draft.meeting_url}
                     placeholder="https://meet.google.com/xxx-yyyy-zzz"
                     onChange={(e) => setDraft({ ...draft, meeting_url: e.target.value })} />
            </label>
          )}
          <label className="lcl__form-full">
            <span>Description (optional)</span>
            <textarea rows={2} value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <div className="lcl__form-actions">
            <button type="button" className="lcl__btn lcl__btn--ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="lcl__btn lcl__btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Schedule'}
            </button>
          </div>
        </form>
      )}

      {!items && <p className="lcl__skel">Loading…</p>}
      {items && items.length === 0 && (
        <div className="lcl__empty">
          <span className="material-symbols-outlined">videocam_off</span>
          <p>No live classes yet. Schedule one above.</p>
        </div>
      )}

      <div className="lcl__list">
        {(items || []).map((lc) => {
          const start = lc.scheduled_start ? new Date(lc.scheduled_start) : null;
          const inPast = start && start.getTime() < Date.now() - lc.duration_minutes * 60 * 1000;
          return (
            <article key={lc.id} className={`lcl__card lcl__card--${lc.status}`}>
              <header>
                <h3>{lc.title}</h3>
                <span className={`lcl__badge lcl__badge--${lc.status}`}>{lc.status}</span>
              </header>
              <p className="lcl__meta">
                <span><span className="material-symbols-outlined">class</span> {lc.classroom?.name || '—'}</span>
                {lc.subject && <span><span className="material-symbols-outlined">menu_book</span> {lc.subject.name}</span>}
                {start && (
                  <span>
                    <span className="material-symbols-outlined">schedule</span>
                    {start.toLocaleString()} · {lc.duration_minutes} min
                  </span>
                )}
              </p>
              {lc.description && <p className="lcl__desc">{lc.description}</p>}
              <div className="lcl__actions">
                {lc.meeting_url && lc.status !== 'cancelled' && (
                  <a className="lcl__btn lcl__btn--primary" href={lc.meeting_url}
                     target="_blank" rel="noreferrer">
                    <span className="material-symbols-outlined">video_call</span>
                    {lc.status === 'live' ? 'Join (live)' : 'Open meeting'}
                  </a>
                )}
                {lc.status === 'scheduled' && !inPast && (
                  <button className="lcl__btn lcl__btn--ghost"
                          onClick={() => cancel(lc.id)}>Cancel</button>
                )}
                {lc.status === 'scheduled' && inPast && (
                  <button className="lcl__btn lcl__btn--ghost"
                          onClick={() => markEnded(lc.id)}>Mark ended</button>
                )}
                <button className="lcl__btn lcl__btn--danger"
                        onClick={() => remove(lc.id)}>Delete</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
