import React from 'react';
import './Landing.css';

const FEATURES = [
  'Student Management',
  'Grade Tracking',
  'Teacher Portals',
  'Attendance',
  'Reports',
  'Multi-Role Access',
];

/* ---- Inline SVG Icons ---- */
const IconSchool = () => (
  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3L2 8l10 5 10-5-10-5zM2 13l10 5 10-5M2 18l10 5 10-5"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconRegister = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="17 21 17 13 7 13 7 21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="7 3 7 8 15 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconSignIn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="10 17 15 12 10 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="15"
      y1="12"
      x2="3"
      y2="12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/* ---- Component ---- */
export default function Landing({ onNavigate }) {
  return (
    <div className="landing">
      {/* Ambient background glows */}
      <div className="landing-glow landing-glow--tr" aria-hidden="true" />
      <div className="landing-glow landing-glow--bl" aria-hidden="true" />

      <div className="landing-content">

        {/* Logo icon */}
        <div className="landing-logo" aria-hidden="true">
          <IconSchool />
        </div>

        {/* Brand badge */}
        <div className="landing-badge">
          <span className="landing-badge__dot" aria-hidden="true" />
          EL-KENDEH Smart School Management System
        </div>

        {/* Main title */}
        <h1 className="landing-title">
          EK-<span className="landing-title__accent">SMS</span>
        </h1>

        {/* Subtitle */}
        <p className="landing-subtitle">
          The all-in-one platform for schools, universities, and tertiary institutions.
          Manage students, grades, teachers, and administration — all in one place.
        </p>

        {/* Feature pills */}
        <ul className="landing-features" aria-label="Key features">
          {FEATURES.map((f) => (
            <li key={f} className="landing-feature-pill">{f}</li>
          ))}
        </ul>

        {/* CTA buttons */}
        <div className="landing-ctas">
          <button
            className="landing-cta landing-cta--primary"
            onClick={() => onNavigate('register')}
          >
            <IconRegister />
            Register Your School
          </button>
          <button
            className="landing-cta landing-cta--outline"
            onClick={() => onNavigate('login')}
          >
            <IconSignIn />
            Sign In
          </button>
        </div>

      </div>
    </div>
  );
}
