import React, { useEffect, useState } from 'react';
import ApiClient from '../../../api/client';
import { RELATIONSHIPS } from './utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function LinkStudentModal({ parent, onClose, onLinked }) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [rel,      setRel]      = useState(parent?.relationshipNorm || 'Mother');
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState('');
  const [ok,       setOk]       = useState('');

  /* Debounced student search — by name or admission number */
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      setLoading(true);
      ApiClient.get(`/api/school/students/?q=${encodeURIComponent(query.trim())}`)
        .then(d => {
          const list  = (d.students || []);
          const lower = query.trim().toLowerCase();
          const matches = list.filter(s => {
            const name = (s.full_name || s.name || '').toLowerCase();
            const adm  = (s.admission_number || s.admission || '').toLowerCase();
            return name.includes(lower) || adm.includes(lower);
          });
          setResults(matches.slice(0, 8));
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const alreadyLinked = (sid) => (parent?.children || []).some(c => String(c.id) === String(sid));

  const studentLabel = (s) => s?.full_name || s?.name || 'Student';
  const studentClass = (s) => s?.classroom || s?.classroom_name || s?.class || 'No class';
  const studentAdm   = (s) => s?.admission_number || s?.admission || '—';

  const submit = async () => {
    if (!selected) { setErr('Pick a student first.'); return; }
    if (alreadyLinked(selected.id)) { setErr('This student is already linked to this parent.'); return; }
    setBusy(true); setErr(''); setOk('');
    try {
      await ApiClient.post(`/api/school/students/${selected.id}/parents/`, {
        parent_id: parent.id,
        relationship_type: rel,
        is_primary_contact: false,
      });
      setOk(`${studentLabel(selected)} linked to ${parent.name} as ${rel}.`);
      setTimeout(() => { onLinked && onLinked(); onClose(); }, 700);
    } catch (e) {
      setErr(e.message || 'Failed to link student.');
    } finally { setBusy(false); }
  };

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal ska-modal--wide" onClick={e => e.stopPropagation()}>
        <div className="ska-modal-head">
          <div>
            <h3 className="ska-modal-title">Link Student to {parent.name}</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
              Search and pick a student, then choose the relationship.
            </p>
          </div>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>

        <div className="ska-modal-body">
          {err && <div className="ska-prnt-banner ska-prnt-banner--err"><Ic name="error" size="sm" /> {err}</div>}
          {ok  && <div className="ska-prnt-banner ska-prnt-banner--ok"><Ic name="check_circle" size="sm" /> {ok}</div>}

          <div className="ska-form-group" style={{ marginBottom: 14 }}>
            <span>Search Student</span>
            <div style={{ position: 'relative' }}>
              <Ic name="search" size="sm" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ska-text-3)' }} />
              <input
                className="ska-input"
                placeholder="Name or admission number…"
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null); }}
                style={{ paddingLeft: 38, width: '100%' }}
                autoFocus
              />
            </div>
          </div>

          {/* Result list */}
          {query.trim() && (
            <div className="ska-prnt-link-results">
              {loading ? (
                <div className="ska-prnt-link-empty">Searching…</div>
              ) : results.length === 0 ? (
                <div className="ska-prnt-link-empty">No students match “{query}”.</div>
              ) : results.map(s => {
                const taken = alreadyLinked(s.id);
                const active = selected?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={taken}
                    onClick={() => setSelected(s)}
                    className={`ska-prnt-link-row ${active ? 'is-active' : ''} ${taken ? 'is-disabled' : ''}`}
                  >
                    <div className="ska-prnt-link-row__avatar"><Ic name="person" /></div>
                    <div className="ska-prnt-link-row__info">
                      <strong>{studentLabel(s)}</strong>
                      <span>{studentClass(s)} · {studentAdm(s)}</span>
                    </div>
                    {taken
                      ? <span className="ska-badge ska-badge--inactive">Already linked</span>
                      : active
                        ? <Ic name="check_circle" style={{ color: 'var(--ska-green)' }} />
                        : <Ic name="add_circle" style={{ color: 'var(--ska-primary)' }} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Preview */}
          {selected && (
            <div className="ska-prnt-link-preview">
              <div className="ska-prnt-link-preview__title">Linking preview</div>
              <div className="ska-prnt-link-preview__row">
                <div>
                  <span>Student</span>
                  <strong>{studentLabel(selected)}</strong>
                  <small>{studentClass(selected)}</small>
                </div>
                <Ic name="trending_flat" style={{ color: 'var(--ska-text-3)' }} />
                <div>
                  <span>Parent</span>
                  <strong>{parent.name}</strong>
                  <small>{parent.email}</small>
                </div>
              </div>

              <div className="ska-form-group" style={{ marginTop: 14 }}>
                <span>Relationship</span>
                <div className="ska-prnt-rel-row">
                  {RELATIONSHIPS.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRel(r)}
                      className={`ska-prnt-rel-btn ${rel === r ? 'is-active' : ''}`}
                    >
                      <Ic name={r === 'Mother' ? 'female' : r === 'Father' ? 'male' : 'shield_person'} size="sm" /> {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ska-modal-actions">
          <button className="ska-btn ska-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="ska-btn ska-btn--primary" onClick={submit} disabled={busy || !selected}>
            <Ic name="link" size="sm" /> {busy ? 'Linking…' : 'Confirm Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
