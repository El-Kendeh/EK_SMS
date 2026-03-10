import React from 'react';

/* ================================================================
   PRUH Logo Component — uses the official corLogo.svg
   ─────────────────────────────────────────────────────────────────
   Renders the official PRUH brand mark from the SVG asset file.
   Drop-shadow glow + hover scale + entrance animation are applied
   via .pruh-logo / .pruh-logo__icon classes (see App.css).

   Props:
     size      — height of the icon in px (default 44)
     showText  — show "PRUH" wordmark beside icon (default false)
     textColor — wordmark colour (default #fff)
     variant   — 'blue' | 'white' (API compat, ignored — logo has own colours)
   ================================================================ */

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
        <img
          src={process.env.PUBLIC_URL + '/image/corLogo.svg'}
          alt="PRUH logo"
          width={size}
          height={size}
          style={{ display: 'block', borderRadius: '50%' }}
          aria-hidden="true"
        />
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
