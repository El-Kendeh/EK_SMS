import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { teacherApi } from '../../api/teacherApi';
import { useTeacher } from '../../context/TeacherContext';
import { Skeleton } from '../common/Skeleton';
import './SubstituteMode.css';

const SCOPES = [
  { id: 'attendance',     label: 'Attendance only' },
  { id: 'attendance+plan',label: 'Attendance + lesson plan' },
  { id: 'full',           label: 'Full read access' },
];

export default function SubstituteMode() {
  const { selectedClass } = useTeacher();
  const [tokens, setTokens] = useState(null);
  const [adding, setAdding] = useState(false);
  const [issued, setIssued] = useState(null);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ classId: selectedClass?.id || '', hours: 4, scope: 'attendance' });

  const refresh = () => teacherApi.listSubstituteTokens().then(setTokens).catch(() => setError('Could not load tokens.'));
  useEffect(() => { refresh(); }, []);

  const issue = async (e) => {
    e.preventDefault();
    if (!form.classId) return;
    try {
      const t = await teacherApi.issueSubstituteToken(form);
      setIssued(t);
      setAdding(false);
      refresh();
    } catch { setError('Could not issue token.'); }
  };

  const revoke = async (token) => {
    if (!window.confirm('Revoke this token? The substitute will lose access immediately.')) return;
    try { await teacherApi.revokeSubstituteToken(token); refresh(); }
    catch { setError('Could not revoke.'); }
  };

  return (
    <div className="sub">
      <header>
        <h2><span className="material-symbols-outlined">key</span> Substitute mode</h2>
        <p>Give a colleague time-bound access for a specific class. Auto-revokes when expired. Every action they take is logged under your name with a "(substitute)" tag.</p>
      </header>

      {error && <p className="sub__error">{error}</p>}

      {!adding ? (
        <button className="sub__add" onClick={() => setAdding(true)}>
          <span className="material-symbols-outlined">add</span> Issue token
        </button>
      ) : (
        <motion.form className="sub__form" onSubmit={issue} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h3>Issue a substitute token</h3>
          <label><span>Class ID</span><input value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required /></label>
          <label><span>Hours valid</span><input type="number" min={1} max={48} value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} /></label>
          <label><span>Scope</span>
            <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
              {SCOPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <div className="sub__form-actions">
            <button type="button" className="sub__btn sub__btn--ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="sub__btn sub__btn--primary">Issue</button>
          </div>
        </motion.form>
      )}

      <AnimatePresence>
        {issued && (
          <motion.div className="sub__issued" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h4><span className="material-symbols-outlined">check_circle</span> Token ready</h4>
            <p>Share this token with your substitute. They sign in with their own account, then redeem it for delegated access.</p>
            <code>{issued.token}</code>
            <small>Expires {new Date(issued.expiresAt).toLocaleString()}</small>
            <button onClick={() => setIssued(null)} className="sub__btn sub__btn--ghost">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      <h3 className="sub__title">Active tokens</h3>
      {!tokens && <Skeleton height={120} radius={10} />}
      {tokens && tokens.length === 0 && <p className="sub__empty">No active substitute tokens.</p>}
      <ul className="sub__list">
        {(tokens || []).map((t) => (
          <li key={t.token}>
            <div>
              <strong>{t.classId}</strong>
              <span>Scope: {t.scope} · expires {new Date(t.expiresAt).toLocaleString()}</span>
            </div>
            <button className="sub__btn sub__btn--danger" onClick={() => revoke(t.token)}>
              <span className="material-symbols-outlined">block</span> Revoke
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
