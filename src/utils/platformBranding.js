/* SA-78: consume the platform logo/favicon uploaded in System Settings.
   Fetched once at app boot; favicon <link> swapped in place. */
import SECURITY_CONFIG from '../config/security';

const MEDIA_BASE = (SECURITY_CONFIG.API_URL || '').replace(/\/$/, '');

let cached = null;

export async function fetchPlatformBranding() {
  if (cached) return cached;
  try {
    const r = await fetch(`${MEDIA_BASE}/api/branding/`);
    const d = await r.json();
    cached = {
      logoUrl: d?.logo_url ? `${MEDIA_BASE}${d.logo_url}` : null,
      faviconUrl: d?.favicon_url ? `${MEDIA_BASE}${d.favicon_url}` : null,
    };
  } catch {
    cached = { logoUrl: null, faviconUrl: null };
  }
  return cached;
}

/** Swap the document favicon to the uploaded one (no-op when none uploaded). */
export async function applyPlatformFavicon() {
  const { faviconUrl } = await fetchPlatformBranding();
  if (!faviconUrl) return;
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = faviconUrl;
}
