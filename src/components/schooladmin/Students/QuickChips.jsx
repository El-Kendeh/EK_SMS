import React from 'react';

/**
 * Tap-to-fill chip row — used for nationality, religion, language, etc.
 * Doesn't replace the input, just seeds it.
 */
export default function QuickChips({ options = [], value, onPick }) {
  if (!options.length) return null;
  return (
    <div className="stu-chiprow">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          className={`stu-chip ${value === opt ? 'is-active' : ''}`}
          onClick={() => onPick(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
