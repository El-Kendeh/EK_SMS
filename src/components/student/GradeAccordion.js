import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './GradeAccordion.css';

/**
 * Inline expansion shown under a grade row when the user clicks the chevron.
 * Reveals CA / Mid-term / Final breakdown with weights, a target progress bar,
 * a tiny What-If calculator, and an inline What-If feedback chip.
 *
 * Component shape:
 *   grade.components = { ca: {score, weight}, midterm: {score, weight}, finalExam: {score, weight} }
 *   onSetTarget(target) — server-synced via studentApi.setGoal
 *   target — current goal (null if none)
 */
export default function GradeAccordion({ grade, target, onSetTarget }) {
  const [editingTarget, setEditingTarget] = useState(false);
  const [tmpTarget, setTmpTarget] = useState(target ?? grade.score);
  const [whatIfFinal, setWhatIfFinal] = useState(grade.components?.finalExam?.score ?? grade.score);

  const c = grade.components || {};
  const ca   = c.ca?.score ?? null;
  const mid  = c.midterm?.score ?? null;
  const fin  = c.finalExam?.score ?? null;
  const wCa  = c.ca?.weight ?? 20;
  const wMid = c.midterm?.weight ?? 20;
  const wFin = c.finalExam?.weight ?? 60;

  const composite = (s, w) => (s != null && w != null) ? (s * w) / 100 : 0;
  const total = composite(ca, wCa) + composite(mid, wMid) + composite(fin, wFin);
  const totalRounded = Math.round(total * 10) / 10;

  // What-if: keep ca, mid; vary final
  const whatIfTotal =
    composite(ca, wCa) + composite(mid, wMid) + composite(whatIfFinal, wFin);
  const whatIfDelta = whatIfTotal - total;

  const targetGap = target != null ? Math.max(0, target - totalRounded) : null;
  // Required final to meet target: target = ca*wCa/100 + mid*wMid/100 + need*wFin/100
  const requiredFinal = target != null
    ? Math.max(0, ((target - composite(ca, wCa) - composite(mid, wMid)) * 100) / wFin)
    : null;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key="acc"
        className="ga"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
      >
        <div className="ga__inner">
          {/* Component bars */}
          <div className="ga__components">
            {[
              { label: 'C.A.',     score: ca,  max: 20, weight: wCa,  tone: 'ca' },
              { label: 'Mid-term', score: mid, max: 30, weight: wMid, tone: 'mid' },
              { label: 'Final',    score: fin, max: 50, weight: wFin, tone: 'fin' },
            ].map((row) => (
              <div key={row.label} className={`ga-row ga-row--${row.tone}`}>
                <div className="ga-row__top">
                  <span className="ga-row__label">{row.label}</span>
                  <span className="ga-row__weight">{row.weight}%</span>
                  <span className="ga-row__score">
                    {row.score != null ? `${row.score}%` : '—'}
                  </span>
                </div>
                <div className="ga-row__track">
                  <div
                    className="ga-row__fill"
                    style={{ width: `${row.score ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Composite */}
          <div className="ga__composite">
            <span>Composite</span>
            <strong>{totalRounded}%</strong>
            {grade.gradeLetter && <span className="ga__letter">· {grade.gradeLetter}</span>}
          </div>

          {/* Goal tracker */}
          <div className="ga__goal">
            <div className="ga__goal-head">
              <span className="material-symbols-outlined">flag</span>
              <span>Your target</span>
              {target != null && !editingTarget && (
                <button className="ga__edit" onClick={() => setEditingTarget(true)}>
                  <span className="material-symbols-outlined">edit</span>
                </button>
              )}
            </div>
            {editingTarget || target == null ? (
              <div className="ga__goal-edit">
                <input
                  type="number" min={0} max={100}
                  value={tmpTarget}
                  onChange={(e) => setTmpTarget(Number(e.target.value))}
                />
                <button
                  className="ga__btn"
                  onClick={() => { onSetTarget?.(tmpTarget); setEditingTarget(false); }}
                >
                  Save
                </button>
              </div>
            ) : (
              <>
                <div className="ga__goal-row">
                  <strong>{target}%</strong>
                  <span>
                    {targetGap === 0
                      ? 'Target reached '
                      : `${targetGap.toFixed(1)} pts away`}
                  </span>
                </div>
                <div className="ga__goal-track">
                  <div className="ga__goal-fill" style={{ width: `${Math.min(100, (totalRounded / target) * 100)}%` }} />
                </div>
                {requiredFinal != null && fin == null && (
                  <p className="ga__hint">
                    Score <strong>{requiredFinal.toFixed(1)}%</strong> on the final to hit your goal.
                  </p>
                )}
              </>
            )}
          </div>

          {/* What-If */}
          <div className="ga__whatif">
            <div className="ga__whatif-head">
              <span className="material-symbols-outlined">bolt</span>
              <span>What-If: vary your final score</span>
            </div>
            <input
              type="range" min={0} max={100}
              value={whatIfFinal}
              onChange={(e) => setWhatIfFinal(Number(e.target.value))}
            />
            <div className="ga__whatif-result">
              At <strong>{whatIfFinal}%</strong> on the final, your composite would be{' '}
              <strong>{whatIfTotal.toFixed(1)}%</strong>{' '}
              <span className={`ga__chip ${whatIfDelta >= 0 ? 'ga__chip--up' : 'ga__chip--down'}`}>
                {whatIfDelta >= 0 ? '+' : ''}{whatIfDelta.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
