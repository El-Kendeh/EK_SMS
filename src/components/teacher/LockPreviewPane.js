import './LockPreviewPane.css';

// Slide-in preview for the "submit for lock" action — shows exactly what
// will become immutable, who gets notified, and how many parents.
export default function LockPreviewPane({ open, onClose, onConfirm, students = [], className, subject, term }) {
  if (!open) return null;

  const ready = students.filter((s) => s.composite != null && s.composite !== '');
  const incomplete = students.filter((s) => s.composite == null || s.composite === '');

  return (
    <>
      <div className="lpp-overlay" onClick={onClose} />
      <aside className="lpp">
        <header>
          <h3><span className="material-symbols-outlined">lock</span> Lock preview</h3>
          <button onClick={onClose} aria-label="Close"><span className="material-symbols-outlined">close</span></button>
        </header>

        <div className="lpp__body">
          <div className="lpp__summary">
            <div className="lpp__num"><strong>{ready.length}</strong><span>grades to lock</span></div>
            <div className="lpp__num"><strong>{ready.length}</strong><span>parents notified</span></div>
            <div className="lpp__num"><strong>{className || ''}</strong><span>{subject || 'Subject'} · {term || 'Term'}</span></div>
          </div>

          <h4>About to become immutable</h4>
          <ul className="lpp__ready">
            {ready.map((s) => (
              <li key={s.studentId}>
                <strong>{s.name}</strong>
                <span>{s.composite}%</span>
              </li>
            ))}
            {ready.length === 0 && <li className="lpp__empty">Nothing ready to lock yet.</li>}
          </ul>

          {incomplete.length > 0 && (
            <>
              <h4>Will stay as drafts</h4>
              <ul className="lpp__incomplete">
                {incomplete.map((s) => (
                  <li key={s.studentId}>
                    <strong>{s.name}</strong>
                    <span>—</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="lpp__warn">
            <span className="material-symbols-outlined">info</span>
            Locked grades cannot be modified silently. Any later change requires a Modification Request
            with evidence, and creates an audit-trail event visible to the student, parent, and admin.
          </p>
        </div>

        <footer>
          <button className="lpp-btn lpp-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="lpp-btn lpp-btn--primary" onClick={onConfirm} disabled={ready.length === 0}>
            <span className="material-symbols-outlined">lock</span>
            Lock {ready.length} grade{ready.length === 1 ? '' : 's'}
          </button>
        </footer>
      </aside>
    </>
  );
}
