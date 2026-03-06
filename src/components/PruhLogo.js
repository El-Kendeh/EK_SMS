import React from 'react';

/* ================================================================
   PRUH Logo Component — SVG, transparent background
   ─────────────────────────────────────────────────────────────────
   Renders the official PRUH brand mark as inline SVG so the blue
   square background is gone entirely. The white circle icon + blue
   "p" + mortarboard + optional "PRUH" wordmark float cleanly on any
   dark surface.

   Drop-shadow glow + hover scale + entrance animation are applied
   via .pruh-logo / .pruh-logo__icon classes (see App.css).

   Props:
     size      — height of the icon in px (default 44)
     showText  — show "PRUH" wordmark beside icon (default false)
     textColor — wordmark colour (default #fff)
     variant   — 'blue' | 'white' (API compat, both render the same)
   ================================================================ */

const BLUE = '#1B3FAF';

/* ── Inner SVG icon mark (white circle + blue p + mortarboard) ── */
function PruhIconSvg({ size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ── Outer white circle ── */}
      <circle cx="40" cy="40" r="38" fill="white" />

      {/* ── p stem ── */}
      <rect x="15" y="21" width="11" height="49" rx="5.5" fill={BLUE} />

      {/* ── Bridge: fills the gap between stem and bowl ── */}
      <rect x="15" y="27" width="28" height="22" fill={BLUE} />

      {/* ── p bowl outer ── */}
      <circle cx="43" cy="38" r="17" fill={BLUE} />

      {/* ── p bowl inner cutout (re-drawn after bridge) ── */}
      <circle cx="43" cy="38" r="9.5" fill="white" />

      {/* ── Graduation cap: brim ── */}
      <rect x="7" y="14" width="36" height="7" rx="2.5" fill={BLUE} />

      {/* ── Graduation cap: crown ── */}
      <rect x="12" y="6" width="22" height="9" rx="3" fill={BLUE} />

      {/* ── Graduation cap: tassel button ── */}
      <rect x="30" y="4" width="5" height="5" rx="1.5" fill={BLUE} />
    </svg>
  );
}

export default function PruhLogo({
  size      = 44,
  showText  = false,
  textColor = '#ffffff',
  variant   = 'blue',   // API compat
  style     = {},
  className = '',
}) {
  const gap      = Math.max(6, Math.round(size * 0.28));
  const textSize = Math.round(size * 0.78);

  return (
    <div
      className={`pruh-logo${className ? ` ${className}` : ''}`}
      aria-label="PRUH"
      style={{ display: 'inline-flex', alignItems: 'center', gap: `${gap}px`, ...style }}
    >
      {/* Icon with entrance animation + glow (see App.css) */}
      <div className="pruh-logo__icon">
        <PruhIconSvg size={size} />
      </div>

      {/* Wordmark */}
      {showText && (
        <span
          className="pruh-logo__text"
          style={{
            color:       textColor,
            fontWeight:  800,
            fontSize:    `${textSize}px`,
            letterSpacing: '-0.02em',
            lineHeight:  1,
            fontFamily:  "'Lexend', 'Inter', system-ui, -apple-system, sans-serif",
          }}
        >
          PRUH
        </span>
      )}
    </div>
  );
}
