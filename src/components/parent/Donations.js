import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchDonations, donateToCampaign } from '../../api/parentApi';
import { Skeleton } from '../common/Skeleton';
import './Donations.css';

function fmtSll(n) {
  return new Intl.NumberFormat('en-SL', { style: 'currency', currency: 'SLL', maximumFractionDigits: 0 }).format(n);
}

export default function Donations() {
  const [d, setD] = useState(null);
  const [picking, setPicking] = useState(null);
  const [amount, setAmount] = useState(50000);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const refresh = () => fetchDonations().then(setD).catch(() => setError('Could not load campaigns.'));
  useEffect(() => { refresh(); }, []);

  const donate = async () => {
    if (!picking || !amount) return;
    try {
      const r = await donateToCampaign(picking.id, Number(amount));
      setConfirmation(r); setPicking(null); refresh();
    } catch { setError('Donation failed.'); }
  };

  if (!d && !error) return <div className="don"><Skeleton height={300} radius={14} /></div>;
  if (error) return <p className="don__error">{error}</p>;

  return (
    <div className="don">
      <header>
        <h2><span className="material-symbols-outlined">volunteer_activism</span> Sponsor a student</h2>
        <p>Opt-in: contribute toward a uniform, lab equipment, or another student's fees. Contributions are anonymous to recipients.</p>
        {d.totalSponsored > 0 && (
          <small>You've contributed {fmtSll(d.totalSponsored)} so far. Thank you.</small>
        )}
      </header>

      <ul className="don__list">
        {d.campaigns.map((c) => {
          const pct = Math.min(100, Math.round((c.raisedSll / c.goalSll) * 100));
          return (
            <motion.li key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div>
                <strong>{c.name}</strong>
                <span>{fmtSll(c.raisedSll)} of {fmtSll(c.goalSll)} raised · {c.beneficiaries} beneficiaries</span>
                <div className="don__bar">
                  <div className="don__bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <button className="don__btn" onClick={() => setPicking(c)}>Sponsor</button>
            </motion.li>
          );
        })}
      </ul>

      {picking && (
        <div className="don-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPicking(null); }}>
          <motion.div className="don-modal" initial={{ scale: 0.92 }} animate={{ scale: 1 }}>
            <h3>Sponsor: {picking.name}</h3>
            <label>
              <span>Amount (SLL)</span>
              <input type="number" min={10000} step={10000} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <div className="don-modal__actions">
              <button className="don__btn don__btn--ghost" onClick={() => setPicking(null)}>Cancel</button>
              <button className="don__btn" onClick={donate}>Confirm {fmtSll(Number(amount))}</button>
            </div>
          </motion.div>
        </div>
      )}

      {confirmation && (
        <div className="don-modal-overlay" onClick={() => setConfirmation(null)}>
          <motion.div className="don-modal" initial={{ scale: 0.92 }} animate={{ scale: 1 }}>
            <h3>Thank you</h3>
            <p>Your contribution is anonymous to recipients. Keep this receipt for your records:</p>
            <code>{confirmation.receiptHash}</code>
            <button className="don__btn" onClick={() => setConfirmation(null)} style={{ marginTop: 16 }}>Close</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
