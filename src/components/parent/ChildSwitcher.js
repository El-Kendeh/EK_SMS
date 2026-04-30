import { useActiveChild } from '../../context/ChildContext';
import { getChildColors } from '../../utils/parentUtils';
import './ChildSwitcher.css';

// Compact pill row of all linked children + an "All" pill (optional).
// Always visible in the header so a parent can switch context from any page.
export default function ChildSwitcher({ allowAll = false, compact = false }) {
  const { children = [], activeChildId, setActiveChildId } = useActiveChild();

  if (children.length === 0) return null;
  if (children.length === 1 && !allowAll) {
    // Solo child — show name only, no switcher
    const c = children[0];
    return <div className={`pcs ${compact ? 'pcs--compact' : ''}`}><span className="pcs__solo">{c.fullName}</span></div>;
  }

  return (
    <div className={`pcs ${compact ? 'pcs--compact' : ''}`} role="tablist" aria-label="Switch active child">
      {allowAll && (
        <button
          role="tab"
          className={`pcs__pill ${!activeChildId ? 'is-active' : ''}`}
          onClick={() => setActiveChildId(null)}
          aria-selected={!activeChildId}
        >
          <span className="material-symbols-outlined">groups</span>
          All
        </button>
      )}
      {children.map((c, idx) => {
        const colors = getChildColors(c.colorIndex ?? idx);
        const isActive = String(activeChildId) === String(c.id);
        const initials = (c.fullName || '').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
        return (
          <button
            key={c.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveChildId(c.id)}
            className={`pcs__pill ${isActive ? 'is-active' : ''}`}
            title={c.fullName}
          >
            <span className="pcs__avatar" style={{ background: colors?.bg || '#5b8cff' }}>{initials}</span>
            <span className="pcs__name">{(c.fullName || '').split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
