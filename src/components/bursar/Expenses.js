import React from 'react';

export default function Expenses({ schoolId }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>Expenses</h2>
      <p>School ID: {schoolId}</p>
      <p>Record and track school expenses here.</p>
    </div>
  );
}
