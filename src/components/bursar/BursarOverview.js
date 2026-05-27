import React from 'react';

export default function BursarOverview({ schoolId }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>Fee Dashboard</h2>
      <p>School ID: {schoolId}</p>
      <p>Summary of fees, payments, and outstanding balances will appear here.</p>
    </div>
  );
}
