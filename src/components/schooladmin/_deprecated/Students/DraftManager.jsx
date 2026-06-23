import React from 'react';
import { listDrafts, deleteDraft, clearAllDrafts, relTimeFromNow } from './students.utils';
import { FORM_STEPS } from './students.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function DraftManager({ onRestore, onClose }) {
  const [drafts, setDrafts] = React.useState(() => listDrafts().reverse());

  const refresh = () => setDrafts(listDrafts().reverse());

  const handleDelete = (id) => {
    deleteDraft(id);
    refresh();
  };

  const handleClearAll = () => {
    if (!window.confirm('Delete all saved drafts? This cannot be undone.')) return;
    clearAllDrafts();
    refresh();
  };

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal stu-dm" onClick={e => e.stopPropagation()}>
        <div className="ska-modal-head">
          <div>
            <h3 className="ska-modal-title"><Ic name="drafts" size="sm" /> Saved drafts</h3>
            <p className="stu-dm__sub">{drafts.length} draft{drafts.length !== 1 ? 's' : ''} saved locally</p>
          </div>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>

        <div className="ska-modal-body stu-dm__body">
          {drafts.length === 0 ? (
            <div className="stu-dm__empty">
              <Ic name="inbox" style={{ fontSize: 36, color: 'var(--ska-text-3)' }} />
              <p>No saved drafts. Start a new student form and it will auto-save as you type.</p>
            </div>
          ) : (
            <div className="stu-dm__list">
              {drafts.map(d => {
                const stepLabel = FORM_STEPS[d.step]?.label || `Step ${d.step + 1}`;
                return (
                  <div key={d.id} className="stu-dm__item">
                    <div className="stu-dm__item-info">
                      <strong className="stu-dm__item-name">{d.label}</strong>
                      <span className="stu-dm__item-meta">
                        <Ic name="schedule" size="sm" /> {relTimeFromNow(d.savedAt)}
                        &nbsp;·&nbsp;
                        <Ic name={FORM_STEPS[d.step]?.icon || 'article'} size="sm" /> stopped at {stepLabel}
                      </span>
                    </div>
                    <div className="stu-dm__item-actions">
                      <button className="ska-btn ska-btn--primary ska-btn--sm"
                        onClick={() => { onRestore(d); onClose(); }}>
                        <Ic name="restore" size="sm" /> Restore
                      </button>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm"
                        onClick={() => handleDelete(d.id)}
                        title="Delete draft">
                        <Ic name="delete" size="sm" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="ska-modal-actions">
          {drafts.length > 0 && (
            <button className="ska-btn ska-btn--ghost stu-dm__clear" onClick={handleClearAll}>
              <Ic name="delete_sweep" size="sm" /> Clear all drafts
            </button>
          )}
          <button className="ska-btn ska-btn--ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
