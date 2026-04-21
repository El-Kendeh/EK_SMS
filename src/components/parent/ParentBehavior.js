import { useState } from 'react';
import { motion } from 'framer-motion';
import { useParentChildren } from '../../hooks/useParentChildren';
import { getChildColors } from '../../utils/parentUtils';
import { mockBehaviorByChild } from '../../mock/parentMockData';
import './ParentBehavior.css';

const TYPE_META = {
  commendation:    { label: 'Commendation',    color: 'success',  dot: 'var(--par-primary)', icon: 'emoji_events' },
  policy_violation:{ label: 'Policy Violation', color: 'warning',  dot: '#F59E0B',            icon: 'policy' },
  disciplinary:    { label: 'Disciplinary Note',color: 'danger',   dot: 'var(--par-error)',   icon: 'gavel' },
};

export default function ParentBehavior() {
  const { children } = useParentChildren();
  const [selectedChildId, setSelectedChildId] = useState(null);

  const activeChild = children.find((c) => c.id === selectedChildId) || children[0];
  const entries = mockBehaviorByChild[activeChild?.id] || [];
  const commendations = entries.filter((e) => e.type === 'commendation').length;
  const violations = entries.filter((e) => e.type !== 'commendation').length;

  return (
    <div className="par-behavior">
      {/* Trust banner */}
      <div className="par-behavior__trust">
        <div className="par-behavior__trust-inner">
          <span className="par-behavior__trust-chip">Security Protocol Alpha</span>
          <h2 className="par-behavior__trust-title">Permanent record of student conduct</h2>
          <p className="par-behavior__trust-sub">This ledger is cryptographically timestamped and cannot be altered by third-party agents.</p>
        </div>
        <span className="material-symbols-outlined par-behavior__trust-icon"
          style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
      </div>

      {/* Header */}
      <div className="par-behavior__header">
        <div>
          <h1 className="par-page-header__title">Behavioural Ledger</h1>
          <p className="par-page-header__sub">
            {commendations} commendation{commendations !== 1 ? 's' : ''} · {violations} notation{violations !== 1 ? 's' : ''} this term
          </p>
        </div>
        {children.length > 1 && (
          <div className="par-child-tabs">
            {children.map((child, idx) => {
              const colors = getChildColors(child.colorIndex ?? idx);
              const isActive = (selectedChildId || children[0]?.id) === child.id;
              return (
                <button key={child.id}
                  className={`par-child-tab ${isActive ? 'par-child-tab--active' : ''}`}
                  onClick={() => setSelectedChildId(child.id)}>
                  <span className="par-child-tab__dot" style={{ background: colors.bg }} />
                  {child.fullName.split(' ')[0]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="par-behavior__timeline">
        <div className="par-behavior__timeline-line" />
        {entries.length === 0 ? (
          <div className="par-empty">
            <span className="material-symbols-outlined">gavel</span>
            <p>No behavioural records for this term.</p>
          </div>
        ) : (
          entries.map((entry, idx) => {
            const meta = TYPE_META[entry.type] || TYPE_META.commendation;
            return (
              <motion.div key={entry.id}
                className="par-behavior__entry"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, delay: idx * 0.08 }}>
                <div className="par-behavior__dot" style={{ background: meta.dot }} />
                <div className={`par-card par-card--pad par-behavior__card`}>
                  <div className="par-behavior__card-top">
                    <div>
                      <span className={`par-behavior__type-chip par-behavior__type-chip--${meta.color}`}>
                        {meta.label}
                      </span>
                      <h3 className="par-behavior__card-title">{entry.title}</h3>
                    </div>
                    <div className="par-behavior__card-meta">
                      <div className="par-behavior__verified">
                        <span className="material-symbols-outlined"
                          style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>verified</span>
                        Ledger Confirmed
                      </div>
                      <span className="par-behavior__date">
                        {new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                        {' · '}
                        {new Date(entry.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <p className="par-behavior__card-desc">{entry.description}</p>
                  <div className="par-behavior__card-footer">
                    <div className="par-behavior__teacher-avatar">
                      {entry.teacher.split(' ').pop()[0]}
                    </div>
                    <span className="par-behavior__teacher-name">{entry.teacher}</span>
                    <span className="par-behavior__teacher-role">· {entry.teacherRole}</span>
                    <span className="par-behavior__ref">ID: {entry.refId}</span>
                  </div>
                  <span className="material-symbols-outlined par-behavior__lock-icon">lock</span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
