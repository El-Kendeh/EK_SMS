import './TermSelector.css';

export default function TermSelector({ terms, selectedTermId, onSelect, variant = 'dark' }) {
  return (
    <div className={`term-selector ${variant === 'light' ? 'term-selector--light' : ''}`}>
      {terms.map((term) => (
        <button
          key={term.id}
          className={`term-selector__btn ${
            selectedTermId === term.id ? 'term-selector__btn--active' : 'term-selector__btn--inactive'
          }`}
          onClick={() => onSelect(term.id)}
          aria-pressed={selectedTermId === term.id}
        >
          {term.name}
        </button>
      ))}
    </div>
  );
}
