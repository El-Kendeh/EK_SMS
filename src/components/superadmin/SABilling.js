import React, { useState } from 'react';

/* ================================================================
   SABilling — Billing & Subscriptions (operator console)

   SCAFFOLD: this surfaces the planned structure of the platform's
   billing console (the vendor side — schools paying the platform,
   distinct from school fees where parents pay a school). The billing
   backend is NOT connected yet, so every tab shows an honest
   "backend pending" state — NO fabricated MRR/invoices/payments.

   When the backend lands, each tab's empty state is replaced by its
   real table/forms; the structure + nav placement already exist.
   ================================================================ */

const TABS = [
  { id: 'plans',        label: 'Plans' },
  { id: 'invoices',     label: 'Invoices' },
  { id: 'payments',     label: 'Payments' },
  { id: 'entitlements', label: 'Entitlements' },
];

const Ic = {
  plans: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 4v16"/></svg>,
  invoices: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>,
  payments: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  entitlements: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
};

const TAB_COPY = {
  plans: {
    title: 'Subscription Plans',
    desc: 'Define the tiers a school can subscribe to — name, monthly/annual price, student caps, and which modules each tier unlocks (Starter · Standard · Premium).',
    cta: 'New Plan',
  },
  invoices: {
    title: 'Invoices',
    desc: 'Per-school invoices generated each billing cycle, with status (draft · sent · paid · overdue), line items, and PDF download. Auto-dunning for missed payments.',
    cta: 'Create Invoice',
  },
  payments: {
    title: 'Payments',
    desc: 'Record and reconcile payments schools make to the platform — mobile money (Orange Money / Africell Money), bank transfer, or card — and track MRR over time.',
    cta: 'Record Payment',
  },
  entitlements: {
    title: 'Module Entitlements',
    desc: "Toggle which modules each school's plan unlocks (feature flags). This is how the phased roadmap ships per tenant — flip a module on for one school without a deploy.",
    cta: 'Configure Entitlements',
  },
};

export default function SABilling() {
  const [tab, setTab] = useState('plans');
  const copy = TAB_COPY[tab];

  return (
    <div>
      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">Billing &amp; Subscriptions</h1>
          <p className="sa-page-sub">Plans, invoices, payments &amp; per-school entitlements for the platform.</p>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, fontSize: '0.6875rem', fontWeight: 700, color: 'var(--sa-amber)', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sa-amber)' }} />
          Backend pending
        </span>
      </div>

      {/* Honest status banner — no fabricated figures */}
      <div className="sa-info-callout" style={{ marginBottom: 16 }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p>
          This console’s structure is in place, but the billing backend isn’t connected yet — so no live data is shown.
          Plans, invoices, payments and entitlements will populate here once the billing service and a payment provider
          (Orange/Africell mobile money or card) are configured.
        </p>
      </div>

      {/* Tabs */}
      <div className="sa-settings-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`sa-settings-tab${tab === t.id ? ' sa-settings-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab body — planned-structure empty state */}
      <div className="sa-settings-body">
        <div className="sa-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 16, background: 'var(--sa-accent-dim)', color: 'var(--sa-accent)', marginBottom: 16 }}>
            {Ic[tab]}
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--sa-text)', margin: '0 0 8px' }}>{copy.title}</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--sa-text-2)', lineHeight: 1.6, maxWidth: 520, margin: '0 auto 20px' }}>{copy.desc}</p>
          <button
            className="sa-btn sa-btn--primary"
            disabled
            title="Available once the billing backend is connected"
            style={{ opacity: 0.55, cursor: 'not-allowed' }}
          >
            {copy.cta}
          </button>
          <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-3)', marginTop: 12 }}>
            Awaiting billing backend — no records yet.
          </p>
        </div>
      </div>
    </div>
  );
}
