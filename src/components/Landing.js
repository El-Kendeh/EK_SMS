import React, { useState, useEffect, useRef } from 'react';
import './Landing.css';
import PruhLogo from './PruhLogo';

// ============================================================
// SVG ICON SYSTEM
// ============================================================
const ICON_PATHS = {
  school:      'M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z',
  people:      'M16 13c-.29 0-.62.07-.97.21C16.61 13.96 17.75 15.14 17.75 16.74V19H23v-2.26C23 15.07 19.25 13 16 13M8 13c-3.25 0-7 2.07-7 3.74V19h15v-2.26C16 15.07 12.25 13 8 13M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6m8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  teacher:     'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82M12 3L1 9l11 6 11-6-11-6M12 12.72L4.53 9 12 5.28 19.47 9 12 12.72z',
  lock:        'M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 1 1 6.2 0v2z',
  calendar:    'M19 19H5V8h14m-3-7v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1V1m-1 11h-5v5h5v-5z',
  payments:    'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 14H4v-6h16v6M20 8H4V6h16v2z',
  analytics:   'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2M9 17H7v-7h2v7m4 0h-2V7h2v10m4 0h-2v-4h2v4z',
  verified:    'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4m-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.58L18 9l-8 8z',
  audit:       'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2m-1 14l-4-4 1.41-1.41L11 13.17l6.59-6.58L19 8l-8 8z',
  emergency:   'M11 15h2v2h-2v-2m0-8h2v6h-2V7m1-5C6.47 2 2 6.5 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2m0 18a8 8 0 0 1 0-16 8 8 0 0 1 0 16z',
  check:       'M21 7L9 19l-5.5-5.5 1.41-1.41L9 16.17 19.59 5.59 21 7z',
  arrowRight:  'M4 11v2h12l-5.5 5.5 1.42 1.42L19.84 12l-7.92-7.92L10.5 5.5 16 11H4z',
  play:        'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2m-2 14.5v-9l6 4.5-6 4.5z',
  star:        'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  expandMore:  'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z',
  menu:        'M3 18h18v-2H3v2m0-5h18v-2H3v2m0-7v2h18V6H3z',
  close:       'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  mail:        'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 4l-8 5-8-5V6l8 5 8-5v2z',
  phone:       'M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.25 1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
  location:    'M12 11.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z',
  send:        'M2 21l21-9L2 3v7l15 2-15 2v7z',
  code:        'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4m5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
  report:      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6m4 18H6V4h7v5h5v11M8 15h8v2H8v-2m0-4h8v2H8v-2m0-4h4v2H8V7z',
  rocket:      'M13.13 22.19L11.5 18.36C13.07 17.78 14.54 17 15.9 16.09L13.13 22.19m-6.12-7.5l-3.83-1.63C4.08 14.22 4.86 12.75 5.77 11.4l2.24 3.29m-2.12-6L2 9.5c.8-1.5 1.72-2.9 2.77-4.2l.22 3.39M20 7a2 2 0 0 0-2-2c-.55 0-1 .22-1.38.55C14.44 3.2 11.37 2 8 2c0 3.37 1.2 6.44 3.55 8.62A2.98 2.98 0 0 0 11 12a3 3 0 0 0 3 3c.55 0 1.06-.15 1.5-.42L17 17l3-10z',
  facebook:    'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  twitter:     'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z',
  linkedin:    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
};

