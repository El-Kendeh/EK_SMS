import './Skeleton.css';

export function Skeleton({ width = '100%', height = 16, radius = 6, style, className }) {
  return (
    <div
      className={`ek-skel ${className || ''}`}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonRow({ count = 3, gap = 10, height = 16, widths }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} width={widths?.[i] || (i % 2 ? '70%' : '90%')} />
      ))}
    </div>
  );
}

export function SkeletonCard({ height = 120 }) {
  return (
    <div className="ek-skel-card" style={{ height }}>
      <Skeleton height={20} width="40%" />
      <Skeleton height={36} width="65%" style={{ marginTop: 14 }} />
      <Skeleton height={14} width="50%" style={{ marginTop: 12 }} />
    </div>
  );
}
