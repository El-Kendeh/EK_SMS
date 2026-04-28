import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacherApi';
import './ClassAnalytics.css';

// Grade distribution colors
const GRADE_COLORS = {
  A: '#059669', B: '#3b82f6', C: '#8b5cf6', D: '#f59e0b', E: '#ef4444', I: '#6b7280',
};

function avatarColor(str = '') {
  const colours = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colours[Math.abs(hash) % colours.length];
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getGradeLetter(score, boundaries) {
  if (!boundaries || !Array.isArray(boundaries)) {
    if (score >= 80) return 'A';
    if (score >= 65) return 'B';
    if (score >= 55) return 'C';
    if (score >= 45) return 'D';
    return 'E';
  }
  for (const b of boundaries) {
    if (score >= b.min && score <= b.max) return b.letter;
  }
  return 'E';
}

export default function ClassAnalytics() {
  const { assignedClasses, selectedClassId, setSelectedClassId } = useTeacher();
  const [exportDone, setExportDone] = useState(false);
  const [trend, setTrend] = useState([]);
  const [gradesData, setGradesData] = useState(null);
  const [gradingScheme, setGradingScheme] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedClass = assignedClasses.find(c => String(c.id) === String(selectedClassId));

  // Fetch grading scheme on mount
  useEffect(() => {
    teacherApi.getGradingScheme()
      .then(scheme => setGradingScheme(scheme))
      .catch(() => setGradingScheme(null));
  }, []);

  // Fetch grades + trend when class changes
  useEffect(() => {
    if (!selectedClassId) { setGradesData(null); setTrend([]); return; }
    setLoading(true);
    const cls = assignedClasses.find(c => String(c.id) === String(selectedClassId));
    const subjectId = cls?.subject?.id;

    Promise.all([
      teacherApi.getClassGrades(selectedClassId),
      teacherApi.getClassAnalytics(selectedClassId, subjectId),
    ])
      .then(([gradeResp, analyticsResp]) => {
        setGradesData(gradeResp);
        setTrend(analyticsResp.trend || []);
      })
      .catch(() => { setGradesData(null); setTrend([]); })
      .finally(() => setLoading(false));
  }, [selectedClassId, assignedClasses]);

  // Compute analytics from real grade data
  const analytics = useMemo(() => {
    if (!gradesData) return null;
    const entries = gradesData.entries || [];
    const students = gradesData.students || [];
    const boundaries = gradingScheme?.boundaries || null;
    const passMark = gradingScheme?.pass_mark || 50;

    // Only consider entries with actual scores
    const scored = entries.filter(e => {
      const total = (parseFloat(e.ca) || 0) + (parseFloat(e.midterm) || 0) + (parseFloat(e.final_exam) || 0);
      return total > 0;
    }).map(e => {
      const stu = students.find(s => s.id === e.student_id) || {};
      const fullName = `${stu.first_name || ''} ${stu.last_name || ''}`.trim() || `Student #${e.student_id}`;
      const total = Math.round((parseFloat(e.ca) || 0) + (parseFloat(e.midterm) || 0) + (parseFloat(e.final_exam) || 0));
      return { studentName: fullName, score: total, gradeLetter: getGradeLetter(total, boundaries) };
    });

    if (scored.length === 0) return null;

    scored.sort((a, b) => b.score - a.score);
    const avg = Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length);
    const passed = scored.filter(s => s.score >= passMark).length;
    const passRate = Math.round((passed / scored.length) * 100);

    // Distribution
    const distMap = {};
    ['A','B','C','D','E','I'].forEach(l => { distMap[l] = 0; });
    scored.forEach(s => { distMap[s.gradeLetter] = (distMap[s.gradeLetter] || 0) + 1; });
    const distribution = Object.entries(distMap).map(([letter, count]) => ({
      letter, count, color: GRADE_COLORS[letter] || '#6b7280',
    }));

    // Top performers (top 5)
    const topPerformers = scored.slice(0, 5).map((s, i) => ({
      rank: i + 1,
      studentName: s.studentName,
      score: s.score,
      gradeLetter: s.gradeLetter,
      initials: initials(s.studentName),
      avatarColor: avatarColor(s.studentName),
    }));

    const passMark2 = gradingScheme?.pass_mark || 50;
    const atRisk = scored
      .filter(s => s.score < passMark2)
      .map(s => ({
        studentName: s.studentName,
        score: s.score,
        gradeLetter: s.gradeLetter,
        initials: initials(s.studentName),
        avatarColor: avatarColor(s.studentName),
        severity: s.score < passMark2 * 0.6 ? 'critical' : 'at-risk',
      }));

    return {
      classAverage: avg,
      classAverageLetter: getGradeLetter(avg, boundaries),
      passRate,
      highestScore: scored[0],
      lowestScore: scored[scored.length - 1],
      distribution,
      topPerformers,
      atRisk,
      totalScored: scored.length,
    };
  }, [gradesData, gradingScheme]);

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
              {selectedClass.name} · {selectedClass.subject?.name}
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
            <option key={cls.id} value={cls.id}>{cls.name} — {cls.subject?.name}</option>
          ))}
        </select>
      </div>

      {!selectedClassId && (
        <div className="tch-empty">
          <span className="material-symbols-outlined">analytics</span>
          <p>Select a class to view analytics</p>
        </div>
      )}

      {selectedClassId && loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {[0,1,2].map(i => <div key={i} className="tch-skeleton" style={{ height: 80 }} />)}
        </div>
      )}

      {selectedClassId && !loading && !analytics && (
        <div className="tch-empty">
          <span className="material-symbols-outlined">hourglass_empty</span>
          <p>No analytics available — grades haven't been submitted yet for this class</p>
        </div>
      )}

      {/* Term-over-term performance trend */}
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

          {/* Students needing support */}
          {analytics.atRisk.length > 0 && (
            <div className="tch-card ca-at-risk-card">
              <p className="ca-section-title" style={{ margin: '0 0 12px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--tch-error)' }}>warning</span>
                Students Needing Support
                <span className="tch-badge tch-badge--red" style={{ marginLeft: 8 }}>{analytics.atRisk.length}</span>
              </p>
              <p className="ca-at-risk-sub">
                These students scored below the pass mark. Consider targeted support or communication with their parents.
              </p>
              <div className="ca-performers-list">
                {analytics.atRisk.map((s, i) => (
                  <motion.div
                    key={s.studentName}
                    className="ca-performer-row"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <span className={`ca-risk-dot ca-risk-dot--${s.severity}`} title={s.severity === 'critical' ? 'Critical' : 'At Risk'} />
                    <div className="ca-performer-avatar" style={{ background: s.avatarColor }}>
                      {s.initials}
                    </div>
                    <div className="ca-performer-info">
                      <p className="ca-performer-name">{s.studentName}</p>
                      <span className={`tch-badge ${s.severity === 'critical' ? 'tch-badge--red' : 'tch-badge--amber'}`}>
                        {s.severity === 'critical' ? 'Critical' : 'At Risk'}
                      </span>
                    </div>
                    <span className="ca-performer-score" style={{ color: 'var(--tch-error)' }}>{s.score}%</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
