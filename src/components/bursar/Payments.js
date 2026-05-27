import React from 'react';

export default function Payments({ schoolId }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>Payments</h2>
      <p>School ID: {schoolId}</p>
      <p>View and manage fee payments here.</p>
    </div>
  );
}
