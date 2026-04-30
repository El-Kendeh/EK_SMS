import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { teacherApi } from '../../api/teacherApi';
import { useTeacher } from '../../context/TeacherContext';
import { Skeleton } from '../common/Skeleton';
import './BehaviourIncidents.css';

const TYPES = [
  { id: 'late',          label: 'Lateness',         tone: 'warn'    },
  { id: 'disruption',    label: 'Class disruption', tone: 'warn'    },
  { id: 'fight',         label: 'Fight',            tone: 'danger'  },
  { id: 'damage',        label: 'Property damage',  tone: 'danger'  },
  { id: 'absence',       label: 'Unexcused absence',tone: 'warn'    },
  { id: 'commendation',  label: 'Commendation',     tone: 'positive'},
  { id: 'other',         label: 'Other',            tone: 'neutral' },
];
const SEVERITIES = ['positive', 'low', 'medium', 'high'];

export default function BehaviourIncidents() {
  const { selectedClass } = useTeacher();
  const [students, setStudents] = useState([]);
  const [incidents, setIncidents] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    studentId: '', type: 'late', severity: 'low', title: '', notes: '', evidenceFiles: [],
  });
  const fileRef = useRef(null);

  useEffect(() => {
    teacherApi.getBehaviourIncidents().then(setIncidents).catch(() => setError('Could not load incidents.'));
  }, []);

  useEffect(() => {
    if (!selectedClass?.id) return;
    teacherApi.getClassStudents(selectedClass.id).then((data) => {
      setStudents(Array.isArray(data) ? data : (data?.students || []));
    }).catch(() => {});
  }, [selectedClass?.id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.title) return;
    setBusy(true); setError(null);
    try {
      await teacherApi.fileBehaviourIncident(form);
      setAdding(false);
      setForm({ studentId: '', type: 'late', severity: 'low', title: '', notes: '', evidenceFiles: [] });
      if (fileRef.current) fileRef.current.value = '';
      teacherApi.getBehaviourIncidents().then(setIncidents);
    } catch { setError('Could not file incident.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="bhi">
      <header>
        <h2><span className="material-symbols-outlined">report</span> Behaviour log</h2>
        <p>File commendations and incidents. Each entry auto-notifies the parent and lands in the audit trail.</p>
      </header>

      {!incidents && <Skeleton height={240} radius={14} />}
      {error && <p className="bhi__error">{error}</p>}

      {!adding ? (
        <button className="bhi__add" onClick={() => setAdding(true)}>
          <span className="material-symbols-outlined">add</span> File incident
        </button>
      ) : (
        <motion.form className="bhi__form" onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h3>New incident</h3>
          <label>
            <span>Student</span>
            <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required>
              <option value="">Choose…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName || s.full_name || `${s.first_name || ''} ${s.last_name || ''}`}</option>
              ))}
            </select>
          </label>
          <div className="bhi__row">
            <label>
              <span>Type</span>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
            <label>
              <span>Severity</span>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label>
            <span>Title</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="One-line summary" />
          </label>
          <label>
            <span>Notes</span>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Context, witnesses, any relevant detail." />
          </label>
          <label>
            <span>Evidence (optional)</span>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              capture="environment"
              onChange={(e) => setForm({ ...form, evidenceFiles: Array.from(e.target.files || []) })}
            />
            <small>Photos use the device camera if you allow it.</small>
          </label>
          <div className="bhi__form-actions">
            <button type="button" className="bhi__btn bhi__btn--ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="bhi__btn bhi__btn--primary" disabled={busy}>
              {busy ? 'Filing…' : 'File incident'}
            </button>
          </div>
        </motion.form>
      )}

      <h3 className="bhi__title">Recent incidents</h3>
      <ul className="bhi__list">
        <AnimatePresence>
          {(incidents || []).map((inc) => {
            const t = TYPES.find((x) => x.id === inc.type) || { label: inc.type, tone: 'neutral' };
            const student = students.find((s) => s.id === inc.studentId);
            return (
              <motion.li
                key={inc.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`bhi__item bhi__item--${t.tone}`}
              >
                <div className="bhi__item-icon">
                  <span className="material-symbols-outlined">{t.tone === 'positive' ? 'thumb_up' : 'flag'}</span>
                </div>
                <div className="bhi__item-body">
                  <strong>{inc.title}</strong>
                  <span>{student?.fullName || student?.full_name || inc.studentId} · {t.label} · {inc.severity}</span>
                  {inc.notes && <p>{inc.notes}</p>}
                </div>
                <span className="bhi__item-time">{new Date(inc.reportedAt).toLocaleDateString()}</span>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {incidents && incidents.length === 0 && <li className="bhi__empty">No incidents filed yet.</li>}
      </ul>
    </div>
  );
}
