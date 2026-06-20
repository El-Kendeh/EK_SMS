import { useTheme } from '../../context/ThemeContext';
import './AccessibilityControls.css';

export default function AccessibilityControls({ compact = false }) {
  const { contrast, toggleContrast, colorBlind, toggleColorBlind } = useTheme();

  return (
    <div className={`a11y ${compact ? 'a11y--compact' : ''}`} role="group" aria-label="Display preferences">
      <button
        className={`a11y__btn ${contrast === 'high' ? 'is-active' : ''}`}
        onClick={toggleContrast}
        title="Toggle high-contrast"
        aria-pressed={contrast === 'high'}
      >
        <span className="material-symbols-outlined">contrast</span>
        {!compact && <span>High contrast</span>}
      </button>

      <button
        className={`a11y__btn ${colorBlind === 'on' ? 'is-active' : ''}`}
        onClick={toggleColorBlind}
        title="Toggle color-blind safe palette"
        aria-pressed={colorBlind === 'on'}
      >
        <span className="material-symbols-outlined">visibility</span>
        {!compact && <span>Colour-blind</span>}
      </button>
    </div>
  );
}
