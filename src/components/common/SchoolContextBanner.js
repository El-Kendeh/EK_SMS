import { useSchoolContext } from '../../hooks/useSchoolContext';

const POSITION_META = {
  prefit: { label: 'START', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: 'play_circle' },
  mid:    { label: 'MID',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'pending' },
  end:    { label: 'END',   color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  icon: 'flag' },
};

export default function SchoolContextBanner({ variant = 'inline' }) {
  const { academicYear, term, loading } = useSchoolContext();

  if (loading) {
    return (
      <div className="school-context-banner" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: variant === 'compact' ? '4px 10px' : '8px 16px',
        background: 'var(--surface-low, #f5f5f5)', borderRadius: 8,
        fontSize: variant === 'compact' ? 12 : 13,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>sync</span>
        Loading...
      </div>
    );
  }

  if (!term && !academicYear) {
    return (
      <div className="school-context-banner" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: variant === 'compact' ? '4px 10px' : '8px 16px',
        background: 'rgba(239,68,68,0.08)', borderRadius: 8,
        fontSize: variant === 'compact' ? 12 : 13, color: '#EF4444',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>
        No active term configured
      </div>
    );
  }

  const pos = POSITION_META[term?.position] || POSITION_META.mid;

  if (variant === 'compact') {
    return (
      <div className="school-context-banner" style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          {academicYear?.name || ''}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
          background: pos.bg, color: pos.color,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>{pos.icon}</span>
          {term?.name || 'No Term'} · {pos.label}
        </span>
      </div>
    );
  }

  return (
    <div className="school-context-banner" style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px',
      background: 'linear-gradient(135deg, rgba(27,63,175,0.06), rgba(14,165,233,0.06))',
      borderRadius: 10, border: '1px solid rgba(27,63,175,0.1)',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#1B3FAF' }}>calendar_month</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1B3FAF' }}>
          {academicYear?.name || 'Academic Year'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)' }}>
          {term?.name || 'No active term'}
        </div>
      </div>
      <div style={{ marginLeft: 'auto' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700,
          background: pos.bg, color: pos.color,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>{pos.icon}</span>
          {pos.label}
        </span>
      </div>
    </div>
  );
}
