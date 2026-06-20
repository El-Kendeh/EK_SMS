import React from 'react';
import BursarHome from './BursarHome';

/**
 * 'fee-dashboard' page key — kept for superadmin / school-admin nav.
 * For bursars, 'overview' renders BursarHome directly; this wrapper keeps
 * both keys showing the same Finance Command Center (no duplicate page).
 */
export default function BursarOverview({ navigateTo, schoolId }) {
  return <BursarHome navigateTo={navigateTo} schoolId={schoolId} />;
}
