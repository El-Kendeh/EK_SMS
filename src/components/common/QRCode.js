import { useMemo } from 'react';
import { encodeQR } from '../../utils/qr';

// Renders a real, scannable QR code as inline SVG. Falls back to a
// placeholder integrity glyph if encoding fails (e.g. data too long).
export default function QRCode({ value, size = 128, fgColor = '#0a1628', bgColor = '#ffffff', quietZone = 4, ariaLabel }) {
  const matrix = useMemo(() => {
    if (!value) return null;
    try { return encodeQR(value); } catch { return null; }
  }, [value]);

  if (!matrix) {
    return (
      <div
        style={{ width: size, height: size, background: bgColor, display: 'grid', placeItems: 'center', borderRadius: 6 }}
        role="img"
        aria-label={ariaLabel || 'Verification glyph'}
      >
        <span style={{ fontSize: 11, color: fgColor, textAlign: 'center', padding: 6 }}>QR data too long</span>
      </div>
    );
  }

  const n = matrix.length;
  const totalCells = n + quietZone * 2;
  const cell = size / totalCells;
  const rects = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={(c + quietZone) * cell}
            y={(r + quietZone) * cell}
            width={cell}
            height={cell}
            fill={fgColor}
          />
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={ariaLabel || `QR code for ${value.slice(0, 40)}`}
      style={{ display: 'block', borderRadius: 6 }}
    >
      <rect width={size} height={size} fill={bgColor} />
      {rects}
    </svg>
  );
}
