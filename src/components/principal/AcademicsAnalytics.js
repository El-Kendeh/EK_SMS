import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { principalApi } from '../../api/adminApi';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css'; // defines the .pu-* classes this page renders
import './GradeApprovals.css';                   // ga-banner / ga-select shared bits
import './AcademicsAnalytics.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/* No chart library in this repo (and none allowed) — every chart below is
   hand-rolled CSS bars / inline SVG, matching the HealthScoreCard precedent. */

const letterColor = (letter) => {
  const l = String(letter || '').toUpperCase().charAt(0);
  if (l === 'A' || l === 'B') return 'var(--ska-green)';
  if (l === 'C') return '#f59e0b';
  return 'var(--ska-error)';
};

const rateColor = (v) => (v >= 80 ? 'var(--ska-green)' : v >= 50 ? '#f59e0b' : 'var(--ska-error)');

/* 5-step heat scale: >=80 green → <40 red */
const heatColor = (avg) => {
  if (avg == null) return 'transparent';
  if (avg >= 80) return 'rgba(34,197,94,0.30)';
  if (avg >= 65) return 'rgba(34,197,94,0.15)';
  if (avg >= 50) return 'rgba(245,158,11,0.22)';
  if (avg >= 40) return 'rgba(239,68,68,0.18)';
  return 'rgba(239,68,68,0.34)';
};

