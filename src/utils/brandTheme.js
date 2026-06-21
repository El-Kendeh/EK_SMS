/**
 * brandTheme.js — per-school dynamic theming.
 *
 * A school registers with one or more brand colours + a badge. This module turns
 * those colours into a cohesive, legible accent ("blend") and injects it as CSS
 * variables onto <html> so EVERY role dashboard (school admin, teacher, student,
 * parent, principal, bursar) themes to the school's colour at runtime.
 *
 * Each role dashboard owns its own colour-variable namespace
 *   - school admin / principal / bursar : --ska-*
 *   - teacher                           : --tch-*
 *   - student                           : --student-*
 *   - parent                            : --par-*
 * so we override the primary/accent token in every namespace from a single
 * derived ramp. Variables are set as INLINE styles on document.documentElement,
 * which beats both `:root {}` and `[data-theme="dark"] {}` stylesheet rules.
 *
 * The platform owner (superadmin, --sa-*) is intentionally NOT re-themed.
 */

/* ── Named-colour fallback (matches the Register/Settings palette) ───────────── */
const COLOR_NAMES = {
  'dark red': '#C00000', red: '#FF0000', orange: '#FF6600', gold: '#FFD700',
  yellow: '#FFFF00', 'lime green': '#92D050', green: '#00B050', 'sky blue': '#00B0F0',
  blue: '#0070C0', 'royal blue': '#1B3FAF', purple: '#7030A0', black: '#000000',
  white: '#FFFFFF', navy: '#001F5B', teal: '#008080', cyan: '#00B0F0',
  maroon: '#800000', crimson: '#DC143C', indigo: '#4B0082', violet: '#7C3AED',
  magenta: '#C026D3', pink: '#EC4899', brown: '#92400E', grey: '#6B7280',
  gray: '#6B7280', silver: '#C0C0C0', emerald: '#10B981', amber: '#F59E0B',
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/* ── hex normalisation ───────────────────────────────────────────────────────── */
function normalizeHex(input) {
  if (!input) return null;
  let s = String(input).trim();
  while (s.startsWith('#')) s = s.slice(1);
  if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split('').map((c) => c + c).join('');
  if (/^[0-9a-fA-F]{6}$/.test(s)) return '#' + s.toLowerCase();
  return null;
}

function toHex(token) {
  if (!token) return null;
  const direct = normalizeHex(token);
  if (direct) return direct;
  const named = COLOR_NAMES[String(token).trim().toLowerCase()];
  return named ? named.toLowerCase() : null;
}

/**
 * Parse the stored `brand_colors` value into an ordered, de-duplicated hex list.
 * Accepts a JSON array string, a comma/space separated list, a plain array, or
 * colour names — whatever shape Register / Settings happened to persist.
 */
export function parseBrandColors(raw) {
  if (!raw) return [];
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else {
    const s = String(raw).trim();
    if (s.startsWith('[')) {
      try { const parsed = JSON.parse(s); if (Array.isArray(parsed)) list = parsed; } catch (_) { /* not JSON */ }
    }
    if (!list.length) list = s.split(/[,;|\n]+/);
  }
  const out = [];
  for (const item of list) {
    const hex = toHex(item);
    if (hex && !out.includes(hex)) out.push(hex);
  }
  return out;
}

/* ── colour-space conversions ────────────────────────────────────────────────── */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function rgbToHex({ r, g, b }) {
  const f = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return '#' + f(r) + f(g) + f(b);
}
function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}
function hslToRgb({ h, s, l }) {
  h /= 360;
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return { r: hue2rgb(p, q, h + 1 / 3) * 255, g: hue2rgb(p, q, h) * 255, b: hue2rgb(p, q, h - 1 / 3) * 255 };
}
const hexToHsl = (hex) => rgbToHsl(hexToRgb(hex));
const hslToHex = (hsl) => rgbToHex(hslToRgb(hsl));

/* ── helpers ─────────────────────────────────────────────────────────────────── */
/** WCAG relative luminance (0 = black, 1 = white). */
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
/** Readable text colour to sit on top of a filled `hex`. */
const onColor = (hex) => (luminance(hex) > 0.42 ? '#0a1020' : '#ffffff');
const withL = (hex, l) => hslToHex({ ...hexToHsl(hex), l: clamp(l, 0, 1) });
function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

/** Blend (average) several hexes into one — the literal "blend" of the picks. */
function blendHexes(hexes) {
  if (!hexes.length) return null;
  if (hexes.length === 1) return hexes[0];
  const sum = hexes.reduce((a, hex) => {
    const { r, g, b } = hexToRgb(hex);
    return { r: a.r + r, g: a.g + g, b: a.b + b };
  }, { r: 0, g: 0, b: 0 });
  const n = hexes.length;
  return rgbToHex({ r: sum.r / n, g: sum.g / n, b: sum.b / n });
}

