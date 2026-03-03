import React from 'react';

/* ================================================================
   PRUH Logo Component
   ─────────────────────────────────────────────────────────────────
   Renders the official PRUH brand image.

   Props:
     size      — height of the logo image in px (default 44)
     showText  — kept for API compat; image already includes wordmark
     textColor — kept for API compat (unused)
     variant   — 'blue' | 'white' (kept for API compat)
                   Both always render icon.jpeg (white logo on blue bg)
                   which works cleanly on the app's dark glassmorphism theme.
   ================================================================ */

export default function PruhLogo({
  size      = 44,
  showText  = false,   // kept for API compat — image includes wordmark
  textColor,           // kept for API compat
  variant   = 'blue',
  style     = {},
  className = '',
}) {
  // Both variants in this dark-themed app render on dark backgrounds,
  // so always use icon.jpeg (white logo on blue bg) — it reads cleanly
  // on any dark surface. logo.jpeg (blue on white) is reserved for light theme.
  const src = '/icon.jpeg';

  return (
    <div
      className={className || undefined}
      style={{ display: 'inline-flex', alignItems: 'center', ...style }}
      aria-label="PRUH"
    >
      <img
        src={src}
        alt="PRUH"
        style={{
          height:       size,
          width:        size,
          display:      'block',
          objectFit:    'contain',
          borderRadius: Math.round(size * 0.15) + 'px',
        }}
      />
    </div>
  );
}
