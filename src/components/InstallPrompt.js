import { useState, useEffect } from 'react';
import { useLang } from '../i18n/LanguageContext';

/* ============================================================
   InstallPrompt — "Add to Home Screen" banner
   ─────────────────────────────────────────────────────────────
   Listens for the `beforeinstallprompt` event (Chrome/Android).
   On iOS Safari there is no prompt API, so we show a manual
   instruction banner after a brief delay instead.

   Renders a bottom-anchored glass card.
   Auto-dismisses if the user installs or explicitly dismisses.
   The dismissal is persisted in localStorage for 30 days so we
   don't nag repeat visitors.
   ============================================================ */

const DISMISS_KEY    = 'ek_install_dismissed_v2'; // v2: reset after icon update
const DISMISS_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

function isDismissed() {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY));
    return ts && (Date.now() - ts < DISMISS_EXPIRY);
  } catch {
    return false;
  }
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

export default function InstallPrompt() {
  const { t } = useLang();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible]               = useState(false);
  const [ios, setIos]                       = useState(false);

  useEffect(() => {
    /* Already installed or user previously dismissed → skip */
    if (isInStandaloneMode() || isDismissed()) return;

    const ios = isIOS();
    setIos(ios);

    if (ios) {
      /* iOS: show manual instruction after 4 s */
      const timer = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(timer);
    }

    /* Chrome / Android: wait for beforeinstallprompt */
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    /* Hide prompt if user installs from browser menu */
    const installed = () => setVisible(false);
    window.addEventListener('appinstalled', installed);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  };

  if (!visible) return null;

  return (
    <div className="ip-banner" role="dialog" aria-label={t('install_title')}>
      {/* App icon */}
      <div className="ip-banner__icon" aria-hidden="true">
        <img src="/logo192.png" alt="EK-SMS" width={40} height={40} style={{ borderRadius: '8px' }} />
      </div>

      {/* Text */}
      <div className="ip-banner__text">
        <p className="ip-banner__title">{t('install_title')}</p>
        {ios ? (
          <p className="ip-banner__sub">
            Tap <ShareIcon /> then <strong>Add to Home Screen</strong>
          </p>
        ) : (
          <p className="ip-banner__sub">{t('install_sub')}</p>
        )}
      </div>

      {/* Actions */}
      <div className="ip-banner__actions">
        {!ios && (
          <button className="ip-banner__btn-primary" onClick={handleInstall}>
            {t('install_btn')}
          </button>
        )}
        <button className="ip-banner__btn-dismiss" onClick={handleDismiss} aria-label={t('install_dismiss')}>
          {t('install_dismiss')}
        </button>
      </div>
    </div>
  );
}

/* iOS share sheet icon (inline SVG) */
function ShareIcon() {
  return (
    <svg
      width="15" height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px', color: '#0dccf2' }}
      aria-hidden="true"
    >
      <path d="M16 5l-1.42 1.42-1.59-1.59V16h-2.08V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h3v2H6v11h12V10h-3V8h3a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
