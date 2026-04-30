import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import { Skeleton, SkeletonCard } from '../common/Skeleton';
import ErrorBoundary from '../common/ErrorBoundary';
import GradeAccordion from './GradeAccordion';
import './SubjectDeepDive.css';

function TrendChart({ points = [] }) {
  if (!points || points.length === 0) {
    return <p className="sdd-empty">No trend data yet — your first term is the baseline.</p>;
  }
  const W = 360, H = 140, PAD = 22;
  const max = Math.max(...points.map((p) => p.score), 100);
  const min = Math.min(...points.map((p) => p.score), 0);
  const span = Math.max(1, max - min);
  const stepX = (W - PAD * 2) / Math.max(1, points.length - 1);
  const xy = points.map((p, i) => [
    PAD + i * stepX,
    PAD + (1 - (p.score - min) / span) * (H - PAD * 2),
  ]);
  const path = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${path} L ${PAD + (points.length - 1) * stepX} ${H - PAD} L ${PAD} ${H - PAD} Z`;
  return (
    <svg className="sdd-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Score trend across terms">
      <defs>
        <linearGradient id="sdd-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#5b8cff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5b8cff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sdd-fill)" />
      <path d={path} fill="none" stroke="#5b8cff" strokeWidth="2.5" />
      {xy.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.5" fill="#5b8cff" />
          <text x={x} y={H - 5} fontSize="9" fill="currentColor" textAnchor="middle" opacity="0.6">
            {points[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function DeepDiveInner({ subjectId, navigateTo }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!subjectId) return;
    studentApi.getSubjectDeepDive(subjectId)
      .then(setData)
      .catch(() => setError('Could not load this subject.'));
  }, [subjectId]);

  if (error) {
    return (
      <div className="sdd">
        <div className="sdd__error">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="sdd">
        <Skeleton height={28} width="35%" />
        <Skeleton height={14} width="55%" style={{ marginTop: 10 }} />
        <div className="sdd__skel-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const subject = data.subject;
  const cur = data.currentGrade;

  return (
    <div className="sdd">
      <header className="sdd__header" style={{ '--subj-color': subject.color || '#5b8cff' }}>
        <button className="sdd__back" onClick={() => navigateTo?.('grades')}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="sdd__title">
          <h1>{subject.name}</h1>
          <p>{subject.code} · {data.teacher}</p>
        </div>
        {cur && (
          <div className="sdd__current">
            <span>Current</span>
            <strong>{cur.score}%</strong>
            <span className="sdd__letter">· {cur.gradeLetter}</span>
            <span className={`sdd__pill sdd__pill--${cur.status}`}>{cur.status}</span>
          </div>
        )}
      </header>

      <div className="sdd__grid">
        {/* Trend */}
        <motion.section className="sdd__card sdd__card--trend" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h3>
            <span className="material-symbols-outlined">show_chart</span>
            Score trend
          </h3>
          <TrendChart points={data.trend} />
        </motion.section>

        {/* Breakdown via reused accordion */}
        <motion.section className="sdd__card sdd__card--breakdown" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h3>
            <span className="material-symbols-outlined">calculate</span>
            CA · Mid-term · Final
          </h3>
          {data.breakdown ? (
            <GradeAccordion
              grade={{
                ...cur,
                components: {
                  ca:        { score: data.breakdown.ca?.score,      weight: data.breakdown.ca?.weight ?? 20 },
                  midterm:   { score: data.breakdown.midTerm?.score, weight: data.breakdown.midTerm?.weight ?? 20 },
                  finalExam: { score: data.breakdown.final?.score,   weight: data.breakdown.final?.weight ?? 60 },
                },
                gradeLetter: cur?.gradeLetter,
                score: cur?.score,
              }}
              target={null}
              onSetTarget={() => {}}
            />
          ) : <p className="sdd-empty">No breakdown available for this term yet.</p>}
        </motion.section>

        {/* Resources */}
        <motion.section className="sdd__card sdd__card--res" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h3>
            <span className="material-symbols-outlined">folder_open</span>
            Linked resources
          </h3>
          {data.resources?.length ? (
            <ul className="sdd-res-list">
              {data.resources.slice(0, 6).map((r, i) => (
                <li key={i}>
                  <span className="material-symbols-outlined">description</span>
                  <strong>{r.title}</strong>
                  <span>{r.size ? `${Math.round(r.size / 1024)} KB` : ''}</span>
                </li>
              ))}
            </ul>
          ) : <p className="sdd-empty">No resources linked yet.</p>}
        </motion.section>

        {/* History summary */}
        <motion.section className="sdd__card sdd__card--hist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h3>
            <span className="material-symbols-outlined">history</span>
            Recent activity
          </h3>
          {data.history?.length ? (
            <ul className="sdd-hist-list">
              {data.history.slice(-5).reverse().map((e) => (
                <li key={e.id}>
                  <span className={`sdd-evt sdd-evt--${e.eventType?.toLowerCase()}`}>{(e.eventType || 'event').replace(/_/g, ' ')}</span>
                  <span>{e.recordedBy}</span>
                  <span>{new Date(e.recordedAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : <p className="sdd-empty">No recorded activity.</p>}
        </motion.section>
      </div>
    </div>
  );
}

export default function SubjectDeepDive(props) {
  return (
    <ErrorBoundary>
      <DeepDiveInner {...props} />
    </ErrorBoundary>
  );
}