function SvgIcon({ name, size = 20, className = '', style }) {
  const path = ICON_PATHS[name];
  if (!path) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

// ============================================================
// ANIMATED WORD (retained and enhanced from original)
// ============================================================
const CYCLING_WORDS = [
  { text: 'enrollment',       color: '#0dccf2' },
  { text: 'academics',        color: '#22D3A3' },
  { text: 'attendance',       color: '#A78BFA' },
  { text: 'staff management', color: '#FB923C' },
  { text: 'grade reporting',  color: '#F472B6' },
  { text: 'scheduling',       color: '#60A5FA' },
  { text: 'student progress', color: '#34D399' },
  { text: 'communication',    color: '#FBBF24' },
];

function AnimatedWord() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('visible');

  useEffect(() => {
    const id = setInterval(() => {
      setPhase('exit');
      setTimeout(() => {
        setIndex((i) => (i + 1) % CYCLING_WORDS.length);
        setPhase('enter');
        setTimeout(() => setPhase('visible'), 30);
      }, 300);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const { text, color } = CYCLING_WORDS[index];
  return (
    <span
      className={`lp-cycling-word lp-cycling-word--${phase}`}
      style={{ color, textShadow: `0 0 22px ${color}70, 0 0 48px ${color}30` }}
      aria-live="polite"
      aria-atomic="true"
    >
      {text}
    </span>
  );
}

// ============================================================
// NAVBAR
// ============================================================
function Navbar({ onNavigate, menuOpen, setMenuOpen }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const NAV_LINKS = [
    ['Features', 'features'],
    ['Roles', 'roles'],
    ['Security', 'security'],
    ['Pricing', 'pricing'],
    ['About', 'about'],
  ];

  return (
    <nav className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
      <div className="lp-nav__inner">
        <div className="lp-nav__brand">
          <div className="lp-nav__logo-mark">
            <SvgIcon name="school" size={20} />
          </div>
          <span className="lp-nav__brand-name">EK-SMS</span>
        </div>

        <div className="lp-nav__links">
          {NAV_LINKS.map(([label, id]) => (
            <button key={id} className="lp-nav__link" onClick={() => scrollTo(id)}>{label}</button>
          ))}
        </div>

        <div className="lp-nav__actions">
          <button className="lp-nav__btn-ghost" onClick={() => onNavigate('login')}>Sign In</button>
          <button className="lp-nav__btn-primary" onClick={() => onNavigate('register')}>Get Started</button>
        </div>

        <button className="lp-nav__hamburger" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
          <SvgIcon name={menuOpen ? 'close' : 'menu'} size={24} />
        </button>
      </div>

      {menuOpen && (
        <div className="lp-nav__mobile">
          {NAV_LINKS.map(([label, id]) => (
            <button key={id} className="lp-nav__mobile-link" onClick={() => scrollTo(id)}>{label}</button>
          ))}
          <div className="lp-nav__mobile-actions">
            <button className="lp-btn lp-btn--outline lp-btn--full" onClick={() => { setMenuOpen(false); onNavigate('login'); }}>Sign In</button>
            <button className="lp-btn lp-btn--primary lp-btn--full" onClick={() => { setMenuOpen(false); onNavigate('register'); }}>Register Your School</button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ============================================================
// HERO SECTION
// ============================================================
function HeroSection({ onNavigate }) {
  return (
    <section className="lp-hero" id="hero">
      <div className="lp-hero__grid" aria-hidden="true" />
      <div className="lp-hero__glow lp-hero__glow--1" aria-hidden="true" />
      <div className="lp-hero__glow lp-hero__glow--2" aria-hidden="true" />

      <div className="lp-container lp-hero__inner">
        <div className="lp-hero__text">
          <div className="lp-hero__badge">
            <span className="lp-hero__badge-dot" />
            v2.0 now live — built for Africa
          </div>

          <h1 className="lp-hero__headline">
            Modern School
            <br />
            <span className="lp-hero__headline-gradient">Management</span>
            <br />
            for Africa
          </h1>

          <p className="lp-hero__sub lp-hero__sub--animated">
            Simplify <AnimatedWord /> all from one secure dashboard.
          </p>
          <p className="lp-hero__sub">
            The all-in-one SaaS platform built for forward-thinking African institutions.
          </p>

          <div className="lp-hero__ctas">
            <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={() => onNavigate('register')}>
              Start Free Trial
              <SvgIcon name="arrowRight" size={18} />
            </button>
            <button className="lp-btn lp-btn--ghost lp-btn--lg" onClick={() => onNavigate('login')}>
              <SvgIcon name="play" size={18} />
              View Demo
            </button>
          </div>

          <div className="lp-hero__trust">
            {['Free 14-day trial', 'No credit card required', 'Built for African schools'].map((t) => (
              <span key={t} className="lp-hero__trust-item">
                <SvgIcon name="check" size={13} />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="lp-hero__mockup-wrap">
          <div className="lp-hero__mockup">
            <div className="lp-mockup__chrome">
              <span className="lp-mockup__dot" style={{ background: '#EF4444' }} />
              <span className="lp-mockup__dot" style={{ background: '#F59E0B' }} />
              <span className="lp-mockup__dot" style={{ background: '#10B981' }} />
              <div className="lp-mockup__url" />
            </div>
            <div className="lp-mockup__body">
              <div className="lp-mockup__stats">
                {[
                  { label: 'Total Students', value: '1,240', icon: 'people',   color: '#60A5FA', up: '+12%' },
                  { label: 'Monthly Revenue', value: '$45k',  icon: 'payments', color: '#A78BFA', up: '+5%'  },
                  { label: 'Attendance Rate', value: '94%',   icon: 'calendar', color: '#34D399', up: '+2%'  },
                ].map(({ label, value, icon, color, up }) => (
                  <div key={label} className="lp-mockup__stat">
                    <div className="lp-mockup__stat-icon" style={{ color, background: `${color}20` }}>
                      <SvgIcon name={icon} size={16} />
                    </div>
                    <div className="lp-mockup__stat-info">
                      <span className="lp-mockup__stat-val">{value}</span>
                      <span className="lp-mockup__stat-label">{label}</span>
                    </div>
                    <span className="lp-mockup__stat-up">{up}</span>
                  </div>
                ))}
              </div>

              <div className="lp-mockup__chart">
                <div className="lp-mockup__chart-title">Attendance Overview</div>
                <div className="lp-mockup__bars">
                  {[40, 60, 30, 80, 50, 70, 65, 90, 55, 75].map((h, i) => (
                    <div key={i} className="lp-mockup__bar-wrap">
                      <div className="lp-mockup__bar" style={{ height: `${h}%` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Partners trust bar */}
      <div className="lp-container">
        <div className="lp-hero__partners">
          <p className="lp-hero__partners-label">Trusted by 500+ Institutions Across Africa</p>
          <div className="lp-hero__partners-list">
            {['Greenwood Academy', 'Lagos High School', 'Accra International', 'Nairobi Tech', 'Kampala College', 'Dakar Institute'].map((n) => (
              <span key={n} className="lp-hero__partner">{n}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FEATURES SECTION
// ============================================================
const FEATURES_DATA = [
  { icon: 'people',    color: '#60A5FA', title: 'Student Management',  desc: 'Centralized database for student profiles, academic history, disciplinary records and bulk enrollment.' },
  { icon: 'teacher',   color: '#A78BFA', title: 'Teacher Portal',      desc: 'Digital gradebooks, lesson planning, attendance marking, and direct parent communication channels.' },
  { icon: 'calendar',  color: '#34D399', title: 'Smart Attendance',    desc: 'Real-time attendance tracking with automated SMS notifications sent directly to guardians.' },
  { icon: 'payments',  color: '#FB923C', title: 'Fee Collection',      desc: 'Automated invoicing, payment tracking, reminders, and financial reporting dashboards.' },
  { icon: 'analytics', color: '#F472B6', title: 'Grade Analytics',     desc: 'CA, MidTerm, and Final score tracking with auto-computed totals, letters and report card generation.' },
  { icon: 'report',    color: '#0dccf2', title: 'Report Cards',        desc: 'One-click PDF report cards with QR-code verification, class rankings and parent-ready exports.' },
  { icon: 'verified',  color: '#4ADE80', title: 'Grade Integrity',     desc: 'SHA-256 hashing + Merkle-tree audit chains make grade tampering impossible and instantly detectable.' },
  { icon: 'mail',      color: '#FBBF24', title: 'SMS & Alerts',        desc: 'Instant notifications for attendance, results, fees and announcements — parents always stay informed.' },
];

function FeaturesSection() {
  return (
    <section className="lp-section lp-section--alt" id="features">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge lp-badge--primary">Everything You Need</div>
          <h2 className="lp-section-title">Powerful Features for Modern Schools</h2>
          <p className="lp-section-sub">Comprehensive tools designed to bridge the gap between students, teachers, and administration.</p>
        </div>

        <div className="lp-features-grid">
          {FEATURES_DATA.map(({ icon, color, title, desc }) => (
            <div key={title} className="lp-feature-card" style={{ '--card-accent': color }}>
              <div className="lp-feature-card__icon" style={{ color, background: `${color}18` }}>
                <SvgIcon name={icon} size={22} />
              </div>
              <h3 className="lp-feature-card__title">{title}</h3>
              <p className="lp-feature-card__desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// ROLES SECTION
// ============================================================
const ROLES_DATA = [
  {
    key: 'superadmin', label: 'Super Admin', icon: 'verified', color: '#0dccf2',
    subtitle: 'Full platform control and oversight',
    perks: ['Approve/reject school registrations', 'Manage all schools globally', 'System-wide audit logs', 'Configure global settings', 'Financial oversight dashboard'],
  },
  {
    key: 'schooladmin', label: 'School Admin', icon: 'people', color: '#A78BFA',
    subtitle: 'Campus management made seamless',
    perks: ['Student enrollment & records', 'Staff scheduling & payroll', 'Fee collection & reporting', 'Academic year configuration', 'Granular permission control'],
  },
  {
    key: 'teacher', label: 'Teacher', icon: 'teacher', color: '#34D399',
    subtitle: 'Tools built for classroom success',
    perks: ['Digital gradebook management', 'Real-time attendance marking', 'Homework assignment uploads', 'Parent communication channel', 'Class schedule & timetable'],
  },
  {
    key: 'parent', label: 'Parent / Guardian', icon: 'people', color: '#FB923C',
    subtitle: 'Stay connected with your child',
    perks: ['Live performance & grade alerts', 'Attendance notifications', 'Online fee payments', 'Direct teacher messaging', 'Report card access anytime'],
  },
];

function RolesSection() {
  const [active, setActive] = useState('superadmin');
  const role = ROLES_DATA.find((r) => r.key === active);

  return (
    <section className="lp-section" id="roles">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge lp-badge--primary">Access Control</div>
          <h2 className="lp-section-title">Tailored for Every Role</h2>
          <p className="lp-section-sub">Tailored dashboards that empower each user without compromising system security.</p>
        </div>

        <div className="lp-roles-tabs">
          {ROLES_DATA.map(({ key, label, color }) => (
            <button
              key={key}
              className={`lp-roles-tab${active === key ? ' lp-roles-tab--active' : ''}`}
              style={active === key ? { borderColor: color, color } : {}}
              onClick={() => setActive(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="lp-roles-card" style={{ '--role-color': role.color }}>
          <div className="lp-roles-card__left">
            <div className="lp-roles-card__icon-wrap" style={{ color: role.color, background: `${role.color}18` }}>
              <SvgIcon name={role.icon} size={32} />
            </div>
            <h3 className="lp-roles-card__title">{role.label}</h3>
            <p className="lp-roles-card__sub">{role.subtitle}</p>
            <ul className="lp-roles-card__perks">
              {role.perks.map((p) => (
                <li key={p} className="lp-roles-card__perk">
                  <span className="lp-roles-card__perk-dot" style={{ background: role.color }} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-roles-card__right">
            <div className="lp-roles-preview">
              <div className="lp-roles-preview__header">
                <span className="lp-roles-preview__label" style={{ color: role.color }}>{role.label} Dashboard</span>
              </div>
              <div className="lp-roles-preview__grid">
                {[1,2,3,4,5,6].map((i) => (
                  <div key={i} className="lp-roles-preview__block" style={i === 1 ? { borderColor: role.color, background: `${role.color}12` } : {}} />
                ))}
              </div>
              <div className="lp-roles-preview__bars">
                {[60, 80, 45, 90, 70, 55].map((h, i) => (
                  <div key={i} className="lp-roles-preview__bar" style={{ height: `${h}%`, background: i % 2 === 0 ? role.color : `${role.color}50` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SECURITY SECTION
// ============================================================
const SECURITY_FEATURES = [
  { icon: 'lock',      color: '#0dccf2', title: 'Tamper-Proof Grades',   desc: 'SHA-256 hashing + Merkle trees ensure grades cannot be altered without triggering an immutable alert.' },
  { icon: 'audit',     color: '#A78BFA', title: '360° Audit Trails',     desc: 'Every login, grade change, and fee payment is logged with timestamp, user ID and change-hash.' },
  { icon: 'emergency', color: '#F472B6', title: 'Emergency Lockdown',    desc: 'Instantly restrict access during critical periods — exam finals, admission windows, and more.' },
  { icon: 'verified',  color: '#34D399', title: 'Role-Based Access',     desc: 'Fine-grained permissions per user type — never expose data beyond what each role is authorised to see.' },
];

function SecuritySection() {
  return (
    <section className="lp-section lp-section--dark" id="security">
      <div className="lp-container lp-security__inner">
        <div className="lp-security__text">
          <div className="lp-badge lp-badge--red">
            <SvgIcon name="verified" size={14} />
            Uncompromised Security
          </div>
          <h2 className="lp-section-title lp-security__title">
            Tamper-Proof Data &amp;<br />
            <span className="lp-gradient-text">System Lockdown</span>
          </h2>
          <p className="lp-section-sub">
            Enterprise-grade encryption, immutable audit logs, and role-based access control protect every piece of sensitive data.
          </p>
          <div className="lp-security__cards">
            {SECURITY_FEATURES.map(({ icon, color, title, desc }) => (
              <div key={title} className="lp-security__card">
                <div className="lp-security__card-icon" style={{ color, background: `${color}18`, boxShadow: `0 0 14px ${color}30` }}>
                  <SvgIcon name={icon} size={18} />
                </div>
                <div>
                  <div className="lp-security__card-title">{title}</div>
                  <div className="lp-security__card-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lp-security__visual">
          <div className="lp-security__glow" aria-hidden="true" />
          <div className="lp-security__panel">
            <div className="lp-security__lock-wrap">
              <div className="lp-security__lock-glow" aria-hidden="true" />
              <SvgIcon name="lock" size={80} className="lp-security__lock-icon" />
              <div className="lp-security__lock-badge">
                <SvgIcon name="check" size={14} />
              </div>
            </div>
            <div className="lp-security__status">
              <div className="lp-security__status-row">
                <span>System Status</span>
                <span className="lp-security__status-ok">SECURE</span>
              </div>
              <div className="lp-security__progress">
                <div className="lp-security__progress-bar" />
              </div>
              <div className="lp-security__status-note">
                <span className="lp-security__pulse-dot" />
                Last scan: 2 mins ago — all clear
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// WORKFLOW SECTION
// ============================================================
const WORKFLOW_STEPS = [
  { icon: 'school',   title: 'Register Institution', desc: 'Create your school profile, configure academic years, terms, and grading systems.' },
  { icon: 'report',   title: 'Import Data',          desc: 'Bulk upload students, teachers, and staff via Excel or CSV templates effortlessly.' },
  { icon: 'people',   title: 'Assign Roles',         desc: 'Grant access permissions to staff, teachers, accountants, and parents with one click.' },
  { icon: 'rocket',   title: 'Go Live',              desc: 'Start managing attendance, grades, and fees digitally in minutes — no setup headache.' },
];

function WorkflowSection() {
  return (
    <section className="lp-section lp-section--alt" id="workflow">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge lp-badge--primary">How It Works</div>
          <h2 className="lp-section-title">Get Up and Running in Minutes</h2>
          <p className="lp-section-sub">Our streamlined onboarding means you can digitize your entire school administration without the headache.</p>
        </div>

        <div className="lp-workflow">
          <div className="lp-workflow__line" aria-hidden="true" />
          {WORKFLOW_STEPS.map(({ icon, title, desc }, i) => (
            <div key={title} className="lp-workflow__step">
              <div className={`lp-workflow__num${i === 0 ? ' lp-workflow__num--active' : ''}`}>{i + 1}</div>
              <div className="lp-workflow__card">
                <div className="lp-workflow__icon"><SvgIcon name={icon} size={22} /></div>
                <div>
                  <h3 className="lp-workflow__title">{title}</h3>
                  <p className="lp-workflow__desc">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// TESTIMONIALS SECTION
// ============================================================
const TESTIMONIALS = [
  { name: 'Mr. Adebayo O.', school: 'Greenwood Academy, Nigeria',    initials: 'AO', color: '#0dccf2', rating: 5, quote: 'EK-SMS revolutionized how we handle student records. The interface is intuitive and the support is fantastic. Our admin workload dropped by 60%.' },
  { name: 'Mrs. Chinelo N.', school: 'Lagos High School, Nigeria',   initials: 'CN', color: '#A78BFA', rating: 5, quote: 'Managing fees used to be a nightmare. Now it\'s completely seamless. Parents get instant notifications and we get real-time dashboards.' },
  { name: 'Principal Kojo M.', school: 'Accra International, Ghana', initials: 'KM', color: '#34D399', rating: 5, quote: 'The best investment for our institution. Attendance tracking and report card generation are now completely effortless. Highly recommended.' },
];

function TestimonialsSection() {
  return (
    <section className="lp-section" id="testimonials">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge lp-badge--primary">
            <SvgIcon name="verified" size={13} />
            Trusted by 500+ Schools
          </div>
          <h2 className="lp-section-title">What Educators Say</h2>
          <p className="lp-section-sub">Hear from principals and teachers transforming their schools with EK-SMS.</p>
        </div>
        <div className="lp-testimonials-grid">
          {TESTIMONIALS.map(({ name, school, rating, quote, initials, color }) => (
            <div key={name} className="lp-testi-card">
              <div className="lp-testi-card__header">
                <div className="lp-testi-card__avatar" style={{ background: `${color}20`, color, borderColor: color }}>{initials}</div>
                <div className="lp-testi-card__info">
                  <div className="lp-testi-card__name">{name}</div>
                  <div className="lp-testi-card__school" style={{ color }}>{school}</div>
                </div>
                <div className="lp-testi-card__stars">
                  {Array.from({ length: rating }).map((_, i) => <SvgIcon key={i} name="star" size={14} style={{ color: '#FBBF24' }} />)}
                </div>
              </div>
              <blockquote className="lp-testi-card__quote">
                <span className="lp-testi-card__quote-mark">&ldquo;</span>
                {quote}
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PRICING SECTION
// ============================================================
const PRICING_PLANS = [
  {
    name: 'Basic', price: { monthly: 29, annual: 23 }, desc: 'Essential tools for small schools.',
    perks: ['Up to 200 Students', 'Student Management', 'Attendance Tracking', 'Basic Grade Tracking', 'SMS Notifications'],
    missing: ['Parent Portal', 'Fee Management Module'],
    cta: 'Start Free Trial', popular: false,
  },
  {
    name: 'Professional', price: { monthly: 79, annual: 63 }, desc: 'Advanced features for growing institutions.',
    perks: ['Up to 1,000 Students', 'Everything in Basic', 'Parent Portal Access', 'Fee & Finance Module', 'Report Card Generation', 'Grade Audit Logs', 'SMS Alert System'],
    missing: [],
    cta: 'Register Your School', popular: true,
  },
  {
    name: 'Enterprise', price: { monthly: null, annual: null }, desc: 'Full customization for large networks.',
    perks: ['Unlimited Students', 'Everything in Pro', 'Custom Branding & Domain', 'Dedicated Server', 'API Access & Integrations', '24/7 Priority Support'],
    missing: [],
    cta: 'Contact Sales', popular: false,
  },
];

function PricingSection({ onNavigate }) {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="lp-section lp-section--dark" id="pricing">
      <div className="lp-container">
        <div className="lp-section-header">
          <h2 className="lp-section-title">Simple, Transparent Pricing</h2>
          <p className="lp-section-sub">Choose the plan that fits your institution's size. No hidden fees ever.</p>
        </div>

        <div className="lp-pricing-toggle">
          <button className={`lp-pricing-toggle__btn${!annual ? ' lp-pricing-toggle__btn--active' : ''}`} onClick={() => setAnnual(false)}>Monthly</button>
          <button className={`lp-pricing-toggle__btn${annual ? ' lp-pricing-toggle__btn--active' : ''}`} onClick={() => setAnnual(true)}>
            Annual <span className="lp-pricing-toggle__save">Save 20%</span>
          </button>
        </div>

        <div className="lp-pricing-grid">
          {PRICING_PLANS.map(({ name, price, desc, perks, missing, cta, popular }) => (
            <div key={name} className={`lp-pricing-card${popular ? ' lp-pricing-card--popular' : ''}`}>
              {popular && <div className="lp-pricing-card__badge">Most Popular</div>}
              <h3 className="lp-pricing-card__name">{name}</h3>
              <p className="lp-pricing-card__desc">{desc}</p>
              <div className="lp-pricing-card__price">
                {price.monthly
                  ? <><span className="lp-pricing-card__amount">${annual ? price.annual : price.monthly}</span><span className="lp-pricing-card__period">/month</span></>
                  : <span className="lp-pricing-card__amount">Custom</span>
                }
              </div>
              <button
                className={`lp-btn lp-btn--full${popular ? ' lp-btn--primary' : ' lp-btn--outline'}`}
                onClick={() => onNavigate(name === 'Enterprise' ? 'login' : 'register')}
              >
                {cta}
              </button>
              <div className="lp-pricing-card__divider" />
              <ul className="lp-pricing-card__perks">
                {perks.map((p) => <li key={p} className="lp-pricing-card__perk lp-pricing-card__perk--yes"><SvgIcon name="check" size={15} />{p}</li>)}
                {missing.map((p) => <li key={p} className="lp-pricing-card__perk lp-pricing-card__perk--no"><span>—</span>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// RESOURCES SECTION
// ============================================================
const RESOURCES = [
  { category: 'Academic Integrity', title: 'Modernizing Academic Integrity in Africa',     desc: 'How digital tools and audit logs are reshaping honesty in exams across leading institutions.', featured: true },
  { category: 'School Management',  title: 'Streamlining Admin Tasks for Better Efficiency', desc: 'Reduce paperwork and automate attendance to give teachers more time for what matters most.' },
  { category: 'EdTech Trends',      title: 'The Future of Hybrid Learning Systems',         desc: 'Top 5 emerging trends defining the next generation of hybrid classrooms in 2025.' },
  { category: 'Student Life',       title: 'Building Community in Digital Spaces',          desc: 'Strategies for fostering belonging among students using integrated community features.' },
];

function ResourcesSection() {
  const CATS = ['All', 'Academic Integrity', 'School Management', 'EdTech Trends'];
  const [cat, setCat] = useState('All');
  const featured = RESOURCES.find((r) => r.featured);
  const rest = RESOURCES.filter((r) => !r.featured);

  return (
    <section className="lp-section lp-section--alt" id="resources">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge lp-badge--primary">Knowledge Hub</div>
          <h2 className="lp-section-title">Latest Resources</h2>
          <p className="lp-section-sub">Insights, trends, and tools to modernize your institution's management.</p>
        </div>

        <div className="lp-resources__filters">
          {CATS.map((c) => (
            <button key={c} className={`lp-resources__filter${cat === c ? ' lp-resources__filter--active' : ''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>

        {featured && (
          <div className="lp-resources__featured">
            <div className="lp-resources__featured-img">
              <span className="lp-resources__featured-badge">Featured</span>
            </div>
            <div className="lp-resources__featured-body">
              <div className="lp-resources__cat">{featured.category}</div>
              <h3 className="lp-resources__featured-title">{featured.title}</h3>
              <p className="lp-resources__featured-desc">{featured.desc}</p>
              <button className="lp-resources__read-link">Read Full Article <SvgIcon name="arrowRight" size={15} /></button>
            </div>
          </div>
        )}

        <div className="lp-resources__grid">
          {rest.map(({ category, title, desc }) => (
            <div key={title} className="lp-resources__card">
              <div className="lp-resources__card-img" />
              <div className="lp-resources__card-body">
                <div className="lp-resources__cat">{category}</div>
                <h4 className="lp-resources__card-title">{title}</h4>
                <p className="lp-resources__card-desc">{desc}</p>
                <button className="lp-resources__read-link lp-resources__read-link--sm">Read More <SvgIcon name="arrowRight" size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// TEAM SECTION
// ============================================================
const TEAM = [
  { name: 'Dr. Samuel Okafor', role: 'CEO & Founder',      initials: 'SO', color: '#0dccf2', bio: 'Visionary with 15+ years in EdTech, focused on bridging the digital divide in African schools.' },
  { name: 'Aisha Bello',       role: 'Lead Developer',     initials: 'AB', color: '#A78BFA', bio: 'Full-stack architect crafting secure, scalable infrastructure for seamless school management.' },
  { name: 'David Nkosi',       role: 'Academic Consultant',initials: 'DN', color: '#34D399', bio: 'Former principal ensuring EK-SMS aligns perfectly with modern curriculum standards.' },
  { name: 'Fatima Hassan',     role: 'UX Designer',        initials: 'FH', color: '#FB923C', bio: 'Human-centred design champion, making complex admin tasks accessible for every user.' },
  { name: 'Emmanuel Kofi',     role: 'Security Engineer',  initials: 'EK', color: '#F472B6', bio: 'Cryptographic grade integrity and RBAC architecture specialist for sensitive academic data.' },
];

function TeamSection() {
  const scrollRef = useRef(null);
  const scroll = (dir) => { if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' }); };

  return (
    <section className="lp-section" id="team">
      <div className="lp-container">
        <div className="lp-section-header">
          <h2 className="lp-section-title">The Minds Behind EK-SMS</h2>
          <p className="lp-section-sub">Meet the innovators transforming African education through technology.</p>
        </div>
      </div>
      <div className="lp-team__outer">
        <button className="lp-team__nav lp-team__nav--left" onClick={() => scroll(-1)} aria-label="Scroll left">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
        </button>
        <div className="lp-team__scroll" ref={scrollRef}>
          {TEAM.map(({ name, role, initials, color, bio }) => (
            <div key={name} className="lp-team-card">
              <div className="lp-team-card__avatar-wrap">
                <div className="lp-team-card__avatar" style={{ background: `${color}20`, color, borderColor: color }}>{initials}</div>
                <div className="lp-team-card__badge" style={{ background: color }}><SvgIcon name="verified" size={11} /></div>
              </div>
              <h3 className="lp-team-card__name">{name}</h3>
              <p className="lp-team-card__role" style={{ color }}>{role}</p>
              <p className="lp-team-card__bio">{bio}</p>
              <div className="lp-team-card__links">
                <button className="lp-team-card__link" aria-label="Email"><SvgIcon name="mail" size={15} /></button>
                <button className="lp-team-card__link" aria-label="Profile"><SvgIcon name="code" size={15} /></button>
              </div>
            </div>
          ))}
        </div>
        <button className="lp-team__nav lp-team__nav--right" onClick={() => scroll(1)} aria-label="Scroll right">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </button>
      </div>
    </section>
  );
}

// ============================================================
// FAQ SECTION
// ============================================================
const FAQ_ITEMS = [
  { q: 'How secure is our student data?',          a: 'EK-SMS uses AES-256 encryption at rest and TLS 1.3 in transit. Grade changes are immutably logged with SHA-256 hashes and a Merkle-tree chain of custody, making tampering impossible to hide.' },
  { q: 'Can we migrate from our existing system?', a: 'Absolutely. Our onboarding team specializes in data migration. We support automated tools for Excel, CSV, and custom API integrations for legacy systems — with zero data loss guaranteed.' },
  { q: 'What kind of support do you provide?',     a: 'We offer 24/7 support for all school administrators via live chat, email, and a comprehensive knowledge base. Professional and Enterprise plans include a dedicated account manager.' },
  { q: 'Is there a mobile app for parents?',       a: 'Yes! The EK-SMS Parent Portal is available on iOS and Android. Parents can view grades, attendance, pay fees, and message teachers in real-time from any device.' },
  { q: 'Can I change plans later?',                a: 'Yes, you can upgrade or downgrade at any time. Changes take effect from your next billing cycle with no hidden fees or penalties.' },
  { q: 'Do you offer discounts for non-profits?',  a: 'We support African education. Contact our sales team with your institution\'s details to apply for our education discount programme — typically 30-50% off.' },
];

function FAQSection() {
  const [open, setOpen] = useState(0);
  return (
    <section className="lp-section lp-section--alt" id="faq">
      <div className="lp-container lp-faq__inner">
        <div className="lp-faq__header">
          <div className="lp-badge lp-badge--primary">Support Center</div>
          <h2 className="lp-section-title">Frequently Asked Questions</h2>
          <p className="lp-section-sub">Find quick answers to common questions about EK-SMS.</p>
        </div>
        <div className="lp-faq__list">
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <div key={q} className={`lp-faq__item${open === i ? ' lp-faq__item--open' : ''}`}>
              <button className="lp-faq__question" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                <span>{q}</span>
                <span className={`lp-faq__chevron${open === i ? ' lp-faq__chevron--open' : ''}`}><SvgIcon name="expandMore" size={20} /></span>
              </button>
              {open === i && <div className="lp-faq__answer">{a}</div>}
            </div>
          ))}
        </div>
        <div className="lp-faq__cta-box">
          <h3 className="lp-faq__cta-title">Still have questions?</h3>
          <p className="lp-faq__cta-sub">Can't find the answer? Chat with our friendly team.</p>
          <button className="lp-btn lp-btn--primary">Get in Touch <SvgIcon name="send" size={14} /></button>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// ABOUT SECTION
// ============================================================
function AboutSection() {
  return (
    <section className="lp-section" id="about">
      <div className="lp-container">
        <div className="lp-section-header">
          <h2 className="lp-section-title"><span className="lp-gradient-text">Empowering African Education</span></h2>
          <p className="lp-section-sub">Bridging the digital divide for schools across the continent with next-generation management tools.</p>
        </div>
        <div className="lp-about__cards">
          <div className="lp-about__card">
            <div className="lp-about__card-icon"><SvgIcon name="rocket" size={24} /></div>
            <h3 className="lp-about__card-title">Our Mission</h3>
            <p className="lp-about__card-desc">To revolutionize school management across Africa through accessible, cloud-based technology that simplifies administration and enhances learning outcomes for every institution.</p>
          </div>
          <div className="lp-about__card">
            <div className="lp-about__card-icon"><SvgIcon name="analytics" size={24} /></div>
            <h3 className="lp-about__card-title">Our Vision</h3>
            <p className="lp-about__card-desc">Building a future where every African institution, regardless of location or resources, thrives with digital efficiency, data-driven insights, and tamper-proof academic integrity.</p>
          </div>
        </div>
        <div className="lp-about__pillars">
          {[
            { icon: 'rocket',   title: 'Innovation', desc: 'Cutting-edge features tailored for modern African educational needs.' },
            { icon: 'verified', title: 'Integrity',  desc: 'Transparent data handling, immutable audit logs, and secure systems.' },
            { icon: 'people',   title: 'Impact',     desc: 'Real change in educational communities across the African continent.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="lp-about__pillar">
              <div className="lp-about__pillar-icon"><SvgIcon name={icon} size={20} /></div>
              <div>
                <h4 className="lp-about__pillar-title">{title}</h4>
                <p className="lp-about__pillar-desc">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// CTA BANNER
// ============================================================
function CTABanner({ onNavigate }) {
  return (
    <section className="lp-cta-banner">
      <div className="lp-cta-banner__glow" aria-hidden="true" />
      <div className="lp-container lp-cta-banner__inner">
        <h2 className="lp-cta-banner__title">Ready to transform your school?</h2>
        <p className="lp-cta-banner__sub">Join hundreds of African institutions modernizing their education management with EK-SMS today.</p>
        <div className="lp-cta-banner__actions">
          <button className="lp-btn lp-btn--white lp-btn--lg" onClick={() => onNavigate('register')}>Book a Demo</button>
          <button className="lp-btn lp-btn--ghost-white lp-btn--lg" onClick={() => onNavigate('login')}>
            Contact Support <SvgIcon name="arrowRight" size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER
// ============================================================
function Footer({ onNavigate }) {
  const scrollTo = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer__grid">
          <div className="lp-footer__brand">
            <div className="lp-footer__brand-row">
              <div className="lp-footer__brand-icon"><SvgIcon name="school" size={18} /></div>
              <span className="lp-footer__brand-name">EK-SMS</span>
            </div>
            <p className="lp-footer__brand-tagline">Empowering education through technology across Africa.</p>
            <div className="lp-footer__socials">
              {['facebook', 'twitter', 'linkedin'].map((s) => (
                <button key={s} className="lp-footer__social" aria-label={s}><SvgIcon name={s} size={16} /></button>
              ))}
            </div>
          </div>

          <div className="lp-footer__col">
            <h4 className="lp-footer__col-title">Product</h4>
            <ul className="lp-footer__links">
              {[['Features','features'],['Pricing','pricing'],['Security','security'],['Workflow','workflow']].map(([l,id]) => (
                <li key={l}><button className="lp-footer__link" onClick={() => scrollTo(id)}>{l}</button></li>
              ))}
            </ul>
          </div>

          <div className="lp-footer__col">
            <h4 className="lp-footer__col-title">Resources</h4>
            <ul className="lp-footer__links">
              {['Blog', 'Case Studies', 'Documentation', 'API Reference', 'Support Center'].map((l) => (
                <li key={l}><span className="lp-footer__link">{l}</span></li>
              ))}
            </ul>
          </div>

          <div className="lp-footer__col">
            <h4 className="lp-footer__col-title">Company</h4>
            <ul className="lp-footer__links">
              {[['About Us','about'],['Team','team'],['FAQ','faq']].map(([l,id]) => (
                <li key={l}><button className="lp-footer__link" onClick={() => scrollTo(id)}>{l}</button></li>
              ))}
              {['Careers','Partners'].map((l) => <li key={l}><span className="lp-footer__link">{l}</span></li>)}
            </ul>
          </div>
        </div>

        <div className="lp-footer__bottom">
          <p className="lp-footer__copy">© 2026 EK-SMS · EL-KENDEH School Management System. All rights reserved.</p>
          <div className="lp-footer__legal">
            {['Privacy Policy', 'Terms of Service', 'Cookie Settings'].map((l) => (
              <span key={l} className="lp-footer__legal-link">{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================
// MAIN LANDING COMPONENT
// ============================================================
export default function Landing({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="lp">
      <Navbar onNavigate={onNavigate} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <main>
        <HeroSection onNavigate={onNavigate} />
        <FeaturesSection />
        <RolesSection />
        <SecuritySection />
        <WorkflowSection />
        <TestimonialsSection />
        <PricingSection onNavigate={onNavigate} />
        <ResourcesSection />
        <TeamSection />
        <FAQSection />
        <AboutSection />
        <CTABanner onNavigate={onNavigate} />
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
