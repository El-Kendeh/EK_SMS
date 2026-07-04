/**
 * Shared CSV export helpers (extracted verbatim from bursar/Reports.js so
 * every export in the app produces identical, Excel-friendly output —
 * RFC-4180 quoting, CRLF rows, UTF-8 BOM).
 */
export const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  // '﻿' = the same UTF-8 BOM the original inlined as a literal character.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
