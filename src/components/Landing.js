import React, { useState, useEffect } from 'react';
import './Landing.css';
import ThemeToggle from './ThemeToggle';

const FEATURES = [
  'Student Management',
  'Grade Tracking',
  'Teacher Portals',
  'Attendance Tracking',
  'Academic Reports',
  'Multi-Role Access',
  'Staff Management',
  'Parent Communication',
];

const TRUST_ITEMS = [
  'Free to get started',
  'Secure & role-based access',
  'Built for African institutions',
];

/* ---- Inline SVG Icons ---- */
const IconSchool = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3L2 8l10 5 10-5-10-5z"
      stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
    <path
      d="M2 13l10 5 10-5"
      stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
    <path
      d="M2 18l10 5 10-5"
      stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

const IconRegister = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="17 21 17 13 7 13 7 21"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="7 3 7 8 15 8"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSignIn = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="10 17 15 12 10 7"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="15" y1="12" x2="3" y2="12"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---- Animated cycling words ---- */
const CYCLING_WORDS = [
  { text: 'enrollment',       color: '#00B4D8' }, // cyan
  { text: 'academics',        color: '#22D3A3' }, // teal
  { text: 'attendance',       color: '#A78BFA' }, // violet
  { text: 'staff management', color: '#FB923C' }, // orange
  { text: 'grade reporting',  color: '#F472B6' }, // pink
  { text: 'scheduling',       color: '#60A5FA' }, // blue
  { text: 'student progress', color: '#34D399' }, // emerald
  { text: 'communication',    color: '#FBBF24' }, // amber
];

function AnimatedWord() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('visible'); // 'visible' | 'exit' | 'enter'

  useEffect(() => {
    const id = setInterval(() => {
      // 1. Slide current word out (up + fade)
      setPhase('exit');

      setTimeout(() => {
        // 2. Swap to next word, position it below (invisible)
        setIndex((i) => (i + 1) % CYCLING_WORDS.length);
        setPhase('enter');

        // 3. After one paint, animate it into place
        setTimeout(() => setPhase('visible'), 30);
      }, 300); // matches CSS exit transition duration
    }, 2600); // display time per word

    return () => clearInterval(id);
  }, []);

  const { text, color } = CYCLING_WORDS[index];

  return (
    <span
      className={`cycling-word cycling-word--${phase}`}
      style={{
        color,
        textShadow: `0 0 22px ${color}70, 0 0 48px ${color}30`,
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {text}
    </span>
  );
}

/* ---- Component ---- */
export default function Landing({ onNavigate }) {
  return (
    <div className="landing">
      {/* Theme toggle */}
      <ThemeToggle />

      {/* Ambient background glows */}
      <div className="landing-glow landing-glow--tr" aria-hidden="true" />
      <div className="landing-glow landing-glow--bl" aria-hidden="true" />

      <div className="landing-content">

        {/* Logo icon */}
        <div className="landing-logo" aria-label="EK-SMS logo">
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
          The all-in-one school management platform designed for African institutions.
        </p>
        <p className="landing-subtitle landing-subtitle--animated">
          Simplify <AnimatedWord /> — all from one secure dashboard.
        </p>

        {/* Feature pills */}
        <ul className="landing-features" aria-label="Key features">
          {FEATURES.map((f) => (
            <li key={f} className="landing-feature-pill">{f}</li>
          ))}
        </ul>

        {/* Trust bar */}
        <div className="landing-trust" aria-label="Why choose EK-SMS">
          {TRUST_ITEMS.map((t) => (
            <span key={t} className="landing-trust__item">
              <IconCheck />
              {t}
            </span>
          ))}
        </div>

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

        {/* Footer note */}
        <p className="landing-footer-note">
          © 2026 EK-SMS · EL-KENDEH School Management System
        </p>

      </div>
    </div>
  );
}
