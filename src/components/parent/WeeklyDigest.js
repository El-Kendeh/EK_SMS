import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchWeeklyDigest, fetchVoiceDigest } from '../../api/parentApi';
import { useActiveChild } from '../../context/ChildContext';
import { Skeleton } from '../common/Skeleton';
import './WeeklyDigest.css';

export default function WeeklyDigest() {
  const { children = [] } = useActiveChild();
  const [data, setData] = useState(null);
  const [voice, setVoice] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    fetchWeeklyDigest().then(setData).catch(() => {});
    fetchVoiceDigest().then((v) => setVoice(v?.text)).catch(() => {});
  }, []);

  const speak = () => {
    if (!('speechSynthesis' in window) || !voice) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(voice);
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const stop = () => { window.speechSynthesis.cancel(); setSpeaking(false); };

  if (!data) return <div className="wdig"><Skeleton height={300} radius={14} /></div>;

  return (
    <div className="wdig">
      <header>
        <h2><span className="material-symbols-outlined">auto_awesome</span> Weekly digest</h2>
        <p>Week of {new Date(data.weekOf).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. AI-summarised so you can scan in 30 seconds.</p>
      </header>

      <div className="wdig__voice">
        <span className="material-symbols-outlined">campaign</span>
        <div className="wdig__voice-body">
          <strong>Listen to this digest</strong>
          <span>For when reading isn't convenient — uses your phone's voice.</span>
        </div>
        {!speaking ? (
          <button onClick={speak} disabled={!voice} aria-label="Play"><span className="material-symbols-outlined">play_arrow</span></button>
        ) : (
          <button onClick={stop} aria-label="Stop"><span className="material-symbols-outlined">stop</span></button>
        )}
      </div>

      <p className="wdig__summary">{data.summary}</p>

      <div className="wdig__grid">
        {Object.entries(data.perChild || {}).map(([cid, info], i) => {
          const c = children.find((x) => x.id === cid);
          return (
            <motion.div key={cid} className="wdig__card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <header>
                <strong>{c?.fullName || cid}</strong>
                <span>{info.attendancePct}% attendance · {info.assignmentsGraded} graded</span>
              </header>
              <dl>
                <div><dt>Avg score</dt><dd>{info.avgScore}%</dd></div>
                <div><dt>Missed homework</dt><dd>{info.missedHomework}</dd></div>
              </dl>
              {info.flagged?.length > 0 && (
                <ul className="wdig__flags">
                  {info.flagged.map((f, j) => (
                    <li key={j}><span className="material-symbols-outlined">flag</span> {f}</li>
                  ))}
                </ul>
              )}
              <p className="wdig__highlight">{info.highlight}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