function TrendChart({ trend }) {
  // Inline SVG polyline, min-max normalized, one dot per term.
  const W = Math.max(320, trend.length * 90);
  const H = 140;
  const PAD = 24;
  const vals = trend.map(t => t.avg);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1, max - min);
  const x = (i) => trend.length === 1
    ? W / 2
    : PAD + (i * (W - 2 * PAD)) / (trend.length - 1);
  const y = (v) => H - PAD - ((v - min) / span) * (H - 2 * PAD);
  const points = trend.map((t, i) => `${x(i)},${y(t.avg)}`).join(' ');

  return (
    <div className="paa-trend-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img"
        aria-label={`Average score per term: ${trend.map(t => `${t.term} ${t.avg}%`).join(', ')}`}>
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--ska-border)" strokeWidth="1" />
        {trend.length > 1 && (
          <polyline points={points} fill="none" stroke="var(--ska-primary)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
        )}
        {trend.map((t, i) => (
          <g key={t.term_id || t.term}>
            <circle cx={x(i)} cy={y(t.avg)} r="4.5" fill="var(--ska-primary)" />
            <text x={x(i)} y={y(t.avg) - 10} textAnchor="middle" className="paa-trend__val">{t.avg}%</text>
            <text x={x(i)} y={H - 6} textAnchor="middle" className="paa-trend__label">{t.term}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function AcademicsAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    principalApi.getAcademicsAnalytics()
      .then(res => {
        if (res?.success === false) { setError(res.message || 'Failed to load analytics'); return; }
        setData(res);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const distribution = data?.distribution || [];
  const passRates = data?.pass_rates || [];
  const trend = data?.trend || [];
  const heatmap = data?.heatmap || { classes: [], subjects: [], cells: [] };

  const distMax = useMemo(
    () => Math.max(1, ...distribution.map(d => d.count)),
    [distribution]
  );

  const cellByKey = useMemo(() => {
    const m = new Map();
    for (const c of heatmap.cells) m.set(`${c.class_id}:${c.subject_id}`, c);
    return m;
  }, [heatmap.cells]);

  return (
    <div className="pu-page paa-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Academics Analytics</h1>
          <p className="ska-page-sub">
            {data?.term ? `Term: ${data.term} — ` : ''}Approved grades only
          </p>
        </div>
      </div>

      {error && (
        <div className="pu-empty">
          <Ic name="error" size="xl" />
          <p className="pu-empty__title">Couldn't load analytics</p>
          <p className="pu-empty__desc">{error}</p>
        </div>
      )}

      {!error && loading && (
        <div className="pu-empty">
          <Ic name="hourglass_empty" size="xl" />
          <p className="pu-empty__title">Loading…</p>
        </div>
      )}

      {!error && !loading && data && !data.has_data && (
        <div className="pu-empty">
          <Ic name="insights" size="xl" />
          <p className="pu-empty__title">No approved grades yet</p>
          <p className="pu-empty__desc">
            Charts appear once teachers submit grades and you approve them
            {data.term ? ` for ${data.term}` : ''}.
          </p>
        </div>
      )}

      {!error && !loading && data?.has_data && (
        <>
          <div className="paa-grid">
            {/* Grade distribution */}
            <div className="pu-card">
              <div className="pu-card__head">
                <div className="pu-card__title"><Ic name="bar_chart" size="sm" /><strong>Grade Distribution</strong></div>
                <span className="pu-card__sub">By letter grade</span>
              </div>
              {distribution.length === 0 ? (
                <p className="paa-none">No letter grades recorded yet.</p>
              ) : (
                <div className="paa-bars">
                  {distribution.map(d => (
                    <div key={d.letter} className="paa-bar-row">
                      <span className="paa-bar-row__label">{d.letter}</span>
                      <div className="pu-finance__bar-track">
                        <div className="pu-finance__bar-fill" style={{
                          width: `${Math.max(2, Math.round((d.count / distMax) * 100))}%`,
                          background: letterColor(d.letter),
                        }} />
                      </div>
                      <strong className="paa-bar-row__value">{d.count}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pass rate per class */}
            <div className="pu-card">
              <div className="pu-card__head">
                <div className="pu-card__title"><Ic name="leaderboard" size="sm" /><strong>Pass Rate per Class</strong></div>
                <span className="pu-card__sub">≥ 50% total · lowest first</span>
              </div>
              {passRates.length === 0 ? (
                <p className="paa-none">No class-linked grades yet.</p>
              ) : (
                <div className="paa-bars">
                  {passRates.map(c => (
                    <div key={c.class_id} className="paa-bar-row paa-bar-row--wide">
                      <span className="paa-bar-row__label paa-bar-row__label--wide" title={c.name}>{c.name}</span>
                      <div className="pu-finance__bar-track">
                        <div className="pu-finance__bar-fill" style={{
                          width: `${Math.max(2, c.pass_rate)}%`,
                          background: rateColor(c.pass_rate),
                        }} />
                      </div>
                      <strong className="paa-bar-row__value" style={{ color: rateColor(c.pass_rate) }}>
                        {c.pass_rate}%
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Term trend */}
          <div className="pu-card">
            <div className="pu-card__head">
              <div className="pu-card__title"><Ic name="show_chart" size="sm" /><strong>Term Trend</strong></div>
              <span className="pu-card__sub">School average per term</span>
            </div>
            {trend.length === 0 ? (
              <p className="paa-none">Trend appears once at least one term has approved grades.</p>
            ) : (
              <TrendChart trend={trend} />
            )}
          </div>

          {/* Class × subject heatmap */}
          <div className="pu-card">
            <div className="pu-card__head">
              <div className="pu-card__title"><Ic name="grid_on" size="sm" /><strong>Class × Subject Averages</strong></div>
              <span className="pu-card__sub">Average total per class and subject</span>
            </div>
            {heatmap.classes.length === 0 || heatmap.subjects.length === 0 ? (
              <p className="paa-none">The heatmap appears once grades are linked to classes and subjects.</p>
            ) : (
              <div className="paa-heat-scroll">
                <div className="paa-heat" style={{
                  gridTemplateColumns: `minmax(110px, auto) repeat(${heatmap.subjects.length}, minmax(64px, 1fr))`,
                }}>
                  <div className="paa-heat__corner" />
                  {heatmap.subjects.map(s => (
                    <div key={s.id} className="paa-heat__col" title={s.name}>{s.name}</div>
                  ))}
                  {heatmap.classes.map(c => (
                    <React.Fragment key={c.id}>
                      <div className="paa-heat__row" title={c.name}>{c.name}</div>
                      {heatmap.subjects.map(s => {
                        const cell = cellByKey.get(`${c.id}:${s.id}`);
                        return (
                          <div key={s.id} className="paa-heat__cell"
                            style={{ background: heatColor(cell ? cell.avg : null) }}
                            title={cell ? `${c.name} · ${s.name}: avg ${cell.avg}% (${cell.count} grade${cell.count !== 1 ? 's' : ''})` : `${c.name} · ${s.name}: no grades`}>
                            {cell ? `${cell.avg}` : '—'}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
