import React, { useState } from 'react';
import SARefDataManager from './SARefDataManager';
import './SARefDataManager.css';

const CAPACITY_CATEGORY_FIELDS = [
  {
    key: 'name',
    label: 'Category Name',
    type: 'text',
    required: true,
    placeholder: 'e.g. Small, Medium, Large',
  },
];

const SCHOOL_CAPACITY_FIELDS = [
  {
    key: 'capacity_category_id',
    label: 'Capacity Category',
    type: 'select',
    required: true,
    loadFrom: '/api/capacity-categories/',
    optionsKey: 'categories',
    labelKey: 'name',
  },
  {
    key: 'capacity_amount',
    label: 'Capacity Amount',
    type: 'number',
    required: true,
    placeholder: 'e.g. 500',
  },
];

export default function SASchoolCapacity() {
  const [tab, setTab] = useState('categories');

  return (
    <div className="sasc-wrap">
      <div className="sasc-head">
        <h1 className="sasc-title">School Capacity</h1>
        <p className="sasc-sub">
          Define capacity categories first (e.g. Small, Medium, Large), then assign
          capacity amounts to each category.
        </p>
      </div>

      <div className="sasc-tabs">
        <button
          className={`sasc-tab${tab === 'categories' ? ' active' : ''}`}
          onClick={() => setTab('categories')}
        >
          Capacity Categories
        </button>
        <button
          className={`sasc-tab${tab === 'capacities' ? ' active' : ''}`}
          onClick={() => setTab('capacities')}
        >
          School Capacities
        </button>
      </div>

      {tab === 'categories' && (
        <SARefDataManager
          title="Capacity Categories"
          subtitle="Labels used to classify school size — create these before adding school capacities."
          endpoint="/api/capacity-categories/"
          listKey="categories"
          itemLabel="category"
          fields={CAPACITY_CATEGORY_FIELDS}
        />
      )}

      {tab === 'capacities' && (
        <SARefDataManager
          title="School Capacities"
          subtitle="Assign a numerical capacity to each category."
          endpoint="/api/school-capacities/"
          listKey="capacities"
          itemLabel="capacity"
          fields={SCHOOL_CAPACITY_FIELDS}
        />
      )}
    </div>
  );
}
