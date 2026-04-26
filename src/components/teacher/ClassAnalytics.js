import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacherApi';
import { mockClassAnalytics } from '../../mock/teacherMockData';
import './ClassAnalytics.css';

const INSIGHT_META = {
  positive: { icon: 'trending_up',  cls: 'ca-insight--positive' },
  warning:  { icon: 'warning',      cls: 'ca-insight--warning' },
  info:     { icon: 'info',         cls: 'ca-insight--info' },
};

export default function ClassAnalytics() {
  const { assignedClasses, selectedClassId, setSelectedClassId } = useTeacher();
  const [exportDone, setExportDone] = useState(false);
  const [trend, setTrend] = useState([]);

  const selectedClass = assignedClasses.find(c => c.id === selectedClassId);
  const analytics = selectedClassId ? mockClassAnalytics[selectedClassId] : null;

  useEffect(() => {
    if (!selectedClassId) { setTrend([]); return; }
    const cls = assignedClasses.find(c => c.id === selectedClassId);
    const subjectId = cls?.subject?.id;
    teacherApi.getClassAnalytics(selectedClassId, subjectId)
      .then(data => setTrend(data.trend || []))
      .catch(() => setTrend([]));
  }, [selectedClassId, assignedClasses]);

  const maxCount = analytics
    ? Math.max(...analytics.distribution.map(d => d.count), 1)
    : 1;

  const handleExport = () => {
    setExportDone(true);
    setTimeout(() => setExportDone(false), 3000);
  };

  return (
    <div className="ca-root">
      <div className="ca-top-bar">
        <div>
          <h1 className="tch-page-title" style={{ margin: 0 }}>Class Analytics</h1>
          {selectedClass && (
            <p className="tch-page-sub" style={{ margin: '2px 0 0' }}>
              {selectedClass.name} · {selectedClass.subject.name}
            </p>
          )}
        </div>
        {analytics && (
          <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={handleExport}>
            <span className="material-symbols-outlined">{exportDone ? 'check' : 'picture_as_pdf'}</span>
            {exportDone ? 'Exported!' : 'Export PDF Report'}
          </button>
        )}
      </div>

      {/* Class selector */}
      <div style={{ marginBottom: 20 }}>
        <label className="tch-label">Class</label>
        <select
          className="tch-select"
          style={{ maxWidth: 320 }}
          value={selectedClassId || ''}
          onChange={e => { setSelectedClassId(e.target.value); setExportDone(false); }}
        >
          <option value="">— Select a class —</option>
          {assignedClasses.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name} — {cls.subject.name}</option>
          ))}
        </select>
      </div>

      {!selectedClassId && (
        <div className="tch-empty">
          <span className="material-symbols-outlined">analytics</span>
          <p>Select a class to view analytics</p>
        </div>
      )}

      {selectedClassId && !analytics && (
        <div className="tch-empty">
          <span className="material-symbols-outlined">hourglass_empty</span>
          <p>No analytics available — grades haven't been submitted yet for this class</p>
        </div>
      )}

      {/* Term-over-term performance trend — real API data, shown independently of mock analytics */}
      {selectedClassId && trend.length > 1 && (() => {
        const maxAvg = Math.max(...trend.map(t => t.average), 1);
        return (
          <div className="tch-card ca-dist-card">
            <p className="ca-section-title">
              <span className="material-symbols-outlined">show_chart</span>
              Performance Trend (Term-over-Term)
            </p>
            <div className="ca-trend-chart">
              {trend.map((t, i) => {
                const prev = i > 0 ? trend[i - 1].average : null;
                const delta = prev !== null ? (t.average - prev).toFixed(1) : null;
                const isUp = delta !== null && parseFloat(delta) >= 0;
                return (
                  <motion.div
                    key={t.term_id}
                    className="ca-trend-bar"
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                    style={{ transformOrigin: 'bottom' }}
                  >
                    <span className="ca-trend-bar__value">{t.average}%</span>
                    {delta !== null && (
                      <span className={`ca-trend-bar__delta ${isUp ? 'ca-trend-bar__delta--up' : 'ca-trend-bar__delta--down'}`}>
                        <span className="material-symbols-outlined">{isUp ? 'arrow_upward' : 'arrow_downward'}</span>
                        {isUp ? '+' : ''}{delta}
                      </span>
                    )}
                    <div className="ca-trend-bar__track">
                      <div
                        className="ca-trend-bar__fill"
                        style={{ height: `${(t.average / maxAvg) * 100}%` }}
                      />
                    </div>
                    <span className="ca-trend-bar__label">{t.term_name}</span>
                    <span className="ca-trend-bar__year">{t.year}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {analytics && (
        <>
          {/* Top KPI row */}
          <div className="ca-kpi-row">
            <motion.div
              className="ca-kpi-card ca-kpi-card--primary"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              <p className="ca-kpi-card__label">Class Average</p>
              <div className="ca-kpi-card__value">
                <span className="ca-avg-letter">{analytics.classAverageLetter}</span>
                <div>
                  <p className="ca-avg-score">{analytics.classAverage}%</p>
                  <p className={`ca-avg-delta ${analytics.averageDelta >= 0 ? 'ca-avg-delta--up' : 'ca-avg-delta--down'}`}>
                    <span className="material-symbols-outlined">{analytics.averageDelta >= 0 ? 'trending_up' : 'trending_down'}</span>
                    {analytics.averageDelta >= 0 ? '+' : ''}{analytics.averageDelta}% vs last term
                  </p>
                </div>
              </div>
              <div className="ca-kpi-card__bar">
                <div className="ca-kpi-card__bar-fill" style={{ width: `${analytics.classAverage}%` }} />
              </div>
            </motion.div>

            <motion.div
              className="ca-kpi-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.05 }}
            >
              <p className="ca-kpi-card__label">
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#059669' }}>emoji_events</span>
                Highest Score
              </p>
              <p className="ca-kpi-card__big">{analytics.highestScore.score}%</p>
              <p className="ca-kpi-card__sub">{analytics.highestScore.studentName}</p>
              <span className="tch-badge tch-badge--green" style={{ marginTop: 4 }}>{analytics.highestScore.gradeLetter}</span>
            </motion.div>

            <motion.div
              className="ca-kpi-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.1 }}
            >
              <p className="ca-kpi-card__label">
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#d97706' }}>warning</span>
                Lowest Score
              </p>
              <p className="ca-kpi-card__big">{analytics.lowestScore.score}%</p>
              <p className="ca-kpi-card__sub">{analytics.lowestScore.studentName}</p>
              <span className={`tch-badge ${analytics.lowestScore.score >= 50 ? 'tch-badge--amber' : 'tch-badge--red'}`} style={{ marginTop: 4 }}>
                {analytics.lowestScore.gradeLetter}
              </span>
            </motion.div>

            <motion.div
              className="ca-kpi-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.15 }}
            >
              <p className="ca-kpi-card__label">Pass Rate</p>
              <p className="ca-kpi-card__big ca-kpi-card__big--green">{analytics.passRate}%</p>
              <div className="ca-pass-bar">
                <div className="ca-pass-bar__fill" style={{ width: `${analytics.passRate}%` }} />
              </div>
            </motion.div>
          </div>

          {/* Grade distribution */}
          <div className="tch-card ca-dist-card">
            <p className="ca-section-title">
              <span className="material-symbols-outlined">bar_chart</span>
              Grade Distribution
            </p>
            <div className="ca-dist-chart">
              {analytics.distribution.map((d, i) => (
                <motion.div
                  key={d.letter}
                  className="ca-dist-bar"
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  style={{ transformOrigin: 'bottom' }}
                >
                  <span className="ca-dist-bar__count" style={{ color: d.count > 0 ? d.color : 'var(--tch-text-secondary)' }}>
                    {d.count}
                  </span>
                  <div className="ca-dist-bar__track">
                    <div
                      className="ca-dist-bar__fill"
                      style={{
                        height: `${(d.count / maxCount) * 100}%`,
                        background: d.count > 0 ? d.color : 'var(--tch-border)',
                        minHeight: d.count > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  <span className="ca-dist-bar__letter" style={{ color: d.count > 0 ? d.color : 'var(--tch-text-secondary)' }}>
                    {d.letter}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="tch-card ca-insights-card">
            <p className="ca-section-title">
              <span className="material-symbols-outlined">auto_awesome</span>
              AI Insights
            </p>
            <div className="ca-insights-list">
              {analytics.aiInsights.map((insight, i) => {
                const meta = INSIGHT_META[insight.type] || INSIGHT_META.info;
                return (
                  <motion.div
                    key={i}
                    className={`ca-insight ${meta.cls}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <span className="material-symbols-outlined ca-insight__icon">{meta.icon}</span>
                    <p className="ca-insight__text">{insight.text}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Top performers */}
          <div className="tch-card">
            <div className="ca-top-performers-header">
              <p className="ca-section-title" style={{ margin: 0 }}>
                <span className="material-symbols-outlined">military_tech</span>
                Top Performers
              </p>
            </div>
            <div className="ca-performers-list">
              {analytics.topPerformers.map((p, i) => (
                <motion.div
                  key={p.studentName}
                  className="ca-performer-row"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <span className={`ca-rank ca-rank--${p.rank}`}>#{p.rank}</span>
                  <div className="ca-performer-avatar" style={{ background: p.avatarColor }}>
                    {p.initials}
                  </div>
                  <div className="ca-performer-info">
                    <p className="ca-performer-name">{p.studentName}</p>
                    <span className="tch-badge tch-badge--primary">{p.gradeLetter}</span>
                  </div>
                  <span className="ca-performer-score">{p.score}%</span>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
