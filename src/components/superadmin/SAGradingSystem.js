import React from 'react';
import SARefDataManager from './SARefDataManager';

/* Grading Systems — standardized on SARefDataManager so the page gets the
   same polished add form, inline editing, search, status toggles and
   delete confirmation as the other system reference-data pages. */
export default function SAGradingSystem() {
  return (
    <SARefDataManager
      title="Grading Systems"
      subtitle="Grade scales schools can adopt, e.g. A–F Letter Grades, 1–9 (GCSE), Percentage, GPA 4.0."
      endpoint="/api/grading-systems/"
      listKey="gradingsystems"
      itemLabel="grading system"
      fields={[
        { key: 'name', label: 'Grading System Name', type: 'text', required: true, placeholder: 'e.g. A–F Letter Grades, GPA 4.0' },
      ]}
    />
  );
}
