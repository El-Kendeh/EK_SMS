import React, { createContext, useContext, useState } from 'react';
import translations from './translations';

const LanguageContext = createContext(null);

/* Detect initial language:
   1. Honour previous saved preference
   2. Fall back to browser locale (fr if francophone)
   3. Default to English */
function detectInitialLang() {
  const saved = localStorage.getItem('ek_lang');
  if (saved === 'fr' || saved === 'en') return saved;
  const browser = (navigator.language || navigator.userLanguage || 'en').slice(0, 2);
  return browser === 'fr' ? 'fr' : 'en';
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLang);

  /* Translate a key; falls back to English, then the key itself */
  const t = (key) =>
    (translations[lang] && translations[lang][key]) ||
    (translations.en && translations.en[key]) ||
    key;

  const setLang = (next) => {
    if (next !== 'en' && next !== 'fr') return;
    setLangState(next);
    localStorage.setItem('ek_lang', next);
    document.documentElement.lang = next;
  };

  const toggleLang = () => setLang(lang === 'en' ? 'fr' : 'en');

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
}
