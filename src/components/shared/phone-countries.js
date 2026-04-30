/**
 * EK-SMS · Shared phone-country dataset + timezone-based detection.
 * One source of truth for every PhoneInput in the app.
 */

export const PHONE_COUNTRY_GROUPS = ['West Africa', 'East & Southern Africa', 'Europe & Americas'];

export const PHONE_COUNTRIES = [
  /* ── West Africa ───────────────────────────────────────────── */
  { code: 'SL', name: 'Sierra Leone',   dial: '+232', flag: '🇸🇱', placeholder: '76 000 000',      group: 'West Africa' },
  { code: 'GN', name: 'Guinea',         dial: '+224', flag: '🇬🇳', placeholder: '62 000 000',      group: 'West Africa' },
  { code: 'LR', name: 'Liberia',        dial: '+231', flag: '🇱🇷', placeholder: '77 000 000',      group: 'West Africa' },
  { code: 'GM', name: 'Gambia',         dial: '+220', flag: '🇬🇲', placeholder: '3XX XXXX',        group: 'West Africa' },
  { code: 'SN', name: 'Senegal',        dial: '+221', flag: '🇸🇳', placeholder: '7X XXX XX XX',   group: 'West Africa' },
  { code: 'ML', name: 'Mali',           dial: '+223', flag: '🇲🇱', placeholder: '6X XX XX XX',    group: 'West Africa' },
  { code: 'GH', name: 'Ghana',          dial: '+233', flag: '🇬🇭', placeholder: '24 XXX XXXX',    group: 'West Africa' },
  { code: 'NG', name: 'Nigeria',        dial: '+234', flag: '🇳🇬', placeholder: '70 XXX XXXX',    group: 'West Africa' },
  { code: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮', placeholder: '07 XX XX XX XX', group: 'West Africa' },
  { code: 'GW', name: 'Guinea-Bissau',  dial: '+245', flag: '🇬🇼', placeholder: '96 XXX XXXX',    group: 'West Africa' },
  { code: 'TG', name: 'Togo',           dial: '+228', flag: '🇹🇬', placeholder: '90 XX XX XX',    group: 'West Africa' },
  { code: 'BJ', name: 'Benin',          dial: '+229', flag: '🇧🇯', placeholder: '97 XX XX XX',    group: 'West Africa' },
  { code: 'BF', name: 'Burkina Faso',   dial: '+226', flag: '🇧🇫', placeholder: '70 XX XX XX',    group: 'West Africa' },
  { code: 'CM', name: 'Cameroon',       dial: '+237', flag: '🇨🇲', placeholder: '6X XX XX XX XX', group: 'West Africa' },
  /* ── East & Southern Africa ────────────────────────────────── */
  { code: 'ZA', name: 'South Africa',   dial: '+27',  flag: '🇿🇦', placeholder: '71 XXX XXXX',    group: 'East & Southern Africa' },
  { code: 'KE', name: 'Kenya',          dial: '+254', flag: '🇰🇪', placeholder: '7XX XXX XXX',    group: 'East & Southern Africa' },
  { code: 'TZ', name: 'Tanzania',       dial: '+255', flag: '🇹🇿', placeholder: '7XX XXX XXX',    group: 'East & Southern Africa' },
  { code: 'UG', name: 'Uganda',         dial: '+256', flag: '🇺🇬', placeholder: '7XX XXX XXX',    group: 'East & Southern Africa' },
  { code: 'ET', name: 'Ethiopia',       dial: '+251', flag: '🇪🇹', placeholder: '9XX XXX XXX',    group: 'East & Southern Africa' },
  /* ── Europe & Americas ─────────────────────────────────────── */
  { code: 'GB', name: 'United Kingdom', dial: '+44',  flag: '🇬🇧', placeholder: '7XXX XXXXXX',    group: 'Europe & Americas' },
  { code: 'US', name: 'United States',  dial: '+1',   flag: '🇺🇸', placeholder: 'XXX XXX XXXX',   group: 'Europe & Americas' },
  { code: 'FR', name: 'France',         dial: '+33',  flag: '🇫🇷', placeholder: '6X XX XX XX XX', group: 'Europe & Americas' },
  { code: 'DE', name: 'Germany',        dial: '+49',  flag: '🇩🇪', placeholder: '1XX XXXXXXX',    group: 'Europe & Americas' },
];

const TZ_COUNTRY_MAP = {
  'Africa/Freetown': 'SL', 'Africa/Conakry': 'GN', 'Africa/Monrovia': 'LR',
  'Africa/Banjul': 'GM',   'Africa/Dakar': 'SN',   'Africa/Bamako': 'ML',
  'Africa/Accra': 'GH',    'Africa/Lagos': 'NG',   'Africa/Abidjan': 'CI',
  'Africa/Bissau': 'GW',   'Africa/Lome': 'TG',    'Africa/Porto-Novo': 'BJ',
  'Africa/Ouagadougou': 'BF', 'Africa/Douala': 'CM','Africa/Johannesburg': 'ZA',
  'Africa/Nairobi': 'KE', 'Africa/Dar_es_Salaam': 'TZ','Africa/Kampala': 'UG',
  'Africa/Addis_Ababa': 'ET','Europe/London': 'GB',  'America/New_York': 'US',
  'America/Chicago': 'US', 'America/Denver': 'US',  'America/Los_Angeles': 'US',
  'Europe/Paris': 'FR',    'Europe/Berlin': 'DE',
};

const ISO3_TO_ISO2 = { SLE: 'SL', GIN: 'GN', LBR: 'LR', GMB: 'GM', SEN: 'SN', MLI: 'ML', GHA: 'GH', NGA: 'NG', CIV: 'CI', GNB: 'GW', TGO: 'TG', BEN: 'BJ', BFA: 'BF', CMR: 'CM', ZAF: 'ZA', KEN: 'KE', TZA: 'TZ', UGA: 'UG', ETH: 'ET', GBR: 'GB', USA: 'US', FRA: 'FR', DEU: 'DE' };

export function detectPhoneCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TZ_COUNTRY_MAP[tz]) return TZ_COUNTRY_MAP[tz];
    const parts = (navigator.language || '').split('-');
    if (parts.length > 1) {
      const code = parts[parts.length - 1].toUpperCase();
      if (PHONE_COUNTRIES.find(c => c.code === code)) return code;
    }
  } catch { /* */ }
  return 'SL';
}

/**
 * Resolve a free-text country hint (name, ISO-2, ISO-3, or dial) to an ISO-2 code.
 * Returns null if no match.
 */
export function resolveCountryHint(hint) {
  if (!hint) return null;
  const q = String(hint).trim();
  if (!q) return null;
  const upper = q.toUpperCase();
  if (ISO3_TO_ISO2[upper]) return ISO3_TO_ISO2[upper];
  const lower = q.toLowerCase();
  const byCodeOrName = PHONE_COUNTRIES.find(c =>
    c.code.toLowerCase() === lower || c.name.toLowerCase() === lower
  );
  if (byCodeOrName) return byCodeOrName.code;
  const dial = q.startsWith('+') ? q : `+${q}`;
  const byDial = PHONE_COUNTRIES.find(c => c.dial === dial);
  return byDial ? byDial.code : null;
}
