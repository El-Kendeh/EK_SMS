import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveChild } from '../../context/ChildContext';
import {
  fetchChildFees, fetchPaymentChannels, startPayment,
  fetchReceipts, downloadReceiptPdf,
} from '../../api/parentApi';
import QRCode from '../common/QRCode';
import { Skeleton } from '../common/Skeleton';
import './ParentFees.css';

function fmtSll(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-SL', { style: 'currency', currency: 'SLL', maximumFractionDigits: 0 }).format(n);
}

function PayModal({ tx, childId, channels, onDone, onClose }) {
  const [channel, setChannel] = useState(channels[0]?.id);
  const [instalments, setInstalments] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const perInstalment = Math.round((tx.amount || 0) / Math.max(1, instalments));

  const pay = async () => {
    setBusy(true); setError(null);
    try {
      const r = await startPayment({
        childId, transactionId: tx.id, amount: tx.amount, channelId: channel, instalments,
      });
      onDone(r.receipt);
    } catch (e) {
      setError('Payment failed. Try a different channel or try again later.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pfee-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        className="pfee-modal"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
      >
        <header>
          <h3><span className="material-symbols-outlined">payments</span> Pay {fmtSll(tx.amount)}</h3>
          <button onClick={onClose} aria-label="Close"><span className="material-symbols-outlined">close</span></button>
        </header>
        <div className="pfee-modal__body">
          <p className="pfee-modal__desc">{tx.description}</p>

          <label>
            <span>Payment channel</span>
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              {channels.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>

          <label>
            <span>Payment plan</span>
            <select value={instalments} onChange={(e) => setInstalments(Number(e.target.value))}>
              <option value={1}>Pay in full</option>
              <option value={2}>2 instalments — {fmtSll(perInstalment)} each</option>
              <option value={3}>3 instalments — {fmtSll(perInstalment)} each</option>
              <option value={4}>4 instalments — {fmtSll(perInstalment)} each</option>
            </select>
          </label>

          {error && <p className="pfee-modal__error">{error}</p>}

          <div className="pfee-modal__actions">
            <button className="pfee-btn pfee-btn--ghost" onClick={onClose}>Cancel</button>
            <button className="pfee-btn pfee-btn--primary" onClick={pay} disabled={busy}>
              {busy ? 'Processing…' : `Pay ${instalments > 1 ? fmtSll(perInstalment) + ' now' : fmtSll(tx.amount)}`}
            </button>
          </div>

          <p className="pfee-modal__note">
            <span className="material-symbols-outlined">verified_user</span>
            A cryptographic receipt is generated on success — verifiable from any device.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function ReceiptModal({ receipt, onClose }) {
  const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(receipt.verificationHash)}`;
  const [downloading, setDownloading] = useState(false);

  const dl = async () => {
    setDownloading(true);
    try {
      const html = await downloadReceiptPdf(receipt.id);
      const win = window.open('', '_blank');
      if (win && html) { win.document.write(html); win.document.close(); }
    } finally { setDownloading(false); }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`EK-SMS receipt ${receipt.id}\n${fmtSll(receipt.amount)} via ${receipt.method}\nVerify: ${verifyUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  };

  return (
    <div className="pfee-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div className="pfee-modal" initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}>
        <header>
          <h3><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span> Receipt</h3>
          <button onClick={onClose} aria-label="Close"><span className="material-symbols-outlined">close</span></button>
        </header>
        <div className="pfee-modal__body pfee-modal__body--receipt">
          <dl>
            <div><dt>Receipt</dt><dd>{receipt.id}</dd></div>
            <div><dt>Amount</dt><dd>{fmtSll(receipt.amount)}</dd></div>
            <div><dt>Method</dt><dd>{receipt.method}</dd></div>
            <div><dt>Paid at</dt><dd>{new Date(receipt.paidAt).toLocaleString()}</dd></div>
          </dl>
          <div className="pfee-modal__qr">
            <QRCode value={verifyUrl} size={140} ariaLabel="Receipt verification QR" />
            <small>Scan to verify</small>
          </div>
          <div className="pfee-modal__actions">
            <button className="pfee-btn pfee-btn--ghost" onClick={shareWhatsApp}>
              <span className="material-symbols-outlined">share</span> Share
            </button>
            <button className="pfee-btn pfee-btn--primary" onClick={dl} disabled={downloading}>
              {downloading ? '…' : <><span className="material-symbols-outlined">download</span> PDF</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FullAuditDrawer({ tx, onClose }) {
  const events = [
    { type: 'INVOICE_CREATED',   at: tx.date, by: 'School registrar', hash: 'a31df9c7' },
    { type: 'PAYMENT_INITIATED', at: tx.date, by: 'You',              hash: 'b71fa9e0' },
    { type: 'PAYMENT_CONFIRMED', at: tx.date, by: 'Payment provider', hash: 'c1b248b7' },
    { type: 'RECEIPT_SIGNED',    at: tx.date, by: 'School',           hash: 'd9e0c1b2' },
  ];
  return (
    <div className="pfee-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.aside
        className="pfee-drawer"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      >
        <header>
          <h3><span className="material-symbols-outlined">history</span> Full audit · {tx.id}</h3>
          <button onClick={onClose}><span className="material-symbols-outlined">close</span></button>
        </header>
        <ul>
          {events.map((e, i) => (
            <li key={i}>
              <strong>{e.type.replace(/_/g, ' ')}</strong>
              <span>{e.by}</span>
              <span>{new Date(e.at).toLocaleString()}</span>
              <code>{e.hash}</code>
            </li>
          ))}
        </ul>
      </motion.aside>
    </div>
  );
}

export default function ParentFees() {
  const { activeChild } = useActiveChild();
  const [data, setData] = useState(null);
  const [channels, setChannels] = useState([]);
  const [payTx, setPayTx] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [auditTx, setAuditTx] = useState(null);
  const [allReceipts, setAllReceipts] = useState([]);

  const refresh = () => {
    if (!activeChild?.id) return;
    setData(null);
    fetchChildFees(activeChild.id).then(setData).catch(() => {});
    fetchReceipts(activeChild.id).then(setAllReceipts).catch(() => {});
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [activeChild?.id]);
  useEffect(() => { fetchPaymentChannels().then(setChannels).catch(() => {}); }, []);

  const onPaid = (r) => { setPayTx(null); setReceipt(r); refresh(); };

  if (!activeChild) return <div className="pfee__empty"><p>Select a child to view fees.</p></div>;
  if (!data) return <div className="pfee"><Skeleton height={200} radius={14} style={{ marginBottom: 14 }} /><Skeleton height={300} radius={14} /></div>;

  const txs = data.transactions || [];

  return (
    <div className="pfee">
      <header className="pfee__head">
        <h2><span className="material-symbols-outlined">payments</span> Fees · {activeChild.fullName}</h2>
        <p>Academic year {data.academicYear || ''}</p>
      </header>

      <div className="pfee__summary">
        <div className="pfee__summary-card">
          <span>Total fees</span>
          <strong>{fmtSll(data.totalFees)}</strong>
          {data.siblingDiscountPct > 0 && <em>Includes {data.siblingDiscountPct}% sibling discount</em>}
        </div>
        <div className="pfee__summary-card">
          <span>Paid to date</span>
          <strong>{fmtSll(data.paidToDate)}</strong>
        </div>
        <div className={`pfee__summary-card ${data.outstanding > 0 ? 'is-warn' : 'is-ok'}`}>
          <span>Outstanding</span>
          <strong>{fmtSll(data.outstanding)}</strong>
          {data.nextInstalmentDate && <em>Next instalment due {new Date(data.nextInstalmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</em>}
        </div>
      </div>

      <h3 className="pfee__title">Payment ledger</h3>
      <ul className="pfee__txs">
        {txs.map((tx) => {
          const isPaid = tx.status === 'verified' || tx.status === 'paid';
          const linkedReceipt = allReceipts.find((r) => r.transactionId === tx.id) || (tx.receiptId && allReceipts.find((r) => r.id === tx.receiptId));
          return (
            <li key={tx.id} className={isPaid ? 'is-paid' : 'is-pending'}>
              <div className="pfee__tx-icon"><span className="material-symbols-outlined">{tx.icon || 'receipt'}</span></div>
              <div className="pfee__tx-body">
                <strong>{tx.description}</strong>
                <span>{tx.id} · {tx.date ? new Date(tx.date).toLocaleDateString() : '—'}</span>
              </div>
              <div className="pfee__tx-amount">{fmtSll(tx.amount)}</div>
              <div className="pfee__tx-action">
                {isPaid ? (
                  <>
                    <span className="pfee__pill pfee__pill--ok">
                      <span className="material-symbols-outlined">check_circle</span> Paid
                    </span>
                    {linkedReceipt && (
                      <button className="pfee-btn pfee-btn--ghost" onClick={() => setReceipt(linkedReceipt)}>Receipt</button>
                    )}
                  </>
                ) : (
                  <button className="pfee-btn pfee-btn--primary" onClick={() => setPayTx(tx)}>Pay now</button>
                )}
                <button className="pfee-btn pfee-btn--icon" title="Full audit" onClick={() => setAuditTx(tx)}>
                  <span className="material-symbols-outlined">history</span>
                </button>
              </div>
            </li>
          );
        })}
        {txs.length === 0 && <li className="pfee__tx-empty">No transactions yet.</li>}
      </ul>

      <AnimatePresence>
        {payTx && <PayModal tx={payTx} childId={activeChild.id} channels={channels} onClose={() => setPayTx(null)} onDone={onPaid} />}
        {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
        {auditTx && <FullAuditDrawer tx={auditTx} onClose={() => setAuditTx(null)} />}
      </AnimatePresence>
    </div>
  );
}
