import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Lightweight i18n: bundle EN at build time, lazy-load other locales on demand.
// `t('home.welcome')` falls back to the key if missing.

import en from '../i18n/en.json';

const I18nContext = createContext({ t: (k) => k, locale: 'en', setLocale: () => {}, locales: ['en'] });

const LOADERS = {
  en: () => Promise.resolve(en),
  // To add a new locale, drop `src/i18n/<code>.json` and register here:
  // kr: () => import('../i18n/kr.json').then((m) => m.default),
};

const SUPPORTED = ['en']; // extend as locale files are added

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => localStorage.getItem('ek-sms-locale') || 'en');
  const [bundle, setBundle] = useState(en);

  useEffect(() => {
    const loader = LOADERS[locale];
    if (!loader) return;
    loader().then((data) => setBundle(data));
    localStorage.setItem('ek-sms-locale', locale);
    document.documentElement.setAttribute('lang', locale);
  }, [locale]);

  const t = useCallback((key, vars) => {
    const parts = key.split('.');
    let cur = bundle;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
      else { cur = null; break; }
    }
    if (cur == null) return key;
    if (typeof cur !== 'string') return key;
    if (!vars) return cur;
    return cur.replace(/\{(\w+)\}/g, (_, name) => (vars[name] != null ? String(vars[name]) : `{${name}}`));
  }, [bundle]);

  const setLocale = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setLocaleState(next);
  }, []);

  const value = useMemo(() => ({ t, locale, setLocale, locales: SUPPORTED }), [t, locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  return useContext(I18nContext);
}
