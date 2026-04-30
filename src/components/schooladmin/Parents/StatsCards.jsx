import React from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

function Card({ icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="ska-card ska-card-pad" style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic name={icon} style={{ color: iconColor, fontSize: 22 }} />
        </div>
      </div>
      <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--ska-text)', fontFamily: 'var(--ska-font-headline)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ska-text)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function StatsCards({ parents, loading }) {
  const total          = parents.length;
  const linkedStudents = parents.reduce((s, p) => s + (p.children?.length || 0), 0);
  const active         = parents.filter(p => p.isActive).length;
  const unlinked       = parents.filter(p => (p.children?.length || 0) === 0).length;
  const linked         = total - unlinked;
  const linkedPct      = total ? Math.round((linked / total) * 100) : 0;
  const v              = (n) => (loading ? '…' : n);

  return (
    <>
      <div className="ska-stat-grid-4">
        <Card icon="family_restroom" iconBg="var(--ska-primary-dim)"   iconColor="var(--ska-primary)"   label="Total Parents"     value={v(total)}          sub="Registered guardians" />
        <Card icon="group"           iconBg="var(--ska-secondary-dim)" iconColor="var(--ska-secondary)" label="Linked Students"   value={v(linkedStudents)} sub="Across all parents" />
        <Card icon="bolt"            iconBg="var(--ska-green-dim)"     iconColor="var(--ska-green)"     label="Active Parents"    value={v(active)}         sub="Active in last 14 days" />
        <Card icon="link_off"        iconBg="var(--ska-error-dim)"     iconColor="var(--ska-error)"     label="Unlinked Parents"  value={v(unlinked)}       sub="No children linked" />
      </div>

      {!loading && total > 0 && (
        <div className="ska-prnt-insight">
          <span style={{ fontSize: 18 }} role="img" aria-label="family">👨‍👩‍👧</span>
          <span><strong>{linkedPct}%</strong> of parents linked to students &middot; <strong>{active}</strong> active this fortnight</span>
        </div>
      )}
    </>
  );
}
