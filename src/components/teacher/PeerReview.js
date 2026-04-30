import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { teacherApi } from '../../api/teacherApi';
import { Skeleton } from '../common/Skeleton';
import './PeerReview.css';

export default function PeerReview() {
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ toTeacher: '', subject: '', score: 4, comment: '', anonymous: true });

  const refresh = () => teacherApi.getPeerReviews().then(setData).catch(() => setError('Could not load reviews.'));
  useEffect(() => { refresh(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.toTeacher || !form.comment) return;
    setBusy(true);
    try {
      await teacherApi.submitPeerReview(form);
      setAdding(false);
      setForm({ toTeacher: '', subject: '', score: 4, comment: '', anonymous: true });
      refresh();
    } catch { setError('Could not submit.'); }
    finally { setBusy(false); }
  };

  if (!data && !error) return <div className="prv"><Skeleton height={300} radius={14} /></div>;
  if (error) return <p className="prv__error">{error}</p>;

  const r = data.receivedAboutMe || {};

  return (
    <div className="prv">
      <header>
        <h2><span className="material-symbols-outlined">group</span> Peer review</h2>
        <p>Submit anonymous feedback about colleagues; see what colleagues say about you (aggregated).</p>
      </header>

      <div className="prv__grid">
        <section className="prv__card prv__card--me">
          <h3>About me</h3>
          <div className="prv__big">
            <strong>{r.average ?? '—'}</strong>
            <span>average across {r.count || 0} reviews</span>
          </div>
          <ul className="prv__breakdown">
            {[5, 4, 3, 2, 1].map((s) => (
              <li key={s}>
                <span>{s}★</span>
                <div className="prv__bar"><div style={{ width: `${(r.breakdown?.[s] || 0) * 100 / Math.max(1, r.count)}%` }} /></div>
                <small>{r.breakdown?.[s] || 0}</small>
              </li>
            ))}
          </ul>
          {r.recentComments?.length > 0 && (
            <div className="prv__quotes">
              {r.recentComments.map((c, i) => (
                <blockquote key={i}>"{c.comment}"</blockquote>
              ))}
            </div>
          )}
        </section>

        <section className="prv__card">
          <h3>Reviews I've given</h3>
          {(data.givenByMe || []).length === 0 && <p className="prv__empty">You haven't given any peer reviews yet.</p>}
          <ul className="prv__given">
            {(data.givenByMe || []).map((g) => (
              <li key={g.id}>
                <strong>{g.toTeacher}</strong>
                <span>{g.subject} · {g.score}★ {g.anonymous && <em>· anonymous</em>}</span>
                <p>"{g.comment}"</p>
              </li>
            ))}
          </ul>
          {!adding ? (
            <button className="prv__add" onClick={() => setAdding(true)}>
              <span className="material-symbols-outlined">add</span> Submit a review
            </button>
          ) : (
            <motion.form className="prv__form" onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <label><span>Colleague</span><input value={form.toTeacher} onChange={(e) => setForm({ ...form, toTeacher: e.target.value })} placeholder="Mrs. Aisha Bah" required /></label>
              <label><span>Subject they teach</span><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Biology" /></label>
              <label><span>Score (1–5)</span><input type="number" min={1} max={5} step={0.5} value={form.score} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} /></label>
              <label><span>Comment</span><textarea rows={3} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} required /></label>
              <label className="prv__check">
                <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} />
                Submit anonymously
              </label>
              <div className="prv__form-actions">
                <button type="button" className="prv__btn prv__btn--ghost" onClick={() => setAdding(false)}>Cancel</button>
                <button type="submit" className="prv__btn prv__btn--primary" disabled={busy}>{busy ? '…' : 'Submit'}</button>
              </div>
            </motion.form>
          )}
        </section>
      </div>
    </div>
  );
}
