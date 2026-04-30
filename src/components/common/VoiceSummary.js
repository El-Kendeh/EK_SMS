import { useEffect, useRef, useState } from 'react';
import { studentApi } from '../../api/studentApi';
import './VoiceSummary.css';

// Browser-native TTS playback of the day's summary. No backend dependency.
// Works offline once the text is fetched. Skips silently if SpeechSynthesis is unavailable.
export default function VoiceSummary() {
  const [text, setText] = useState('');
  const [state, setState] = useState('idle'); // 'idle' | 'speaking' | 'paused'
  const [supported, setSupported] = useState(false);
  const utterRef = useRef(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    studentApi.getVoiceSummary().then((r) => setText(r?.text || '')).catch(() => {});
    return () => { try { window.speechSynthesis?.cancel(); } catch {} };
  }, []);

  if (!supported || !text) return null;

  const start = () => {
    try { window.speechSynthesis.cancel(); } catch {}
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.0;
    u.onend = () => setState('idle');
    u.onerror = () => setState('idle');
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setState('speaking');
  };
  const pause = () => { window.speechSynthesis.pause(); setState('paused'); };
  const resume = () => { window.speechSynthesis.resume(); setState('speaking'); };
  const stop = () => { window.speechSynthesis.cancel(); setState('idle'); };

  return (
    <div className={`voice-summary ${state !== 'idle' ? 'is-speaking' : ''}`}>
      <span className="material-symbols-outlined">campaign</span>
      <div className="voice-summary__body">
        <strong>Listen to today's summary</strong>
        <span>For when reading isn't convenient.</span>
      </div>
      {state === 'idle' && (
        <button onClick={start} aria-label="Play voice summary">
          <span className="material-symbols-outlined">play_arrow</span>
        </button>
      )}
      {state === 'speaking' && (
        <>
          <button onClick={pause} aria-label="Pause">
            <span className="material-symbols-outlined">pause</span>
          </button>
          <button onClick={stop} aria-label="Stop">
            <span className="material-symbols-outlined">stop</span>
          </button>
        </>
      )}
      {state === 'paused' && (
        <>
          <button onClick={resume} aria-label="Resume">
            <span className="material-symbols-outlined">play_arrow</span>
          </button>
          <button onClick={stop} aria-label="Stop">
            <span className="material-symbols-outlined">stop</span>
          </button>
        </>
      )}
    </div>
  );
}
