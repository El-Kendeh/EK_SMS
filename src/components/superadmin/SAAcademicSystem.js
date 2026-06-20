import React from 'react';
import SARefDataManager from './SARefDataManager';

/* Academic Systems — standardized on SARefDataManager so the page gets the
   same polished add form, inline editing, search, status toggles and
   delete confirmation as the other system reference-data pages. */
export default function SAAcademicSystem() {
  return (
    <SARefDataManager
      title="Academic Systems"
      subtitle="Curriculum frameworks schools can register under, e.g. British, American, WAEC, National."
      endpoint="/api/academic-systems/"
      listKey="academicsystems"
      itemLabel="academic system"
      fields={[
        { key: 'name', label: 'Academic System Name', type: 'text', required: true, placeholder: 'e.g. British, American, Nigerian' },
      ]}
    />
  );
}
