import { motion } from 'framer-motion';
import { validateScore, getStatusConfig } from '../../utils/gradeUtils';
import { formatRelativeTime } from '../../utils/teacherUtils';
import './GradeEntryRow.css';

export default function GradeEntryRow({
  index,
  student,
  localScore,
  localRemarks,
  computedGradeLetter,
  scheme,
  isSelected,
  canSelect,
  onToggleSelect,
  onScoreChange,
  onRemarksChange,
  onViewHistory,
  onRequestMod,
  tabIndex,
}) {
  const grade = student.currentGrade;
  const isLocked = grade.status === 'locked';
  const validation = validateScore(localScore);
  const statusCfg = getStatusConfig(grade.status);

  const gradeLetter = isLocked ? grade.gradeLetter : computedGradeLetter;

  const gradeColor = gradeLetter && scheme
    ? (scheme.boundaries.find(b => b.letter === gradeLetter)?.color || 'var(--tch-text-secondary)')
    : 'var(--tch-text-secondary)';

  return (
    <motion.tr
      className={`ge-row ${isLocked ? 'ge-row--locked' : ''} ${isSelected ? 'ge-row--selected' : ''}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Index / Checkbox */}
      <td>
        {!isLocked && canSelect ? (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="ge-checkbox"
            aria-label={`Select ${student.fullName}`}
          />
        ) : (
          <span className="ge-row__index">{index}</span>
        )}
      </td>

      {/* Student */}
      <td>
        <div className="ge-student-cell">
          <div
            className="ge-student-avatar"
            style={{ background: student.avatarColor }}
          >
            {student.initials}
          </div>
          <div>
            <p className="ge-student-name">{student.fullName}</p>
            <p className="ge-student-num">{student.studentNumber}</p>
          </div>
        </div>
        {/* Mod attempt warning */}
        {grade.hasModificationAttempt && (
          <div className="tch-grade-row__mod-warning">
            <span className="material-symbols-outlined">warning</span>
            Unauthorized modification attempt detected &amp; blocked
          </div>
        )}
      </td>

      {/* Score */}
      <td>
        {isLocked ? (
          <span className="ge-locked-score" style={{ color: gradeColor }}>
            {grade.score !== null ? `${grade.score}%` : '—'}
          </span>
        ) : (
          <div className="ge-score-input-wrap">
            <input
              type="number"
              min="0" max="100"
              className={`tch-grade-input ${!validation.valid ? 'tch-grade-input--error' : ''}`}
              value={localScore}
              placeholder="0-100"
              tabIndex={tabIndex}
              onChange={e => onScoreChange(e.target.value)}
            />
            {!validation.valid && (
              <p className="ge-score-error">{validation.error}</p>
            )}
          </div>
        )}
      </td>

      {/* Grade letter */}
      <td>
        {gradeLetter ? (
          <span
            className="ge-grade-letter"
            style={{ color: gradeColor, background: `${gradeColor}18` }}
          >
            {gradeLetter}
          </span>
        ) : (
          <span className="ge-grade-letter--empty">—</span>
        )}
      </td>

      {/* Remarks */}
      <td>
        {isLocked ? (
          <p className="ge-remarks-text">{grade.remarks || '—'}</p>
        ) : (
          <textarea
            className="tch-textarea ge-remarks-input"
            value={localRemarks}
            placeholder="Optional remarks..."
            onChange={e => onRemarksChange(e.target.value)}
            rows={2}
          />
        )}
      </td>

      {/* Status */}
      <td>
        <span className={`tch-badge ${
          grade.status === 'locked'   ? 'tch-badge--green' :
          grade.status === 'draft'    ? 'tch-badge--amber' :
          grade.status === 'pending'  ? 'tch-badge--grey'  : 'tch-badge--grey'
        }`}>
          <span className="material-symbols-outlined">{statusCfg.icon}</span>
          {statusCfg.label}
        </span>
      </td>

      {/* Actions */}
      <td>
        <div className="ge-row-actions">
          {isLocked && grade.id && (
            <button
              className="tch-btn tch-btn--ghost tch-btn--sm"
              onClick={onViewHistory}
              title="View Grade History"
            >
              <span className="material-symbols-outlined">history_edu</span>
            </button>
          )}
          {isLocked && (
            <button
              className="tch-btn tch-btn--ghost tch-btn--sm"
              onClick={onRequestMod}
              title="Request grade modification"
            >
              <span className="material-symbols-outlined">rate_review</span>
            </button>
          )}
          {isLocked && (
            <span
              className="material-symbols-outlined ge-lock-icon"
              title={`Locked ${formatRelativeTime(grade.lastUpdated)}`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              lock
            </span>
          )}
        </div>
      </td>
    </motion.tr>
  );
}
