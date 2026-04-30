import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { teacherApi } from '../../api/teacherApi';
import { useTeacher } from '../../context/TeacherContext';
import { useAutoSave } from '../../hooks/useAutoSave';
import { Skeleton } from '../common/Skeleton';
import './LessonPlans.css';

export default function LessonPlans() {
  const { selectedClass } = useTeacher();
  const classId = selectedClass?.id || null;
  const [plans, setPlans] = useState(null);
  const [openPlan, setOpenPlan] = useState(null);
  const [error, setError] = useState(null);

  // Composer auto-save (per-class draft)
  const draftKey = `lessonplan_${classId || 'none'}`;
  const [draft, setDraft, draftMeta] = useAutoSave(draftKey, '');

  useEffect(() => {
    if (!classId) { setPlans([]); return; }
    teacherApi.getLessonPlans({ classId }).then(setPlans).catch(() => setError('Could not load plans.'));
  }, [classId]);

  const open = (plan) => {
    setOpenPlan(plan || { classId, subjectId: selectedClass?.subjectId, title: '', weekOf: '', objectives: [], homework: '', resources: [] });
  };

  const save = async () => {
    if (!openPlan) return;
    const payload = { ...openPlan };
    if (draft) {
      // preserve raw draft as-is into objectives if user used the textarea
      payload.objectives = draft.split('\n').map((s) => s.trim()).filter(Boolean);
    }
    try {
      await teacherApi.upsertLessonPlan(payload);
      draftMeta.clear();
      setOpenPlan(null);
      teacherApi.getLessonPlans({ classId }).then(setPlans);
    } catch { setError('Could not save plan.'); }
  };

  if (!classId) return <div className="lp__empty"><p>Select a class first.</p></div>;
  if (!plans) return <div className="lp"><Skeleton height={200} radius={14} /></div>;

  return (
    <div className="lp">
      <header>
        <h2><span className="material-symbols-outlined">menu_book</span> Lesson plans</h2>
        <p>Plans are visible to school admin (oversight) and read-only to parents linked to this class.</p>
      </header>

      {error && <p className="lp__error">{error}</p>}

      <button className="lp__add" onClick={() => open(null)}>
        <span className="material-symbols-outlined">add</span> New plan
      </button>

      <ul className="lp__list">
        {plans.map((p) => (
          <motion.li key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onClick={() => open(p)}>
            <div className="lp__icon"><span className="material-symbols-outlined">menu_book</span></div>
            <div className="lp__body">
              <strong>{p.title}</strong>
              <span>Week of {p.weekOf || '—'}</span>
              {p.objectives?.length > 0 && <small>{p.objectives.length} objective{p.objectives.length === 1 ? '' : 's'}</small>}
            </div>
            <span className="material-symbols-outlined lp__chev">chevron_right</span>
          </motion.li>
        ))}
        {plans.length === 0 && <li className="lp__empty-row">No lesson plans for this class yet.</li>}
      </ul>

      {openPlan && (
        <div className="lp-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpenPlan(null); }}>
          <motion.div className="lp-modal" initial={{ scale: 0.94 }} animate={{ scale: 1 }}>
            <header>
              <h3>{openPlan.id ? 'Edit plan' : 'New plan'}</h3>
              <button onClick={() => setOpenPlan(null)} aria-label="Close"><span className="material-symbols-outlined">close</span></button>
            </header>
            <div className="lp-modal__body">
              <label><span>Title</span><input value={openPlan.title} onChange={(e) => setOpenPlan({ ...openPlan, title: e.target.value })} /></label>
              <label><span>Week of</span><input type="date" value={openPlan.weekOf} onChange={(e) => setOpenPlan({ ...openPlan, weekOf: e.target.value })} /></label>
              <label>
                <span>Objectives <em>(one per line)</em></span>
                <textarea
                  rows={5}
                  value={draft || (openPlan.objectives || []).join('\n')}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Recognise quadratic patterns&#10;Apply factoring techniques&#10;…"
                />
                {draftMeta.restored && <small className="lp__restored"><span className="material-symbols-outlined">save</span> Draft restored</small>}
              </label>
              <label><span>Homework</span><input value={openPlan.homework} onChange={(e) => setOpenPlan({ ...openPlan, homework: e.target.value })} placeholder="Page 84, exercises 1-10" /></label>
              <div className="lp-modal__actions">
                <button className="lp__btn lp__btn--ghost" onClick={() => setOpenPlan(null)}>Cancel</button>
                <button className="lp__btn lp__btn--primary" onClick={save}>Save plan</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
