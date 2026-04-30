import { useEffect, useState } from 'react';
import { teacherApi } from '../../api/teacherApi';
import { Skeleton } from '../common/Skeleton';
import './PersonalPerformance.css';

function TrendChart({ points = [] }) {
  if (points.length === 0) return <p className="pp-empty">No history yet.</p>;
  const W = 360, H = 140, PAD = 22;
  const max = Math.max(...points.map((p) => p.value), 100);
  const min = Math.min(...points.map((p) => p.value), 0);
  const span = Math.max(1, max - min);
  const stepX = (W - PAD * 2) / Math.max(1, points.length - 1);
  const xy = points.map((p, i) => [PAD + i * stepX, PAD + (1 - (p.value - min) / span) * (H - PAD * 2)]);
  const path = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${path} L ${PAD + (points.length - 1) * stepX} ${H - PAD} L ${PAD} ${H - PAD} Z`;
  return (
    <svg className="pp-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Class average over terms">
      <defs>
        <linearGradient id="pp-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor="#5b8cff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5b8cff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#pp-fill)" />
      <path d={path} fill="none" stroke="#5b8cff" strokeWidth="2.5" />
      {xy.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.5" fill="#5b8cff" />
          <text x={x} y={H - 5} fontSize="8.5" fill="currentColor" textAnchor="middle" opacity="0.6">
            {points[i].term}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function PersonalPerformance() {
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    teacherApi.getPersonalPerformance().then(setD).catch(() => setError('Could not load.'));
  }, []);

  if (!d && !error) return <div className="pp"><Skeleton height={380} radius={14} /></div>;
  if (error) return <p className="pp__error">{error}</p>;

  return (
    <div className="pp">
      <header>
        <h2><span className="material-symbols-outlined">leaderboard</span> My performance</h2>
        <p>How my classes have been doing, and the signals admin sees about my work.</p>
      </header>

      <div className="pp__grid">
        <section className="pp__card pp__card--trend">
          <h3>Class average — term over term</h3>
          <TrendChart points={d.classAverages} />
        </section>

        <section className="pp__card">
          <h3>Grading timeliness</h3>
          <div className="pp__big">
            <strong>{d.gradingTimelinessDays}d</strong>
            <span>average from "due" to "submitted"</span>
          </div>
        </section>

        <section className="pp__card">
          <h3>Parent feedback</h3>
          <div className="pp__big">
            <strong>{d.parentFeedbackAvg}/5</strong>
            <span>across {d.parentFeedbackCount} responses</span>
          </div>
        </section>

        <section className="pp__card">
          <h3>Attendance timeliness</h3>
          <div className="pp__big">
            <strong>{d.attendanceTimelinessPct}%</strong>
            <span>of registers closed on time</span>
          </div>
        </section>
      </div>
    </div>
  );
}
