import React from 'react';
import { PU_QUICK_ACTIONS } from './principal.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Quick Actions — 4 executive shortcuts. The `onAction` callback is fired
 * with the action's `target` page key so the parent can navigate.
 */
export default function QuickActions({ onAction }) {
  return (
    <div className="pu-card pu-quick">
      <div className="pu-card__head">
        <div className="pu-card__title">
          <Ic name="bolt" size="sm" />
          <strong>Quick Actions</strong>
        </div>
        <span className="pu-card__sub">Frequently used</span>
      </div>
      <div className="pu-quick__grid">
        {PU_QUICK_ACTIONS.map(a => (
          <button key={a.key} type="button"
            className={`pu-quick__btn pu-quick__btn--${a.tone}`}
            onClick={() => onAction && onAction(a.target)}>
            <div className="pu-quick__icon">
              <Ic name={a.icon} />
            </div>
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
