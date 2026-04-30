import React, { useEffect, useRef } from 'react';
import { FORM_STEPS } from './students.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Sticky step bar with scroll-spy: when the wizard advances, the active
 * step is auto-scrolled into view (fixes the mobile bug where the active
 * step could sit off-screen).
 */
export default function StepBar({ steps = FORM_STEPS, current, onJump }) {
  const refs = useRef([]);

  useEffect(() => {
    const node = refs.current[current];
    if (node?.scrollIntoView) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [current]);

  return (
    <div className="stu-stepbar">
      {steps.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.key}>
            <button
              ref={el => { refs.current[i] = el; }}
              type="button"
              onClick={() => onJump && onJump(i)}
              className={`stu-stepbar__step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}
              aria-current={active ? 'step' : undefined}
            >
              <span className="stu-stepbar__dot">
                {done ? <Ic name="check" size="sm" /> : <Ic name={step.icon} size="sm" />}
              </span>
              <span className="stu-stepbar__label">{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`stu-stepbar__connector ${done ? 'is-done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
