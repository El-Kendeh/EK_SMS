import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchPermissionSlips, signPermissionSlip } from '../../api/parentApi';
import { useActiveChild } from '../../context/ChildContext';
import { Skeleton } from '../common/Skeleton';
import './PermissionSlips.css';

export default function PermissionSlips() {
  const { children = [] } = useActiveChild();
  const [list, setList] = useState(null);
  const [openSlip, setOpenSlip] = useState(null);
  const [consented, setConsented] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);

  const refresh = () => fetchPermissionSlips().then(setList).catch(() => setError('Could not load slips.'));
  useEffect(() => { refresh(); }, []);

  const sign = async () => {
    if (!openSlip || !consented) return;
    setSigning(true); setError(null);
    try {
      await signPermissionSlip(openSlip.id, { studentId: openSlip.childId });
      setOpenSlip(null); setConsented(false); refresh();
    } catch { setError('Could not sign. Try again.'); }
    finally { setSigning(false); }
  };

  if (!list && !error) return <div className="psl"><Skeleton height={200} radius={14} /></div>;

  return (
    <div className="psl">
      <header>
        <h2><span className="material-symbols-outlined">task</span> Permission slips</h2>
        <p>School-issued consents. Sign in-app — your signature is timestamped and added to the audit trail.</p>
      </header>

      {error && <p className="psl__error">{error}</p>}

      <ul className="psl__list">
        {(list || []).map((s) => {
          const child = children.find((c) => String(c.id) === String(s.childId));
          return (
            <motion.li key={`${s.id}-${s.childId}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`is-${s.status}`}>
              <div className="psl__icon"><span className="material-symbols-outlined">{s.status === 'signed' ? 'task_alt' : 'pending_actions'}</span></div>
              <div className="psl__body">
                <strong>{s.title}</strong>
                <span>For {child?.fullName || 'child'} · issued {new Date(s.issuedAt).toLocaleDateString()}</span>
                {s.dueBy && s.status === 'pending' && <small>Due by {new Date(s.dueBy).toLocaleDateString()}</small>}
                {s.signedAt && <small>Signed {new Date(s.signedAt).toLocaleString()}</small>}
              </div>
              {s.status === 'pending' ? (
                <button className="psl__btn" onClick={() => { setOpenSlip(s); setConsented(false); }}>Open & sign</button>
              ) : (
                <span className="psl__pill">Signed</span>
              )}
            </motion.li>
          );
        })}
        {list && list.length === 0 && <p className="psl__empty">No permission slips.</p>}
      </ul>

      <AnimatePresence>
        {openSlip && (
          <div className="psl-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpenSlip(null); }}>
            <motion.div className="psl-modal" initial={{ scale: 0.94 }} animate={{ scale: 1 }}>
              <header>
                <h3>{openSlip.title}</h3>
                <button onClick={() => setOpenSlip(null)} aria-label="Close"><span className="material-symbols-outlined">close</span></button>
              </header>
              <div className="psl-modal__body">
                <p>{openSlip.body}</p>

                {/* No OTP infrastructure exists yet — an explicit consent tick,
                    timestamped server-side, replaces the fake "code" field. */}
                <label className="psl-modal__consent" style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, cursor: 'pointer' }}>
                  <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} style={{ width: 20, height: 20 }} />
                  <span>
                    I am the parent/guardian of {children.find((c) => String(c.id) === String(openSlip.childId))?.fullName || 'this child'} and I give my consent. My signature is timestamped and audit-logged.
                  </span>
                </label>

                {error && <p className="psl-modal__error">{error}</p>}

                <div className="psl-modal__actions">
                  <button className="psl-modal__btn psl-modal__btn--ghost" onClick={() => setOpenSlip(null)}>Cancel</button>
                  <button className="psl-modal__btn" onClick={sign} disabled={signing || !consented}>
                    {signing ? 'Signing…' : <><span className="material-symbols-outlined">draw</span> I consent</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
