/**
 * geoApi — fetch a country's states/regions and cities/towns from the free,
 * no-API-key countriesnow.space service (CORS-enabled) so the registration
 * form can offer real location dropdowns for ANY selected country.
 *
 * Every public function resolves to a `string[]` and NEVER throws (returns []
 * on any network/abort/server error), so callers can fall back to free-text
 * entry. Successful lookups are memoised in-module to avoid refetching as the
 * user steps back and forth through the form.
 *
 * Country-name reconciliation: the form's labels are stylised (e.g.
 * "Côte d'Ivoire", "São Tomé & Príncipe", "Congo (DRC)", "UAE") and won't match
 * countriesnow.space's plain English names verbatim. So we resolve each name
 * against the API's OWN country list by an accent/punctuation-insensitive
 * comparison (plus a tiny override map for abbreviations), and send the API the
 * exact string it expects — falling back to the original name if unresolved.
 */

const BASE = 'https://countriesnow.space/api/v0.1/countries';

const statesCache = new Map(); // countryKey -> string[]
const citiesCache = new Map(); // `${countryKey}|${stateKey}` -> string[]

async function getJson(url, signal) {
  // Use the documented GET /q endpoints directly. (The POST endpoints now
  // 301-redirect to these, so calling them avoids relying on the server
  // echoing the dropped POST body back through the redirect's query string.)
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ── Country-name reconciliation ─────────────────────────────────────────── */

/** Accent-, case- and punctuation-insensitive key (e.g. "São Tomé & Príncipe"
 *  → "sao tome and principe"). */
function normCountry(s) {
  return String(s || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '') // strip accents
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')                       // drop punctuation/parens
    .trim();
}

/* Abbreviations / disambiguators the API spells out — keyed by normalised form,
 * value is the normalised target we try to match in the API's country list. */
const COUNTRY_OVERRIDES = {
  uae: 'united arab emirates',
  'congo drc': 'democratic republic of the congo',
  'congo brazzaville': 'republic of the congo',
  'myanmar burma': 'myanmar',
};

let countryListPromise = null;
/** The API's own list of country names (cached for the session; [] on failure,
 *  with retry allowed). Uses the GET /iso endpoint (redirect-safe for GET). */
function getApiCountries(signal) {
  if (!countryListPromise) {
    countryListPromise = (async () => {
      try {
        const res = await fetch(`${BASE}/iso`, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const names = (json && !json.error && Array.isArray(json.data))
          ? json.data.map((c) => c.name).filter(Boolean)
          : [];
        if (!names.length) countryListPromise = null; // allow retry
        return names;
      } catch {
        countryListPromise = null;
        return [];
      }
    })();
  }
  return countryListPromise;
}

/** Resolve a form country label to the exact string the API expects, or return
 *  the original if it can't be reconciled (caller still degrades gracefully). */
async function toApiCountry(name, signal) {
  if (!name) return name;
  const list = await getApiCountries(signal);
  if (!list.length) return name;
  const target = COUNTRY_OVERRIDES[normCountry(name)] || normCountry(name);
  const exact = list.find((c) => normCountry(c) === target);
  if (exact) return exact;
  const loose = list.find((c) => {
    const n = normCountry(c);
    return n.startsWith(target) || target.startsWith(n);
  });
  return loose || name;
}

/* ── Public API ──────────────────────────────────────────────────────────── */

/** States / regions / provinces for a country (by its form label). */
export async function fetchStates(country, signal) {
  if (!country) return [];
  const key = country.trim().toLowerCase();
  if (statesCache.has(key)) return statesCache.get(key);
  try {
    const apiCountry = await toApiCountry(country, signal);
    const json = await getJson(`${BASE}/states/q?country=${encodeURIComponent(apiCountry)}`, signal);
    if (!json || json.error) return []; // server-side miss → allow retry
    const states = Array.isArray(json.data?.states)
      ? json.data.states.map((s) => s.name).filter(Boolean)
      : [];
    if (states.length) statesCache.set(key, states);
    return states;
  } catch {
    return []; // network / abort → allow retry, caller falls back to free text
  }
}

/**
 * Cities/towns for a country, narrowed to a state/region when one is given (the
 * cascaded, smaller list). If a state is supplied but the API doesn't recognise
 * it (or returns nothing), falls back to the whole country's cities so the field
 * never silently collapses to empty.
 */
export async function fetchCities(country, state, signal) {
  if (!country) return [];
  const key = `${country.trim().toLowerCase()}|${(state || '').trim().toLowerCase()}`;
  if (citiesCache.has(key)) return citiesCache.get(key);
  try {
    const apiCountry = await toApiCountry(country, signal);
    const url = state
      ? `${BASE}/state/cities/q?country=${encodeURIComponent(apiCountry)}&state=${encodeURIComponent(state)}`
      : `${BASE}/cities/q?country=${encodeURIComponent(apiCountry)}`;
    const json = await getJson(url, signal);
    let cities = (json && !json.error && Array.isArray(json.data)) ? json.data.filter(Boolean) : [];
    // State unrecognised / empty → fall back to country-wide cities.
    if (cities.length === 0 && state) {
      cities = await fetchCities(country, '', signal);
    }
    if (cities.length) citiesCache.set(key, cities);
    return cities;
  } catch {
    return [];
  }
}
