import React from 'react';

export default function FeeCategories({ schoolId }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>Fee Categories</h2>
      <p>School ID: {schoolId}</p>
      <p>Manage fee categories and amounts here.</p>
    </div>
  );
}
