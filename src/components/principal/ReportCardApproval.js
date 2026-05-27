import React from 'react';

export default function ReportCardApproval({ schoolId }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>Report Card Approval</h2>
      <p>School ID: {schoolId}</p>
      <p>Review and approve report cards before publishing.</p>
    </div>
  );
}
