/**
 * SchoolBrandingContext — makes the logged-in user's school branding (name,
 * badge, brand colours) available app-wide, and applies the brand colour as the
 * live dashboard theme.
 *
 * Mounted once at the app root. On login / logout / impersonation it re-fetches
 * GET /api/school/info/ (auth-scoped to the caller's school for every role) and:
 *   - injects the brand colour ramp via brandTheme.applyBrandColors()
 *   - exposes { school, schoolName, badgeUrl, colors } for headers & sidebars
 *
 * Superadmin (the platform owner) is intentionally skipped — it keeps the
 * EK-SMS platform identity.
 */

import React, {
  createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useRef,
} from 'react';
import ApiClient from '../api/client';
import { SECURITY_CONFIG } from '../config/security';
import { applyBrandColors, clearBrandTheme, parseBrandColors } from '../utils/brandTheme';

const MEDIA_BASE = (SECURITY_CONFIG.API_URL || '').replace(/\/$/, '');
const CACHE_KEY = 'ek_sms_branding';
const SCHOOL_ROLES = ['school_admin', 'principal', 'bursar', 'teacher', 'student', 'parent'];

/** Resolve a stored badge path to a full URL. */
export function resolveBadgeUrl(badge) {
  if (!badge) return '';
  if (/^(https?:|data:|blob:)/.test(badge)) return badge;
  // Legacy rows stored an ABSOLUTE filesystem path (C:\...\uploads\badges\x) —
  // rendering that verbatim produced a CSP-blocked garbage URL. Serve by basename.
  if (/[A-Za-z]:[\\/]/.test(badge)) {
    return `${MEDIA_BASE}/uploads/badges/${badge.split(/[\\/]/).pop()}`;
  }
  return `${MEDIA_BASE}${badge.startsWith('/') ? '' : '/'}${badge}`;
}

function readUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}
function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}
function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
}
function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* storage unavailable */ }
}

const SchoolBrandingCtx = createContext({
  school: null,
  schoolName: 'EK-SMS',
  badgeUrl: '',
  colors: [],
  loading: false,
  refresh: () => {},
  setBranding: () => {},
});

export function SchoolBrandingProvider({ children }) {
  // Optimistically hydrate from cache (for the current school) to avoid a flash
  // of the default theme before /api/school/info/ resolves.
  const [school, setSchool] = useState(() => {
    const user = readUser();
    if (!user || !SCHOOL_ROLES.includes(user.role)) return null;
    const cache = readCache();
    if (cache && (cache.schoolId == null || String(cache.schoolId) === String(user.school_id))) {
      return cache.school || null;
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const reqRef = useRef(0);

  const applyFromSchool = useCallback((s) => {
    if (s && s.brand_colors) applyBrandColors(s.brand_colors);
    else clearBrandTheme();
  }, []);

  // Apply cached theme synchronously, before first paint.
  useLayoutEffect(() => {
    const user = readUser();
    if (user && SCHOOL_ROLES.includes(user.role)) applyFromSchool(school);
    else clearBrandTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setBranding = useCallback((s) => {
    if (!s) return;
    setSchool(s);
    applyFromSchool(s);
    const user = readUser();
    writeCache({ schoolId: user?.school_id ?? s.id ?? null, school: s });
  }, [applyFromSchool]);

  const load = useCallback(async () => {
    const user = readUser();
    const token = localStorage.getItem('token');
    if (!token || !user || !SCHOOL_ROLES.includes(user.role)) {
      // Logged out, or a non-school role (superadmin) — drop any branding.
      reqRef.current += 1;
      setSchool(null);
      clearBrandTheme();
      clearCache();
      return;
    }
    const myReq = ++reqRef.current;
    setLoading(true);
    try {
      const data = await ApiClient.get('/api/school/info/');
      if (myReq !== reqRef.current) return; // a newer load() superseded this one
      if (data && data.success !== false && (data.name || data.brand_colors || data.badge)) {
        setBranding(data);
      }
    } catch (_) {
      // Network/permission failure — keep cached/default branding silently.
    } finally {
      if (myReq === reqRef.current) setLoading(false);
    }
  }, [setBranding]);

  // (Re)load whenever auth changes. login.js / clearAuth() / impersonation all
  // dispatch one of these events after swapping localStorage.
  useEffect(() => {
    load();
    const onAuth = () => load();
    window.addEventListener('ek-sms-auth-changed', onAuth);
    window.addEventListener('storage', onAuth);
    return () => {
      window.removeEventListener('ek-sms-auth-changed', onAuth);
      window.removeEventListener('storage', onAuth);
    };
  }, [load]);

  const value = {
    school,
    schoolName: school?.name || 'EK-SMS',
    badgeUrl: resolveBadgeUrl(school?.badge),
    colors: parseBrandColors(school?.brand_colors),
    loading,
    refresh: load,
    setBranding,
  };

  return <SchoolBrandingCtx.Provider value={value}>{children}</SchoolBrandingCtx.Provider>;
}

export const useSchoolBranding = () => useContext(SchoolBrandingCtx);
