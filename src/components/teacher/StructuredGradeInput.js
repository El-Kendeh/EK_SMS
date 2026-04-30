import { useEffect, useState, useRef } from 'react';
import { useAutoSave } from '../../hooks/useAutoSave';
import './StructuredGradeInput.css';

/**
 * Per-student structured grade input — three components (CA · Mid · Final)
 * with computed weighted total. Replaces the single-score input on GradeEntry.
 *
 * Props:
 *   value: { ca, midterm, final }   — current draft
 *   onChange(next)                   — fires on every keystroke
 *   weights: { ca, midterm, final }  — defaults to 20/20/60 (matches mock)
 *   maxes:   { ca, midterm, final }  — defaults to 20/30/50 (matches mock)
 *   target?: number                  — student's self-set goal (shown if provided)
 *   onVoiceRemark?(text)             — optional voice-to-text remark callback
 */
export default function StructuredGradeInput({
  value = {},
  onChange,
  weights = { ca: 20, midterm: 20, final: 60 },
  maxes = { ca: 20, midterm: 30, final: 50 },
  target,
  studentId,
}) {
  const [draft, setDraft, draftMeta] = useAutoSave(`tgrade_${studentId || 'tmp'}`, JSON.stringify(value));
  const composite = (s, w) => (s != null && s !== '' && w != null) ? (Number(s) * w) / 100 : 0;
  const ca  = value.ca  ?? '';
  const mid = value.midterm ?? '';
  const fin = value.final ?? '';
  const total = composite(ca, weights.ca) + composite(mid, weights.midterm) + composite(fin, weights.final);
  const totalRounded = Math.round(total * 10) / 10;

  // Hide useAutoSave usage details — we only use it as a passive autosave hook below
  // so re-renders aren't triggered by `draft` changes — fire-and-forget.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setDraft(JSON.stringify(value)); }, [value.ca, value.midterm, value.final]);
  void draft; void draftMeta;

  const update = (field, raw) => {
    const next = { ...value, [field]: raw === '' ? '' : Number(raw) };
    onChange?.(next);
  };

  return (
    <div className="sgi">
      <div className="sgi__grid">
        {[
          { key: 'ca',      label: 'C.A.',     w: weights.ca,      max: maxes.ca,      val: ca },
          { key: 'midterm', label: 'Mid-term', w: weights.midterm, max: maxes.midterm, val: mid },
          { key: 'final',   label: 'Final',    w: weights.final,   max: maxes.final,   val: fin },
        ].map((c) => (
          <label key={c.key} className="sgi__cell">
            <span>
              {c.label} <em>({c.w}% · /{c.max})</em>
            </span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={c.val}
              placeholder="—"
              onChange={(e) => update(c.key, e.target.value)}
            />
          </label>
        ))}
        <div className="sgi__total">
          <span>Composite</span>
          <strong>{totalRounded || '—'}{totalRounded ? '%' : ''}</strong>
        </div>
        {target != null && (
          <div className={`sgi__target ${totalRounded >= target ? 'sgi__target--hit' : ''}`}>
            <span className="material-symbols-outlined">flag</span>
            Student target: {target}%
            {totalRounded >= target && <em>· hit</em>}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Voice-to-text remarks input — long-press to dictate.
 * Falls back to a normal textarea when SpeechRecognition is unavailable.
 */
export function VoiceRemarkField({ value, onChange, placeholder }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef(null);

  useEffect(() => {
    const Sup = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!Sup);
  }, []);

  const start = () => {
    const Sup = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Sup) return;
    const rec = new Sup();
    rec.lang = 'en-GB';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript || '';
      onChange?.((value || '') + (value ? ' ' : '') + text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const stop = () => { try { recRef.current?.stop(); } catch {} };

  return (
    <div className="sgi-remark">
      <textarea
        rows={1}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder || 'Optional remark…'}
      />
      {supported && (
        <button
          type="button"
          className={`sgi-remark__voice ${listening ? 'is-listening' : ''}`}
          onClick={listening ? stop : start}
          title={listening ? 'Stop dictation' : 'Dictate'}
          aria-pressed={listening}
        >
          <span className="material-symbols-outlined">{listening ? 'mic' : 'mic_none'}</span>
        </button>
      )}
    </div>
  );
}
