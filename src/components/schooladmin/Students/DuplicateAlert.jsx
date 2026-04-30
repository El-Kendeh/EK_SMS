import React from 'react';
import { fmtDate } from './students.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Banner that warns when an existing student has the SAME first+last+DOB
 * (within 7 days). Saves admins from accidentally re-enrolling a student.
 */
export default function DuplicateAlert({ duplicates, onView }) {
  if (!duplicates || duplicates.length === 0) return null;
  return (
    <div className="stu-duplicate">
      <Ic name="report" />
      <div className="stu-duplicate__body">
        <strong>Possible duplicate enrolment</strong>
        <p>
          {duplicates.length === 1
            ? 'An existing student matches this name and date of birth — verify before continuing.'
            : `${duplicates.length} existing students match this name and date of birth.`}
        </p>
        <ul className="stu-duplicate__list">
          {duplicates.map(d => (
            <li key={d.id}>
              <strong>{d.full_name || `${d.first_name} ${d.last_name}`}</strong>
              <span>{d.admission_number || '—'} · DOB {fmtDate(d.date_of_birth)}</span>
              <button type="button" className="stu-duplicate__view" onClick={() => onView && onView(d)}>
                <Ic name="open_in_new" size="sm" /> View
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
