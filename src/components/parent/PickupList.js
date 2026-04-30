import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPickupAllowList, addPickup, removePickup } from '../../api/parentApi';
import { useActiveChild } from '../../context/ChildContext';
import QRCode from '../common/QRCode';
import { Skeleton } from '../common/Skeleton';
import './PickupList.css';

const COLORS = ['#5b8cff', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4'];

export default function PickupList() {
  const { children = [] } = useActiveChild();
  const [list, setList] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);
  const [showQrFor, setShowQrFor] = useState(null);

  const [form, setForm] = useState({
    name: '', relationship: 'Other', phone: '',
    expiry: '', children: [], photoColor: COLORS[0],
  });

  const refresh = () => fetchPickupAllowList().then(setList).catch(() => setError('Could not load list.'));
  useEffect(() => { refresh(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    try {
      await addPickup(form);
      setAdding(false);
      setForm({ name: '', relationship: 'Other', phone: '', expiry: '', children: [], photoColor: COLORS[0] });
      refresh();
    } catch { setError('Could not save.'); }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this person from the pickup list?')) return;
    try { await removePickup(id); refresh(); }
    catch { setError('Could not remove.'); }
  };

  const toggleChild = (id) => setForm((f) => ({ ...f, children: f.children.includes(id) ? f.children.filter((x) => x !== id) : [...f.children, id] }));

  return (
    <div className="pkl">
      <header>
        <h2><span className="material-symbols-outlined">directions_walk</span> Pickup allow-list</h2>
        <p>People authorised to collect your child(ren). Each entry generates a QR for the school gate.</p>
      </header>

      {error && <p className="pkl__error">{error}</p>}

      {!list && <Skeleton height={200} radius={14} />}

      {list && (
        <ul className="pkl__list">
          {list.map((p) => {
            const qrUrl = `${window.location.origin}/verify/pickup-${encodeURIComponent(p.id)}`;
            return (
              <motion.li key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <div className="pkl__avatar" style={{ background: p.photoColor || '#5b8cff' }}>
                  {(p.name || '').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="pkl__body">
                  <strong>{p.name}</strong>
                  <span>{p.relationship} · {p.phone}</span>
                  {p.expiry && <small>Expires {new Date(p.expiry).toLocaleDateString()}</small>}
                  <div className="pkl__chips">
                    {p.children.map((cid) => {
                      const c = children.find((x) => x.id === cid);
                      return c ? <span key={cid} className="pkl__chip">{c.fullName.split(' ')[0]}</span> : null;
                    })}
                  </div>
                </div>
                <div className="pkl__actions">
                  <button className="pkl__btn pkl__btn--ghost" onClick={() => setShowQrFor({ ...p, qrUrl })}>
                    <span className="material-symbols-outlined">qr_code_2</span> Gate QR
                  </button>
                  <button className="pkl__btn pkl__btn--remove" onClick={() => remove(p.id)} aria-label="Remove">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      {!adding ? (
        <button className="pkl__add" onClick={() => setAdding(true)}>
          <span className="material-symbols-outlined">person_add</span> Add a person
        </button>
      ) : (
        <form className="pkl__form" onSubmit={submit}>
          <h3>Add to allow-list</h3>
          <label><span>Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label><span>Relationship</span>
            <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
              <option>Mother</option><option>Father</option><option>Aunt</option><option>Uncle</option><option>Grandparent</option><option>Sibling</option><option>School run</option><option>Other</option>
            </select>
          </label>
          <label><span>Phone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label><span>Expiry (optional)</span><input type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} /></label>

          <fieldset>
            <legend>Children allowed</legend>
            {children.map((c) => (
              <label key={c.id} className="pkl__check">
                <input type="checkbox" checked={form.children.includes(c.id)} onChange={() => toggleChild(c.id)} />
                {c.fullName}
              </label>
            ))}
          </fieldset>

          <fieldset className="pkl__colors">
            <legend>Tag colour</legend>
            <div>
              {COLORS.map((c) => (
                <button key={c} type="button" className={form.photoColor === c ? 'is-active' : ''} style={{ background: c }} onClick={() => setForm({ ...form, photoColor: c })} aria-label={`Pick colour ${c}`} />
              ))}
            </div>
          </fieldset>

          <div className="pkl__form-actions">
            <button type="button" className="pkl__btn pkl__btn--ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="pkl__btn">Save</button>
          </div>
        </form>
      )}

      <AnimatePresence>
        {showQrFor && (
          <div className="pkl-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowQrFor(null); }}>
            <motion.div className="pkl-modal" initial={{ scale: 0.92 }} animate={{ scale: 1 }}>
              <h3>{showQrFor.name}</h3>
              <p>Show this QR at the school gate.</p>
              <QRCode value={showQrFor.qrUrl} size={180} />
              <small>{showQrFor.qrUrl}</small>
              <button className="pkl__btn" onClick={() => setShowQrFor(null)} style={{ marginTop: 16 }}>Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
