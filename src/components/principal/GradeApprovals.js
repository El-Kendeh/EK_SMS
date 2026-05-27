import React from 'react';

export default function GradeApprovals({ schoolId }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>Grade Approvals</h2>
      <p>School ID: {schoolId}</p>
      <p>Review and approve teacher-submitted grades here.</p>
    </div>
  );
}
