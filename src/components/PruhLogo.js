import React from 'react';

/* ================================================================
   PRUH Logo Component
   ─────────────────────────────────────────────────────────────────
   Renders the official PRUH logo mark — a circle badge with a
   stylised lowercase "p" (with graduation cap) inside.

   Props:
     size      — height/width of the circle mark in px (default 44)
     showText  — also render the "PRUH" wordmark beside the mark
     textColor — CSS colour for the "PRUH" text (default brand blue)
     variant   — 'blue' (default) | 'white'
                   'blue'  → blue circle + white p  (light backgrounds)
                   'white' → white circle + blue p  (dark backgrounds)
   ================================================================ */

const BRAND_BLUE = '#1B3FAF';

export default function PruhLogo({
  size      = 44,
  showText  = false,
  textColor = BRAND_BLUE,
  variant   = 'blue',
  style     = {},
  className = '',
}) {
  const circleColor = variant === 'white' ? '#ffffff' : BRAND_BLUE;
  const pColor      = variant === 'white' ? BRAND_BLUE : '#ffffff';

  return (
    <div
      className={className || undefined}
      style={{
        display:    'inline-flex',
        alignItems: 'center',
        gap:        Math.round(size * 0.28),
        ...style,
      }}
      aria-label="PRUH logo"
    >
      {/* ── Logo mark ── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        {/* Circle badge */}
        <circle cx="50" cy="50" r="48" fill={circleColor} />

        {/* p — vertical stem */}
        <rect x="27" y="23" width="12" height="52" rx="3" fill={pColor} />

        {/* p — bowl outer ring */}
        <circle cx="51" cy="44" r="17" fill={pColor} />

        {/* p — bowl inner cutout (creates open counter) */}
        <circle cx="51" cy="44" r="9" fill={circleColor} />

        {/* Graduation cap — small tilted mortarboard at top of stem */}
        <rect
          x="22"
          y="14"
          width="22"
          height="9"
          rx="2.5"
          fill={pColor}
          transform="rotate(-25, 33, 18.5)"
        />
      </svg>

      {/* ── PRUH wordmark ── */}
      {showText && (
        <span
          style={{
            fontFamily:    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize:      Math.round(size * 0.62),
            fontWeight:    800,
            letterSpacing: '-0.03em',
            color:         textColor,
            lineHeight:    1,
            userSelect:    'none',
          }}
          aria-hidden="true"
        >
          PRUH
        </span>
      )}
    </div>
  );
}
