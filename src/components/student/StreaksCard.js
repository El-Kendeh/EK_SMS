import { useEffect, useState } from 'react';
import { studentApi } from '../../api/studentApi';
import { Skeleton } from '../common/Skeleton';
import './StreaksCard.css';

export default function StreaksCard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    studentApi.getStreaks()
      .then(setS)
      .catch(() => setError(true));
  }, []);

  if (error) return null;
  if (!s) return <Skeleton height={140} radius={14} />;

  return (
    <div className="streaks-card">
      <h3>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
        Streaks
      </h3>
      <div className="streaks-card__row">
        <div className="streaks-card__cell">
          <strong>{s.attendanceStreak}</strong>
          <span>day attendance streak</span>
        </div>
        <div className="streaks-card__cell">
          <strong>{s.onTimeAssignments}</strong>
          <span>on-time submissions</span>
        </div>
        {s.noLateThisMonth && (
          <div className="streaks-card__cell streaks-card__cell--badge">
            <span className="material-symbols-outlined">verified</span>
            <span>No late arrivals this month</span>
          </div>
        )}
      </div>
      {s.bestSubject && (
        <p className="streaks-card__hint">
          Strongest subject this term: <strong>{s.bestSubject}</strong> · longest streak {s.longestStreak} days
        </p>
      )}
    </div>
  );
}
