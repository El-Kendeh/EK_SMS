import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchCoGuardians, inviteCoGuardian, removeCoGuardian } from '../../api/parentApi';
import { useActiveChild } from '../../context/ChildContext';
import { Skeleton } from '../common/Skeleton';
import './CoGuardians.css';

function fmtTime(iso) {
  if (!iso) return 'Never logged in';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff/60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff/3_600_000)}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function CoGuardians() {
  const { children = [] } = useActiveChild();
  const [list, setList] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  // form
  const [form, setForm] = useState({ name: '', email: '', relationship: 'Father', children: [] });

  const refresh = () => fetchCoGuardians().then(setList).catch(() => setError('Could not load co-guardians.'));
  useEffect(() => { refresh(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    try {
      await inviteCoGuardian(form);
      setAdding(false); setForm({ name: '', email: '', relationship: 'Father', children: [] });
      refresh();
    } catch { setError('Could not send invite.'); }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this co-guardian? They will lose access to all linked children.')) return;
    try { await removeCoGuardian(id); refresh(); }
    catch { setError('Could not remove.'); }
  };

  const toggleChild = (id) => setForm((f) => ({
    ...f,
    children: f.children.includes(id) ? f.children.filter((x) => x !== id) : [...f.children, id],
  }));

  return (
    <div className="cog">
      <header>
        <h2><span className="material-symbols-outlined">family_restroom</span> Co-guardians</h2>
        <p>Other adults linked to your child(ren). Each guardian sees the same records — encouraging accountability between you.</p>
      </header>

      {error && <p className="cog__error">{error}</p>}

      {!list && <Skeleton height={200} radius={14} />}

      {list && (
        <ul className="cog__list">
          {list.map((g) => (
            <motion.li key={g.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div className="cog__avatar">{(g.name || '').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}</div>
              <div className="cog__body">
                <strong>{g.name} {g.primary && <em>· primary</em>}</strong>
                <span>{g.relationship} · {g.email}</span>
                <small>Last login: {fmtTime(g.lastLogin)}</small>
                <div className="cog__chips">
                  {g.children.map((cid) => {
                    const c = children.find((x) => x.id === cid);
                    return c ? <span key={cid} className="cog__chip">{c.fullName.split(' ')[0]}</span> : null;
                  })}
                </div>
              </div>
              {!g.primary && (
                <button className="cog__remove" onClick={() => remove(g.id)} aria-label="Remove">
                  <span className="material-symbols-outlined">person_remove</span>
                </button>
              )}
            </motion.li>
          ))}
        </ul>
      )}

      {!adding ? (
        <button className="cog__add" onClick={() => setAdding(true)}>
          <span className="material-symbols-outlined">person_add</span> Invite a co-guardian
        </button>
      ) : (
        <form className="cog__form" onSubmit={submit}>
          <h3>Invite</h3>
          <label><span>Full name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label><span>Relationship</span>
            <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
              <option>Father</option><option>Mother</option><option>Guardian</option><option>Aunt</option><option>Uncle</option><option>Grandparent</option><option>Other</option>
            </select>
          </label>
          <fieldset>
            <legend>Children to link</legend>
            {children.map((c) => (
              <label key={c.id} className="cog__check">
                <input type="checkbox" checked={form.children.includes(c.id)} onChange={() => toggleChild(c.id)} />
                {c.fullName}
              </label>
            ))}
          </fieldset>
          <div className="cog__form-actions">
            <button type="button" className="cog__btn cog__btn--ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="cog__btn">Send invite</button>
          </div>
        </form>
      )}
    </div>
  );
}
