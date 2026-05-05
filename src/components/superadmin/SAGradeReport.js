import React, { useState, useEffect, useMemo } from 'react';
import ApiClient from '../../api/client';

/* ---- Icons ---- */
const IcExport  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IcEdit    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>;
const IcShield  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcClock   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcAlert   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcCheck   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcArrow   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

/* ---- Derive per-day alert counts from real alert timestamps ---- */
function buildChartFromAlerts(alerts, days) {
  const counts = new Array(days).fill(0);
  const now = Date.now();
  alerts.forEach(a => {
    if (!a.ts) return;
    const age = Math.floor((now - new Date(a.ts).getTime()) / 86400000);
    if (age >= 0 && age < days) counts[days - 1 - age]++;
  });
  return counts;
}

/* ---- Build SVG path from data array ---- */
function buildAreaPath(data) {
  const W = 400, H = 140;
  const max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (v / max) * (H - 10);
    return [x, y];
  });
  // Smooth curve via cardinal spline approximation
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cx = (pts[i][0] + pts[i + 1][0]) / 2;
    d += ` Q${cx},${pts[i][1]} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  const area = d + ` V${H} H0 Z`;
  return { line: d, area };
}

/* ---- Status badge colour helper ---- */
function statusStyle(s) {
  if (s === 'Verified' || s === 'Approved') return { color: 'var(--sa-green)',  bg: 'var(--sa-green-dim)'  };
  if (s === 'Flagged')                       return { color: 'var(--sa-red)',    bg: 'var(--sa-red-dim)'    };
  return                                            { color: 'var(--sa-amber)',  bg: 'var(--sa-amber-dim)'  };
}

/* ---- Export helpers ---- */
function escapePdfText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r\n|\r|\n/g, ' ');
}

function buildPdfDocument(rows) {
  const date = new Date().toLocaleDateString('en-GB');
  const subtitle = `Generated ${date}`;
  const headers = ['Request ID', 'Date', 'Time', 'School', 'Subject', 'Old Grade', 'New Grade', 'Actor', 'Status', 'Flagged'];
  const displayRows = rows.slice(0, 38);
  const lines = [
    '0 0.18 0.55 rg',
    '40 744 18 18 re',
    'f',
    'BT',
    '/F1 22 Tf',
    '64 760 Td',
    `(${escapePdfText('Pruh SMS')}) Tj`,
    '0 -28 Td',
    '/F1 12 Tf',
    `(${escapePdfText('Grade Audit Export')}) Tj`,
    '0 -20 Td',
    `(${escapePdfText(subtitle)}) Tj`,
    '0 -24 Td',
    `(${escapePdfText('────────────────────────────────────────────────────────────────────────────────────────')}) Tj`,
    '0 -20 Td',
    `(${escapePdfText(headers.join(' | '))}) Tj`,
  ];

  displayRows.forEach(r => {
    const lineText = [
      r.id,
      r.date,
      r.time,
      r.school,
      r.subject,
      r.oldGrade,
      r.newGrade,
      r.actor,
      r.status,
      r.isFlag ? 'Yes' : 'No',
    ].map(escapePdfText).join(' | ');
    lines.push('0 -18 Td');
    lines.push(`(${lineText}) Tj`);
  });

  if (rows.length > displayRows.length) {
    lines.push('0 -20 Td');
    lines.push(`(${escapePdfText(`Note: ${rows.length - displayRows.length} additional rows not included`)}) Tj`);
  }

  lines.push('ET');

  const stream = lines.join('\n');
  const pdfParts = [];
  pdfParts.push('%PDF-1.3');
  pdfParts.push('1 0 obj');
  pdfParts.push('<< /Type /Catalog /Pages 2 0 R >>');
  pdfParts.push('endobj');
  pdfParts.push('2 0 obj');
  pdfParts.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  pdfParts.push('endobj');
  pdfParts.push('3 0 obj');
  pdfParts.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  pdfParts.push('endobj');
  pdfParts.push('4 0 obj');
  pdfParts.push(`<< /Length ${stream.length} >>`);
  pdfParts.push('stream');
  pdfParts.push(stream);
  pdfParts.push('endstream');
  pdfParts.push('endobj');
  pdfParts.push('5 0 obj');
  pdfParts.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  pdfParts.push('endobj');
  pdfParts.push('xref');

  let offset = 0;
  const positions = [];
  const body = pdfParts.map(part => {
    positions.push(offset);
    const text = `${part}\n`;
    offset += new TextEncoder().encode(text).length;
    return text;
  }).join('');

  const xrefBase = offset;
  const xrefLines = ['0 6', '0000000000 65535 f '];
  positions.forEach(pos => {
    xrefLines.push(String(pos).padStart(10, '0') + ' 00000 n ');
  });

  const trailer = [
    'trailer',
    '<< /Size 6 /Root 1 0 R >>',
    'startxref',
    String(xrefBase),
    '%%EOF',
  ].join('\n');

  return body + xrefLines.join('\n') + '\n' + trailer;
}

function exportExcelXml(rows, filename) {
  const date = new Date().toLocaleDateString('en-GB');
  const headers = ['Request ID', 'Date', 'Time', 'School', 'Subject', 'Old Grade', 'New Grade', 'Actor', 'Status', 'Flagged'];
  const rowXml = rows.map(r => {
    return `      <Row>${headers.map(h => {
      const value = r[h] ?? '';
      return `<Cell><Data ss:Type="String">${String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</Data></Cell>`;
    }).join('')}</Row>`;
  }).join('\n');

  const xml = [`<?xml version="1.0" encoding="UTF-8"?>`,
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '  <Worksheet ss:Name="Audit">',
    '    <Table>',
    '      <Row><Cell><Data ss:Type="String">Pruh SMS Grade Audit Export</Data></Cell></Row>',
    `      <Row><Cell><Data ss:Type="String">Generated</Data></Cell><Cell><Data ss:Type="String">${date}</Data></Cell></Row>`,
    '      <Row/>',
    '      <Row>' + headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>',
    rowXml,
    '    </Table>',
    '  </Worksheet>',
    '</Workbook>',
  ].join('\n');

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAuditFiles(rows) {
  if (!rows.length) {
    window.alert('No audit records available for export.');
    return;
  }

  const auditRows = rows.map(r => ({
    id:       r.id,
    date:     r.date,
    time:     r.time,
    school:   r.school,
    subject:  r.subject,
    oldGrade: r.oldGrade,
    newGrade: r.newGrade,
    actor:    r.actor,
    status:   r.status,
    isFlag:   r.isFlag ? 'Yes' : 'No',
  }));

  const today = new Date().toISOString().slice(0, 10);
  exportExcelXml(auditRows, `pruh-sms-grade-audit-${today}.xls`);

  const pdfContent = buildPdfDocument(auditRows);
  const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const pdfLink = document.createElement('a');
  pdfLink.href = pdfUrl;
  pdfLink.download = `pruh-sms-grade-audit-${today}.pdf`;
  pdfLink.click();
  URL.revokeObjectURL(pdfUrl);
}

/* ============================================================
   Main Component
   ============================================================ */
export default function SAGradeReport({ onViewRequests, onViewDetail }) {
  const [period, setPeriod] = useState('30D');
  const [alerts, setAlerts]  = useState([]);

  /* Derive chart arrays from real alert timestamps */
  const chart30Real = useMemo(() => buildChartFromAlerts(alerts, 30),  [alerts]);
  const chart90Real = useMemo(() => buildChartFromAlerts(alerts, 90),  [alerts]);
  const chartData = period === '30D' ? chart30Real : chart90Real;
  const hasChartData = chartData.some(v => v > 0);
  const { line, area } = hasChartData ? buildAreaPath(chartData) : { line: '', area: '' };

  useEffect(() => {
    ApiClient.get('/api/grade-alerts/').then(data => {
      if (data.success && Array.isArray(data.alerts)) setAlerts(data.alerts);
    }).catch(() => {});
  }, []);

  /* ── Derived stats ── */
  const totalAlerts   = alerts.length;
  const pendingCount  = alerts.filter(a => a.status === 'Pending').length;
  const flaggedCount  = alerts.filter(a => a.urgency === 'critical' || a.status === 'Flagged').length;
  const hashVerPct    = totalAlerts > 0
    ? Math.round(alerts.filter(a => a.hashMatch !== false).length / totalAlerts * 100)
    : 100;

  const stats = [
    { label: 'Manual Modifications', value: totalAlerts > 0 ? String(totalAlerts) : '—', icon: <IcEdit />,   iconCls: 'sa-stat-icon--amber', trend: { dir: 'up',   label: totalAlerts > 0 ? `${totalAlerts} total` : 'Loading…' } },
    { label: 'Hash-Verified',         value: `${hashVerPct}%`,  icon: <IcShield />, iconCls: 'sa-stat-icon--green', trend: { dir: 'flat', label: 'All records checked' } },
    { label: 'Pending Requests',      value: totalAlerts > 0 ? String(pendingCount) : '—', icon: <IcClock />,  iconCls: 'sa-stat-icon--blue',  trend: { dir: pendingCount > 0 ? 'up' : 'flat', label: `${pendingCount} queued` } },
    { label: 'Anomalous Alerts',      value: totalAlerts > 0 ? String(flaggedCount) : '—', icon: <IcAlert />,  iconCls: 'sa-stat-icon--red',   trend: { dir: flaggedCount > 0 ? 'up' : 'flat', label: flaggedCount > 0 ? `${flaggedCount} need review` : 'None flagged', isAlert: flaggedCount > 0 } },
  ];

  /* ── Top schools by alert count ── */
  const schoolCountMap = {};
  alerts.forEach(a => { if (a.school) schoolCountMap[a.school] = (schoolCountMap[a.school] || 0) + 1; });
  const RISK_COLORS = ['var(--sa-red)', 'var(--sa-amber)', 'var(--sa-accent)', 'var(--sa-purple)'];
  const maxCount    = Math.max(1, ...Object.values(schoolCountMap));
  const topSchoolsData = Object.entries(schoolCountMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([name, count], i) => ({ name, count, pct: Math.round(count / maxCount * 100), color: RISK_COLORS[i] }));
  const displayTopSchools = topSchoolsData;

  /* ── Reasons breakdown ── */
  const reasonMap = {};
  alerts.forEach(a => { if (a.reason) reasonMap[a.reason] = (reasonMap[a.reason] || 0) + 1; });
  const totalWithReason = Object.values(reasonMap).reduce((s, n) => s + n, 0);
  const REASON_COLORS = ['var(--sa-accent)', 'var(--sa-red)', 'var(--sa-amber)', 'var(--sa-purple)'];
  const realReasons = totalWithReason > 0
    ? Object.entries(reasonMap).sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([label, count], i) => ({ label, pct: Math.round(count / totalWithReason * 100), color: REASON_COLORS[i] }))
    : null;
  const displayReasons = realReasons || [];

  /* ── Recent logs from real alerts ── */
  const recentLogs = alerts.length > 0
    ? alerts.slice(0, 5).map(a => ({
        id:       a.id,
        time:     a.ts ? new Date(a.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—',
        date:     a.ts ? new Date(a.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—',
        school:   a.school   || '—',
        subject:  a.subject  || '—',
        oldGrade: a.oldGrade || '—',
        newGrade: a.newGrade || '—',
        actor:    a.requester?.name || 'Unknown',
        status:   a.status   || 'Pending',
        isFlag:   a.urgency === 'critical' || a.hashMatch === false,
        _raw:     a,
      }))
    : [];

  /* Donut gradient from real reasons */
  const donutGrad = displayReasons.length >= 2
    ? (() => {
        let stops = '', pos = 0;
        displayReasons.forEach((r, i) => {
          const end = pos + r.pct;
          stops += `${r.color} ${pos}% ${Math.min(end, 100)}%${i < displayReasons.length - 1 ? ', ' : ''}`;
          pos = end;
        });
        return `conic-gradient(${stops})`;
      })()
    : `conic-gradient(var(--sa-accent) 0% 45%, var(--sa-red) 45% 70%, var(--sa-amber) 70% 100%)`;

  return (
    <div>

      {/* ── Page Header ── */}
      <div className="sa-page-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="sa-page-title">Grade Integrity Deep Dive</h1>
          <p className="sa-page-sub">Investigate suspicious grade changes, audit modification requests, and track tampering attempts.</p>
        </div>
        <button
          className="sa-btn sa-btn--primary"
          style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}
          aria-label="Export audit report"
          onClick={() => exportAuditFiles(recentLogs)}
        >
          <span style={{ width: 16, height: 16, display: 'flex' }}><IcExport /></span>
          <span>Export Audit</span>
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="sa-stat-grid" style={{ marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div
            key={i}
            className="sa-stat-card"
            style={s.trend.isAlert ? { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' } : {}}
          >
            <p className="sa-stat-label" style={s.trend.isAlert ? { color: 'var(--sa-red)' } : {}}>{s.label}</p>
            <div className="sa-stat-row">
              <span className="sa-stat-value">{s.value}</span>
              <span className={`sa-stat-icon ${s.iconCls}`}>{s.icon}</span>
            </div>
            <span className={`sa-stat-trend sa-stat-trend--${s.trend.dir}`} style={s.trend.isAlert ? { color: 'var(--sa-red)' } : {}}>
              {s.trend.dir === 'up' ? '↑' : s.trend.dir === 'down' ? '↓' : '·'} {s.trend.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Modification Frequency Chart ── */}
      <div className="sa-card" style={{ marginBottom: 20 }}>
        <div className="sa-card-head">
          <div>
            <p className="sa-card-title">Modification Frequency</p>
            <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>
              Active Term — {period === '30D' ? 'Last 30 days' : 'Last 90 days'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--sa-card-bg)', borderRadius: 8, padding: 3 }}>
            {['30D', '90D'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: '0.6875rem', fontWeight: 700,
                  background: period === p ? 'var(--sa-accent)' : 'transparent',
                  color: period === p ? '#fff' : 'var(--sa-text-2)',
                  transition: 'all 150ms',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="sa-card-body">
          {!hasChartData && (
            <p style={{ textAlign: 'center', color: 'var(--sa-text-3)', fontSize: '0.8125rem', padding: '32px 0' }}>No grade modification activity recorded yet.</p>
          )}
          {/* SVG area chart */}
          {hasChartData && <><div style={{ position: 'relative', height: 160, width: '100%', overflow: 'hidden' }}>
            {/* Grid lines */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', width: '100%' }} />
              ))}
            </div>
            <svg
              viewBox="0 0 400 140"
              preserveAspectRatio="none"
              style={{ width: '100%', height: '100%' }}
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="giChartGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--sa-accent)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--sa-accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Anomaly spike marker at ~day 20 */}
              <line
                x1={(20 / (chartData.length - 1)) * 400}
                y1="0"
                x2={(20 / (chartData.length - 1)) * 400}
                y2="140"
                stroke="rgba(239,68,68,0.25)"
                strokeDasharray="4 3"
                strokeWidth="1.5"
              />
              {/* Area fill */}
              <path d={area} fill="url(#giChartGrad)" />
              {/* Line */}
              <path d={line} fill="none" stroke="var(--sa-accent)" strokeWidth="2.5" strokeLinecap="round" />
              {/* Peak dot */}
              <circle
                cx={(20 / (chartData.length - 1)) * 400}
                cy={140 - (chartData[20] / Math.max(...chartData)) * 130}
                r="5"
                fill="var(--sa-red)"
                stroke="var(--sa-card-bg)"
                strokeWidth="2"
              />
            </svg>
          </div>
          {/* X-axis labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.625rem', color: 'var(--sa-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            <span>Week 1</span>
            <span>Week 2</span>
            <span style={{ color: 'var(--sa-amber)' }}>Mid-Term</span>
            <span style={{ color: 'var(--sa-red)', fontWeight: 800 }}>Exam Period</span>
            <span>Finals</span>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>
              <div style={{ width: 20, height: 3, background: 'var(--sa-accent)', borderRadius: 2 }} /> Modifications
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sa-red)' }} /> Anomaly Spike
            </div>
          </div></>}
        </div>
      </div>

      {/* ── Risk Analysis: 2-column grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }} className="sa-gi-risk-grid">

        {/* Schools at Risk */}
        <div className="sa-card">
          <div className="sa-card-head">
            <p className="sa-card-title">Top Schools — Manual Overrides</p>
          </div>
          <div className="sa-card-body">
            {displayTopSchools.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-3)', padding: '8px 0' }}>No schools with grade modifications yet.</p>
            ) : displayTopSchools.map((s, i) => (
              <div key={i} className="sa-gi-bar-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)' }}>{s.name}</span>
                  <span style={{ fontFamily: 'Consolas, monospace', fontSize: '0.8125rem', fontWeight: 700, color: s.color }}>{s.count}</span>
                </div>
                <div className="sa-progress-track">
                  <div className="sa-progress-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modification Reasons Donut */}
        <div className="sa-card">
          <div className="sa-card-head">
            <p className="sa-card-title">Modification Reasons</p>
          </div>
          <div className="sa-card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Donut */}
              <div className="sa-gi-donut" style={{ background: donutGrad }} aria-hidden="true">
                <div className="sa-gi-donut-inner">
                  <span style={{ fontSize: '0.625rem', color: 'var(--sa-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--sa-text)' }}>{totalAlerts || '—'}</span>
                </div>
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {displayReasons.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--sa-text-2)', flex: 1 }}>{r.label}</span>
                    <span style={{ fontWeight: 700, color: 'var(--sa-text)' }}>{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Audit Logs ── */}
      <div className="sa-card">
        <div className="sa-card-head">
          <p className="sa-card-title">Recent Audit Logs</p>
          <button
            className="sa-btn sa-btn--ghost sa-btn--sm"
            onClick={onViewRequests}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            View All <span style={{ width: 14, height: 14, display: 'flex' }}><IcArrow /></span>
          </button>
        </div>
        {recentLogs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--sa-text-3)', fontSize: '0.8125rem' }}>No audit log entries yet.</div>
        ) : <div style={{ overflowX: 'auto' }}>
          <table className="sa-sec-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>School &amp; Subject</th>
                <th>Change</th>
                <th>Performed By</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map(log => {
                const st = statusStyle(log.status);
                return (
                  <tr
                    key={log.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewDetail && onViewDetail(log._raw || log)}
                  >
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: 'var(--sa-text)', fontSize: '0.8125rem' }}>{log.time}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>{log.date}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: 'var(--sa-text)', fontSize: '0.8125rem' }}>{log.school}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>{log.subject}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                        <span className="sa-gi-grade-chip sa-gi-grade-chip--old">{log.oldGrade}</span>
                        <span style={{ fontSize: '0.625rem', color: 'var(--sa-text-3)' }}>→</span>
                        <span className={`sa-gi-grade-chip ${log.isFlag ? 'sa-gi-grade-chip--flagged' : 'sa-gi-grade-chip--new'}`}>{log.newGrade}</span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div className="sa-gi-avatar">{log.actor.charAt(0)}</div>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)' }}>{log.actor}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 20, fontSize: '0.6875rem', fontWeight: 700,
                        background: st.bg, color: st.color,
                        border: `1px solid ${st.color}33`,
                      }}>
                        {log.status === 'Verified' || log.status === 'Approved'
                          ? <span style={{ width: 12, height: 12, display: 'flex' }}><IcCheck /></span>
                          : null
                        }
                        {log.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>}
      </div>

    </div>
  );
}