/**
 * Derive a full theme from the school's chosen colours.
 * Returns null when no usable colour can be parsed (caller keeps defaults).
 */
export function deriveBrandTheme(colorsInput) {
  const colors = Array.isArray(colorsInput) && colorsInput.every((c) => /^#/.test(String(c)))
    ? colorsInput
    : parseBrandColors(colorsInput);
  if (!colors.length) return null;

  const base = blendHexes(colors);
  const baseHsl = hexToHsl(base);

  // Give nearly-grey picks a touch of life so the UI isn't flat (skip true greys).
  const sat = baseHsl.s < 0.08 ? baseHsl.s : clamp(baseHsl.s, 0.35, 1);
  const tuned = { ...baseHsl, s: sat };
  const tunedHex = hslToHex(tuned);

  // Secondary: the 2nd pick if any, else a hue-shifted sibling — used for gradients.
  const secondary = colors[1] || hslToHex({ ...tuned, h: (tuned.h + 22) % 360, l: clamp(tuned.l + 0.06, 0, 1) });
  const secHsl = hexToHsl(secondary);

  // Accent for text / icons / active states — must read on dark surfaces.
  const accent = withL(tunedHex, clamp(Math.max(tuned.l, 0.62), 0.55, 0.80));
  // Container / button fill — vivid mid tone, paired with a contrast-safe on-colour.
  const container = withL(tunedHex, clamp(tuned.l < 0.5 ? tuned.l + 0.10 : tuned.l, 0.42, 0.66));
  const containerOn = onColor(container);
  // Darker shade for *-primary-dark tokens.
  const dark = withL(tunedHex, clamp(tuned.l - 0.24, 0.12, 0.42));
  // Subtle translucent tint for *-dim / *-light backgrounds.
  const dim = rgba(accent, 0.14);

  const secondaryAccent = withL(secondary, clamp(Math.max(secHsl.l, 0.62), 0.55, 0.80));

  return {
    colors, base, accent, container, containerOn, dark, dim,
    secondary, secondaryAccent,
    secondaryDim: rgba(secondaryAccent, 0.14),
    gradient: `linear-gradient(135deg, ${container} 0%, ${secondary} 100%)`,
  };
}

/* Every variable we touch — kept in one place so clear() is exhaustive. */
const MANAGED_VARS = [
  '--brand-primary', '--brand-secondary', '--brand-container', '--brand-on-primary', '--brand-gradient',
  '--ska-primary', '--ska-primary-dim', '--ska-primary-container', '--ska-on-primary',
  '--ska-secondary', '--ska-secondary-dim',
  '--tch-primary', '--tch-primary-dark', '--tch-primary-light',
  '--student-primary', '--student-primary-dark', '--student-primary-dim',
  '--par-primary', '--par-primary-dark', '--par-primary-light',
];

/** Inject the derived theme as inline CSS variables on <html>. */
export function applyBrandTheme(theme) {
  if (!theme || typeof document === 'undefined') return;
  const root = document.documentElement;
  const set = (k, v) => root.style.setProperty(k, v);

  // Generic brand tokens (for the brand-mark gradient + any new components).
  set('--brand-primary', theme.accent);
  set('--brand-secondary', theme.secondaryAccent);
  set('--brand-container', theme.container);
  set('--brand-on-primary', theme.containerOn);
  set('--brand-gradient', theme.gradient);

  // School admin / principal / bursar.
  set('--ska-primary', theme.accent);
  set('--ska-primary-dim', theme.dim);
  set('--ska-primary-container', theme.container);
  set('--ska-on-primary', theme.containerOn);
  set('--ska-secondary', theme.secondaryAccent);
  set('--ska-secondary-dim', theme.secondaryDim);

  // Teacher.
  set('--tch-primary', theme.accent);
  set('--tch-primary-dark', theme.dark);
  set('--tch-primary-light', theme.dim);

  // Student.
  set('--student-primary', theme.accent);
  set('--student-primary-dark', theme.dark);
  set('--student-primary-dim', withL(theme.accent, clamp(hexToHsl(theme.accent).l + 0.08, 0, 0.85)));

  // Parent.
  set('--par-primary', theme.accent);
  set('--par-primary-dark', theme.dark);
  set('--par-primary-light', theme.dim);
}

/** Remove all injected variables (logout / superadmin / no brand colours). */
export function clearBrandTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  MANAGED_VARS.forEach((k) => root.style.removeProperty(k));
}

/** Convenience: parse + derive + apply in one call. Returns the theme (or null). */
export function applyBrandColors(raw) {
  const theme = deriveBrandTheme(raw);
  if (theme) applyBrandTheme(theme); else clearBrandTheme();
  return theme;
}
