import { useEffect, useMemo, useState } from 'react';
import { useActiveChild } from '../../context/ChildContext';
import { fetchChildTimetable } from '../../api/parentApi';
import './ParentTimetable.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * The parent's window into the student dashboard: the child's weekly
 * timetable, rendered from the SAME backend builder the student portal uses,
 * so what the parent sees is exactly what the child sees.
 */
export default function ParentTimetable() {
  const { activeChild } = useActiveChild();
  const [data, setData] = useState(null);   // {timetable, className, hasData}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const todayName = useMemo(() => {
    const d = new Date().getDay(); // 0 Sun … 6 Sat
    return d >= 1 && d <= 5 ? DAYS[d - 1] : DAYS[0];
  }, []);
  const [day, setDay] = useState(todayName);

  useEffect(() => {
    if (!activeChild?.id) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchChildTimetable(activeChild.id)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load timetable'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeChild?.id]);

  const slots = data?.timetable?.[day] || [];

  return (
    <div className="par-tt">
      <div className="par-tt__top">
        <div>
          <h1 className="par-page-header__title">Timetable</h1>
          <p className="par-page-header__sub">
            {data?.className ? `${data.className} · ` : ''}what <strong>{activeChild?.fullName || '—'}</strong> sees on their own dashboard
          </p>
        </div>
      </div>

      <div className="par-tt__days" role="tablist" aria-label="Day of the week">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={day === d}
            className={`par-tt__day${day === d ? ' par-tt__day--on' : ''}${d === todayName ? ' par-tt__day--today' : ''}`}
            onClick={() => setDay(d)}
          >
            {d.slice(0, 3)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="par-tt__list">
          {[0, 1, 2, 3].map((i) => <div key={i} className="par-skeleton" style={{ height: 64 }} />)}
        </div>
      )}

      {!loading && error && (
        <div className="par-empty" role="alert">
          <span className="material-symbols-outlined">error</span>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && !activeChild && (
        <div className="par-empty">
          <span className="material-symbols-outlined">family_restroom</span>
          <p>Select a child to view their timetable.</p>
        </div>
      )}

      {!loading && !error && activeChild && data?.hasData === false && (
        <div className="par-empty">
          <span className="material-symbols-outlined">calendar_month</span>
          <p>No timetable published yet for {activeChild.fullName}'s class. It appears here as soon as the school generates it.</p>
        </div>
      )}

      {!loading && !error && data?.hasData && slots.length === 0 && (
        <div className="par-empty">
          <span className="material-symbols-outlined">weekend</span>
          <p>No periods scheduled on {day}.</p>
        </div>
      )}

      {!loading && !error && slots.length > 0 && (
        <div className="par-tt__list">
          {slots.map((s) => (
            <div key={s.id} className={`par-tt__slot par-card${s.isBreak ? ' par-tt__slot--break' : ''}`}
              style={{ '--slot-color': s.color }}>
              <div className="par-tt__slot-time">
                <span>{s.time || '—'}</span>
                {s.endTime && <span className="par-tt__slot-end">{s.endTime}</span>}
              </div>
              <div className="par-tt__slot-bar" aria-hidden="true" />
              <div className="par-tt__slot-body">
                <p className="par-tt__slot-subject">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{s.icon || 'menu_book'}</span>
                  {s.subject}
                </p>
                {(s.teacher || s.room) && (
                  <p className="par-tt__slot-meta">
                    {[s.teacher, s.room && `Room ${s.room}`].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
