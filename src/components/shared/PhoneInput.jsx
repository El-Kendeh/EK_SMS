import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PHONE_COUNTRIES, PHONE_COUNTRY_GROUPS,
  detectPhoneCountry, resolveCountryHint,
} from './phone-countries';
import './PhoneInput.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const DROPDOWN_W = 300;
const DROPDOWN_H = 320;

/**
 * Bug-fixed PhoneInput — drop-in replacement for the inline copies that lived
 * in SAstudents.js and NewPages.js.
 *
 * Fixes vs the originals:
 *   1. Dropdown is portalled to document.body so ancestor `overflow:auto`
 *      (the wizard modal) can't clip or detach it.
 *   2. Position is recomputed on every scroll (capture phase, so scroll inside
 *      modals counts) and on resize, so the panel always tracks the trigger.
 *   3. If the panel won't fit below the trigger, it flips above it.
 *   4. No auto-focus on the search box (this was the source of the modal
 *      jumping when the dropdown opened — Safari/Firefox ignore preventScroll
 *      for text inputs in fixed panels). Search still works — start typing
 *      with the panel open and forwarded keys land in the input.
 *   5. Hover styling is CSS-only; we no longer mutate inline styles in JSX
 *      handlers, which used to flicker against React re-renders.
 *   6. Esc closes; outside-click closes; body scroll is *not* locked here
 *      (we just track scroll), so modals beneath remain usable.
 */
export default function PhoneInput({
  value, onChange,
  placeholder = 'Phone number',
  defaultCountry,
  countryHint,
  autoComplete = 'tel',
  disabled,
}) {
  /* ── Initial country: try value, then countryHint, then defaultCountry, then detect ── */
  const [country, setCountry] = useState(() => {
    if (value) {
      const v = value.replace(/\s/g, '');
      const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
      const match  = sorted.find(c => v.startsWith(c.dial.replace(/\s/g, '')));
      if (match) return match;
    }
    const fromHint = countryHint && resolveCountryHint(countryHint);
    const code     = fromHint || defaultCountry || detectPhoneCountry();
    return PHONE_COUNTRIES.find(c => c.code === code) || PHONE_COUNTRIES[0];
  });
  const [open,     setOpen]     = useState(false);
  const [search,   setSearch]   = useState('');
  const [rect,     setRect]     = useState(null);   // {top,left,flipped}
  const wrapRef   = useRef(null);
  const searchRef = useRef(null);

  /* Strip dial prefix to show only the local part in the input */
  const stripDial = (val, dial) => {
    if (!val) return '';
    const v = val.replace(/\s/g, ''), d = dial.replace(/\s/g, '');
    return v.startsWith(d) ? v.slice(d.length) : val;
  };
  const localNum = stripDial(value, country.dial);

  /* ── Position tracking: open → recalc on scroll/resize via capture phase ── */
  useEffect(() => {
    if (!open) {
      setRect(null);
      setSearch('');
      return;
    }
    const recalc = () => {
      if (!wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      const fitsBelow = r.bottom + 6 + DROPDOWN_H <= window.innerHeight;
      const top  = fitsBelow ? r.bottom + 6 : Math.max(8, r.top - DROPDOWN_H - 6);
      const left = Math.max(4, Math.min(r.left, window.innerWidth - DROPDOWN_W - 12));
      setRect({ top, left, flipped: !fitsBelow });
    };
    recalc();
    /* Capture phase catches scroll on any ancestor — including modal bodies. */
    window.addEventListener('scroll', recalc, true);
    window.addEventListener('resize', recalc);
    return () => {
      window.removeEventListener('scroll', recalc, true);
      window.removeEventListener('resize', recalc);
    };
  }, [open]);

  /* ── Click-outside + Esc to close ── */
  useEffect(() => {
    if (!open) return;
    const onMouse = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (e.target.closest?.('[data-phone-drop]')) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selectCountry = (c) => {
    setCountry(c);
    setOpen(false);
    onChange(c.dial + localNum);
  };

  /* ── Filtering ── */
  const lower = search.toLowerCase();
  const filtered = search
    ? PHONE_COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        c.dial.includes(search) ||
        c.code.toLowerCase().includes(lower)
      )
    : null;

  /* ── Forwarded typing: pressing letters with focus on trigger seeds search ── */
  const onTriggerKeyDown = (e) => {
    if (!open) return;
    if (e.key.length === 1 && /[a-zA-Z0-9+ ]/.test(e.key)) {
      setSearch(s => s + e.key);
      e.preventDefault();
      /* Defer focus to next tick so React commits the dropdown panel first.
         preventScroll keeps the modal body anchored. */
      setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 0);
    } else if (e.key === 'Backspace' && search.length > 0) {
      setSearch(s => s.slice(0, -1));
      e.preventDefault();
    }
  };

  return (
    <div ref={wrapRef} className="phn-wrap" onKeyDown={onTriggerKeyDown}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`phn-trigger ${open ? 'is-open' : ''}`}
      >
        <span className="phn-flag" aria-hidden>{country.flag}</span>
        <span className="phn-dial">{country.dial}</span>
        <Ic name="expand_more" size="sm" style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      <input
        type="tel"
        className="ska-input phn-input"
        value={localNum}
        onChange={e => onChange(country.dial + e.target.value)}
        placeholder={country.placeholder || placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
      />

      {open && rect && createPortal(
        <div
          data-phone-drop
          className={`phn-drop ${rect.flipped ? 'is-flipped' : ''}`}
          style={{ top: rect.top, left: rect.left, width: DROPDOWN_W, maxHeight: DROPDOWN_H }}
          role="listbox"
        >
          <div className="phn-drop__search">
            <Ic name="search" size="sm" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search country or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="phn-drop__list">
            {filtered ? (
              <>
                {filtered.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => selectCountry(c)}
                    className={`phn-row ${c.code === country.code ? 'is-selected' : ''}`}
                  >
                    <span className="phn-row__flag">{c.flag}</span>
                    <span className="phn-row__name">{c.name}</span>
                    <span className="phn-row__dial">{c.dial}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="phn-drop__empty">No countries found</div>
                )}
              </>
            ) : (
              PHONE_COUNTRY_GROUPS.map(grp => (
                <React.Fragment key={grp}>
                  <div className="phn-drop__group">{grp}</div>
                  {PHONE_COUNTRIES.filter(c => c.group === grp).map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => selectCountry(c)}
                      className={`phn-row ${c.code === country.code ? 'is-selected' : ''}`}
                    >
                      <span className="phn-row__flag">{c.flag}</span>
                      <span className="phn-row__name">{c.name}</span>
                      <span className="phn-row__dial">{c.dial}</span>
                    </button>
                  ))}
                </React.Fragment>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
