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
    ['About', 'about'],
    ['Contact', 'contact'],
  ];

  return (
    <nav className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`}>
      <div className="lp-nav__inner">
        <div className="lp-nav__brand">
          <PruhLogo size={44} showText={false} variant="white" />
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
            <PruhLogo size={18} showText={false} variant="white" />
            <span className="lp-hero__badge-sep" />
            v1.0 now live · built for Africa
          </div>

          <h1 className="lp-hero__headline">
            Protect Academic Integrity.
            <br />
            Run Your School{' '}
            <span className="lp-hero__headline-gradient">Smarter.</span>
          </h1>

          <p className="lp-hero__sub lp-hero__sub--animated">
            Simplify <AnimatedWord /> all from one secure dashboard.
          </p>
          <p className="lp-hero__sub">
            EK-SMS is the all-in-one platform that unifies student management, staff operations, grading, attendance, and security into one seamless experience.
          </p>

          <div className="lp-hero__ctas">
            <button className="lp-btn lp-btn--ghost lp-btn--lg" onClick={() => onNavigate('login')}>
              <SvgIcon name="play" size={18} />
              View Demo
            </button>
          </div>

          <div className="lp-hero__trust">
            {['Early Access Program', 'Academic Integrity Focused', 'Secure & Role-Based Access'].map((t) => (
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
            {['Greenwood Academy', 'Albert Academy', 'Methodist Boys HS', 'Academy Tech', 'Christ the Kings College'].map((n) => (
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
  { icon: 'people',    color: '#60A5FA', title: 'Student Management',  desc: 'Centralized database for student profiles, academic history, disciplinary records and bulk enrollment.',
    flip: true, backPoints: ['Bulk CSV / Excel student import', 'Photo, docs & disciplinary log', 'Full academic history per term', 'Search, filter & export records'] },
  { icon: 'teacher',   color: '#A78BFA', title: 'Teacher Portal',      desc: 'Digital gradebooks, lesson planning, attendance marking, and direct parent communication channels.' },
  { icon: 'calendar',  color: '#34D399', title: 'Smart Attendance',    desc: 'Real-time attendance tracking with automated SMS notifications sent directly to guardians.' },
  { icon: 'payments',  color: '#FB923C', title: 'Fee Collection',      desc: 'Automated invoicing, payment tracking, reminders, and financial reporting dashboards.',
    flip: true, backPoints: ['Multi-payment method support', 'Auto-SMS receipts to parents', 'Real-time balance & arrears view', 'Overdue fee alerts & reports'] },
  { icon: 'analytics', color: '#F472B6', title: 'Grade Analytics',     desc: 'CA, MidTerm, and Final score tracking with auto-computed totals, letters and report card generation.' },
  { icon: 'report',    color: '#0dccf2', title: 'Report Cards',        desc: 'One-click PDF report cards with QR-code verification, class rankings and parent-ready exports.',
    flip: true, backPoints: ['Branded PDF with school logo', 'QR code for parent verification', 'Class rank & position included', 'Bulk-generate in one click'] },
  { icon: 'verified',  color: '#4ADE80', title: 'Grade Integrity',     desc: 'SHA-256 hashing + Merkle-tree audit chains make grade tampering impossible and instantly detectable.' },
  { icon: 'mail',      color: '#FBBF24', title: 'SMS & Alerts',        desc: 'Instant notifications for attendance, results, fees and announcements — parents always stay informed.' },
];

function FlipCard({ icon, color, title, desc, backPoints }) {
  const [flipped, setFlipped] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setFlipped(true); observer.disconnect(); } },
      { threshold: 0.45 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`lp-flip-card${flipped ? ' lp-flip-card--flipped' : ''}`}
      style={{ '--card-accent': color }}
      onClick={() => setFlipped(v => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setFlipped(v => !v)}
      aria-label={`${title} — click to flip`}
    >
      <div className="lp-flip-card__inner">
        <div className="lp-flip-card__front">
          <div className="lp-feature-card__icon" style={{ color, background: `${color}18` }}>
            <SvgIcon name={icon} size={22} />
          </div>
          <h3 className="lp-feature-card__title">{title}</h3>
          <p className="lp-feature-card__desc">{desc}</p>
          <div className="lp-flip-card__hint" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
            </svg>
          </div>
        </div>
        <div className="lp-flip-card__back">
          <div className="lp-flip-card__back-icon" style={{ color, background: `${color}18` }}>
            <SvgIcon name={icon} size={18} />
          </div>
          <h3 className="lp-flip-card__back-title" style={{ color }}>{title}</h3>
          <ul className="lp-flip-card__back-points">
            {backPoints.map(pt => (
              <li key={pt} className="lp-flip-card__back-point">
                <span className="lp-flip-card__back-dot" style={{ background: color }} />
                {pt}
              </li>
            ))}
          </ul>
          <div className="lp-flip-card__hint" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

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
          {FEATURES_DATA.map(({ icon, color, title, desc, flip, backPoints }) =>
            flip
              ? <FlipCard key={title} icon={icon} color={color} title={title} desc={desc} backPoints={backPoints} />
              : (
                <div key={title} className="lp-feature-card" style={{ '--card-accent': color }}>
                  <div className="lp-feature-card__icon" style={{ color, background: `${color}18` }}>
                    <SvgIcon name={icon} size={22} />
                  </div>
                  <h3 className="lp-feature-card__title">{title}</h3>
                  <p className="lp-feature-card__desc">{desc}</p>
                </div>
              )
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SUPER ADMIN DASHBOARD MOCKUP
// ============================================================
function SuperAdminDashboardMockup() {
  const primary = '#0db9f2';
  const glass = {
    background: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.05)',
  };
  const stats = [
    { label: 'Total Schools',   value: '142',   color: primary,   icon: 'school',    badge: '+12%', badgeColor: '#34d399' },
    { label: 'Active Students', value: '24.5k', color: '#818cf8', icon: 'people',    badge: '+5%',  badgeColor: '#34d399' },
    { label: 'Total Revenue',   value: '$128k', color: '#34d399', icon: 'payments',  badge: '+8%',  badgeColor: '#34d399' },
    { label: 'Security Alerts', value: '3',     color: '#fb923c', icon: 'emergency', badge: 'Alert',badgeColor: '#fb923c' },
  ];
  const registrations = [
    { name: 'Albert Academy',      loc: 'Freetown, SL', status: 'VERIFIED', statusColor: '#34d399', statusBg: 'rgba(52,211,153,0.1)'  },
    { name: "Methodist Boys' HS",  loc: 'Freetown, SL', status: 'PENDING',  statusColor: '#fbbf24', statusBg: 'rgba(251,191,36,0.1)'  },
    { name: 'Vent Int. School',    loc: 'Monrovia, LR', status: 'VERIFIED', statusColor: '#34d399', statusBg: 'rgba(52,211,153,0.1)'  },
  ];
  return (
    <div style={{ background: '#0f172a', borderRadius: '16px', overflow: 'hidden', width: '100%', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      {/* ambient glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 35% at 50% 0%, rgba(13,185,242,0.09) 0%, transparent 70%)' }} />

      {/* Header */}
      <div style={{ ...glass, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(30,41,59,0.5)', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PruhLogo size={22} showText={false} variant="white" />
          <div>
            <div style={{ fontSize: '8px', color: primary, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>Super Admin</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>EK-SMS Dashboard</div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(30,41,59,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="#94a3b8"><path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2m6-6V11a6 6 0 0 0-5-5.92V4a1 1 0 0 0-2 0v1.08A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
          </div>
          <div style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%' }} />
        </div>
      </div>

      {/* Stats 2×2 grid */}
      <div style={{ padding: '10px 12px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', position: 'relative', zIndex: 1 }}>
        {stats.map(({ label, value, color, icon, badge, badgeColor }) => (
          <div key={label} style={{ ...glass, borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                <SvgIcon name={icon} size={12} />
              </div>
              <span style={{ fontSize: '7px', fontWeight: 700, color: badgeColor, background: `${badgeColor}18`, padding: '1px 5px', borderRadius: '999px' }}>{badge}</span>
            </div>
            <div>
              <div style={{ fontSize: '7px', color: '#94a3b8', fontWeight: 500, marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Growth chart */}
      <div style={{ padding: '10px 12px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ ...glass, borderRadius: '10px', padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>School Growth</div>
              <div style={{ fontSize: '7px', color: '#64748b' }}>Monthly acquisitions</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: primary }}>+15%</div>
              <div style={{ fontSize: '7px', color: '#64748b' }}>vs last month</div>
            </div>
          </div>
          <svg width="100%" height="50" viewBox="0 0 100 50" preserveAspectRatio="none" style={{ display: 'block' }}>
            <defs>
              <linearGradient id="sa-chart-grad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={primary} stopOpacity="0.35" />
                <stop offset="100%" stopColor={primary} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,50 L0,35 Q10,32 20,40 T40,25 T60,30 T80,15 T100,5 L100,50 Z" fill="url(#sa-chart-grad)" />
            <path d="M0,35 Q10,32 20,40 T40,25 T60,30 T80,15 T100,5" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="80" cy="15" r="2.5" fill={primary} />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
            {['Jan','Feb','Mar','Apr','May','Jun'].map(m => (
              <span key={m} style={{ fontSize: '6px', color: '#64748b', fontWeight: 500 }}>{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Registrations */}
      <div style={{ padding: '10px 12px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>Recent Registrations</div>
          <div style={{ fontSize: '7px', color: primary, fontWeight: 600 }}>View All</div>
        </div>
        <div style={{ ...glass, borderRadius: '10px', overflow: 'hidden' }}>
          {registrations.map(({ name, loc, status, statusColor, statusBg }, i) => (
            <div key={name} style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < registrations.length - 1 ? '1px solid rgba(30,41,59,0.6)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(51,65,85,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <SvgIcon name="school" size={11} />
                </div>
                <div>
                  <div style={{ fontSize: '8px', fontWeight: 600, color: '#fff' }}>{name}</div>
                  <div style={{ fontSize: '6.5px', color: '#64748b' }}>{loc}</div>
                </div>
              </div>
              <span style={{ fontSize: '6px', fontWeight: 800, color: statusColor, background: statusBg, padding: '2px 6px', borderRadius: '999px', border: `1px solid ${statusColor}40` }}>{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div style={{ ...glass, borderTop: '1px solid rgba(30,41,59,0.5)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 6px', marginTop: '10px', position: 'relative', zIndex: 1 }}>
        {[
          { icon: 'analytics', label: 'Dashboard', isActive: true  },
          { icon: 'school',    label: 'Schools',   isActive: false },
          { icon: 'people',    label: 'Users',     isActive: false },
          { icon: 'verified',  label: 'Security',  isActive: false },
        ].map(({ icon, label, isActive }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: isActive ? primary : '#64748b' }}>
            <SvgIcon name={icon} size={14} />
            <span style={{ fontSize: '6px', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SCHOOL ADMIN DASHBOARD MOCKUP  (dark glassmorphism)
// ============================================================
function SchoolAdminDashboardMockup() {
  const primary = '#13a4ec';
  const bg      = '#101c22';
  const glass   = {
    background:           'rgba(255,255,255,0.03)',
    backdropFilter:       'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border:               '1px solid rgba(255,255,255,0.05)',
  };
  const cyanGlow = { boxShadow: '0 0 15px rgba(19,164,236,0.15)' };
  const metrics = [
    { label: 'Total Students',  value: '1,240', badge: '+12% vs last term', badgeColor: '#34d399', icon: 'people',    highlight: true },
    { label: 'Total Teachers',  value: '86',    badge: 'Full Capacity',      badgeColor: '#64748b', icon: 'teacher'  },
    { label: 'Attendance Rate', value: '94%',   badge: 'Top 5% Regionally', badgeColor: '#34d399', icon: 'calendar' },
    { label: 'Avg Performance', value: '82%',   badge: 'Slightly improved',  badgeColor: primary,   icon: 'analytics'},
  ];
  const barH = [0.75, 1.0, 0.67, 0.75, 1.0, 0.83];
  const barF = [0.80, 0.83, 0.75, 0.50, 1.0, 0.60];
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat'];
  const gradeRows = [
    { student: 'Kofi Mensah',   subject: 'Mathematics',     status: 'Approved', statusColor: '#34d399', statusBg: 'rgba(52,211,153,0.1)' },
    { student: 'Amara Okafor',  subject: 'Advanced Physics', status: 'Pending',  statusColor: '#fbbf24', statusBg: 'rgba(251,191,36,0.1)' },
    { student: 'Kwame Nkrumah', subject: 'World History',   status: 'Approved', statusColor: '#34d399', statusBg: 'rgba(52,211,153,0.1)' },
  ];
  const quickActions = [
    { icon: 'people',   label: 'Add Student'    },
    { icon: 'teacher',  label: 'Add Teacher'    },
    { icon: 'verified', label: 'Approve Grades' },
  ];
  const bottomNav = [
    { icon: 'analytics', label: 'Home',     active: true  },
    { icon: 'report',    label: 'Academics', active: false },
    { icon: 'payments',  label: 'Finance',   active: false },
    { icon: 'lock',      label: 'Settings',  active: false },
  ];
  return (
    <div style={{ background: bg, borderRadius: '16px', overflow: 'hidden', width: '100%', fontFamily: 'Inter, sans-serif', color: '#fff', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 35% at 50% 0%, rgba(19,164,236,0.08) 0%, transparent 70%)' }} />
      {/* Header */}
      <div style={{ ...glass, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(30,41,59,0.5)', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PruhLogo size={22} showText={false} variant="white" />
          <div>
            <div style={{ fontSize: '8px', color: primary, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1px' }}>School Admin</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>EK-SMS Dashboard</div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(30,41,59,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="#94a3b8"><path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2m6-6V11a6 6 0 0 0-5-5.92V4a1 1 0 0 0-2 0v1.08A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
          </div>
          <div style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%' }} />
        </div>
      </div>
      {/* Stats 2×2 */}
      <div style={{ padding: '10px 12px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', position: 'relative', zIndex: 1 }}>
        {metrics.map(({ label, value, icon, badge, badgeColor, highlight }) => (
          <div key={label} style={{ ...glass, ...(highlight ? cyanGlow : {}), borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: `rgba(19,164,236,0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: primary }}>
                <SvgIcon name={icon} size={12} />
              </div>
              <span style={{ fontSize: '7px', fontWeight: 700, color: badgeColor, background: `${badgeColor}18`, padding: '1px 5px', borderRadius: '999px' }}>{badge}</span>
            </div>
            <div>
              <div style={{ fontSize: '7px', color: '#94a3b8', fontWeight: 500, marginBottom: '2px' }}>{label}</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Growth chart */}
      <div style={{ padding: '10px 12px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ ...glass, borderRadius: '10px', padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>Attendance Trend</div>
              <div style={{ fontSize: '7px', color: '#64748b' }}>Weekly breakdown</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: primary }}>94%</div>
              <div style={{ fontSize: '7px', color: '#64748b' }}>this week</div>
            </div>
          </div>
          <div style={{ height: '44px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
            {barH.map((h, i) => (
              <div key={i} style={{ flex: 1, background: 'rgba(19,164,236,0.1)', borderRadius: '2px 2px 0 0', height: `${h * 100}%`, position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: primary, borderRadius: '2px 2px 0 0', height: `${barF[i] * 100}%` }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
            {days.map(d => <span key={d} style={{ fontSize: '6px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{d}</span>)}
          </div>
        </div>
      </div>
      {/* Recent Grade Modifications */}
      <div style={{ padding: '10px 12px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>Recent Grade Modifications</div>
          <div style={{ fontSize: '7px', color: primary, fontWeight: 600 }}>View All</div>
        </div>
        <div style={{ ...glass, borderRadius: '10px', overflow: 'hidden' }}>
          {gradeRows.map(({ student, subject, status, statusColor, statusBg }, i) => (
            <div key={student} style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < gradeRows.length - 1 ? '1px solid rgba(30,41,59,0.6)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(51,65,85,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <SvgIcon name="school" size={11} />
                </div>
                <div>
                  <div style={{ fontSize: '8px', fontWeight: 600, color: '#fff' }}>{student}</div>
                  <div style={{ fontSize: '6.5px', color: '#64748b' }}>{subject}</div>
                </div>
              </div>
              <span style={{ fontSize: '6px', fontWeight: 800, color: statusColor, background: statusBg, padding: '2px 6px', borderRadius: '999px', border: `1px solid ${statusColor}40` }}>{status}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Quick Actions */}
      <div style={{ padding: '10px 12px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
          {quickActions.map(({ icon, label }) => (
            <div key={label} style={{ ...glass, padding: '8px 4px', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(19,164,236,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: primary }}>
                <SvgIcon name={icon} size={12} />
              </div>
              <span style={{ fontSize: '5.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#cbd5e1', textAlign: 'center' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Bottom Nav */}
      <div style={{ ...glass, borderTop: '1px solid rgba(30,41,59,0.5)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 6px', marginTop: '10px', position: 'relative', zIndex: 1 }}>
        {bottomNav.map(({ icon, label, active: isActive }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: isActive ? primary : '#64748b' }}>
            <SvgIcon name={icon} size={14} />
            <span style={{ fontSize: '6px', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TEACHER DASHBOARD MOCKUP  (sidebar + student-view layout)
// ============================================================
function TeacherDashboardMockup() {
  const primary = '#3c83f6';
  const bg      = '#101722';
  const cardBg  = '#0f172a';
  const border  = '1px solid rgba(30,41,59,0.9)';
  const muted   = '#64748b';

  const navItems = [
    { icon: 'analytics', label: 'Dashboard',   active: true  },
    { icon: 'star',      label: 'My Grades',   active: false },
    { icon: 'calendar',  label: 'Attendance',  active: false },
    { icon: 'report',    label: 'Assignments', active: false },
    { icon: 'audit',     label: 'Schedule',    active: false },
    { icon: 'mail',      label: 'Messages',    active: false },
  ];

  const stats = [
    { label: 'GPA',        value: '3.8', sub: '+0.2 from last term',       subColor: '#22c55e', iconBg: 'rgba(59,130,246,0.1)',  iconColor: '#3b82f6', icon: 'star'     },
    { label: 'Attendance', value: '94%', progress: 94,                                          iconBg: 'rgba(16,185,129,0.1)',  iconColor: '#10b981', icon: 'calendar' },
    { label: 'Subjects',   value: '6',   sub: 'Enrolled this semester',     subColor: muted,     iconBg: `rgba(60,131,246,0.1)`, iconColor: primary,   icon: 'report'   },
    { label: 'Exams',      value: '2',   sub: 'Coming up this week',        subColor: '#f97316', iconBg: 'rgba(249,115,22,0.1)', iconColor: '#f97316', icon: 'calendar' },
  ];

  const grades = [
    { subject: 'Math',    teacher: 'Mr. Smith', score: 92, grade: 'A'  },
    { subject: 'Physics', teacher: 'Dr. Brown', score: 85, grade: 'B+' },
    { subject: 'English', teacher: 'Ms. Davis', score: 88, grade: 'A-' },
  ];

  const assignments = [
    { label: 'History Essay', sub: 'Due in 2 days', iconBg: 'rgba(239,68,68,0.1)',  iconColor: '#ef4444', icon: 'report' },
    { label: 'Calc Homework', sub: 'Due tomorrow',  iconBg: 'rgba(59,130,246,0.1)', iconColor: '#3b82f6', icon: 'code'   },
  ];

  const announcements = [
    { title: 'Spring Break Dates', sub: 'Starting from March 24th…', active: true  },
    { title: 'New Library Hours',  sub: 'Open until 10 PM weekdays.',  active: false },
  ];

  const perfBars = [85, 95, 60, 90, 100];

  return (
    <div style={{ background: bg, borderRadius: '14px', overflow: 'hidden', width: '100%', fontFamily: 'Inter, sans-serif', color: '#fff', display: 'flex' }}>

      {/* ══ Sidebar ══ */}
      <div style={{ width: '108px', flexShrink: 0, background: 'rgba(15,23,42,0.85)', borderRight: border, display: 'flex', flexDirection: 'column', padding: '10px 6px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', marginBottom: '14px' }}>
          <div style={{ background: primary, borderRadius: '6px', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PruhLogo size={14} showText={false} variant="white" />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: primary, letterSpacing: '-0.02em' }}>EK-SMS</span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          {navItems.map(({ icon, label, active }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 8px', borderRadius: '8px', background: active ? primary : 'transparent', color: active ? '#fff' : muted, fontSize: '7.5px', fontWeight: active ? 600 : 400 }}>
              <SvgIcon name={icon} size={10} />
              {label}
            </div>
          ))}
        </div>

        {/* Profile */}
        <div style={{ borderTop: border, paddingTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 8px', borderRadius: '8px', color: muted, fontSize: '7.5px' }}>
            <SvgIcon name="people" size={10} />
            Profile
          </div>
        </div>
      </div>

      {/* ══ Main content ══ */}
      <div style={{ flex: 1, overflow: 'auto', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* ── Sticky header ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(16,23,34,0.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderBottom: border }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700 }}>Hello, John 👋</div>
            <div style={{ fontSize: '7px', color: muted }}>Welcome back to your dashboard.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ position: 'relative', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="#94a3b8"><path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2m6-6V11a6 6 0 0 0-5-5.92V4a1 1 0 0 0-2 0v1.08A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
              <div style={{ position: 'absolute', top: '2px', right: '2px', width: '4px', height: '4px', background: '#ef4444', borderRadius: '50%' }} />
            </div>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `rgba(60,131,246,0.2)`, border: `2px solid rgba(60,131,246,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: primary }}>
              <SvgIcon name="people" size={11} />
            </div>
          </div>
        </div>

        {/* ── Page body ── */}
        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* Stats 4-col grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '5px' }}>
            {stats.map(({ label, value, sub, subColor, iconBg, iconColor, icon, progress }) => (
              <div key={label} style={{ background: cardBg, border, padding: '7px 8px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '6px', color: '#94a3b8', fontWeight: 500 }}>{label}</span>
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SvgIcon name={icon} size={9} />
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1 }}>{value}</div>
                {progress !== undefined ? (
                  <div style={{ height: '2px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden', marginTop: '5px' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: '#10b981' }} />
                  </div>
                ) : (
                  <div style={{ fontSize: '5.5px', color: subColor, fontWeight: 500, marginTop: '3px' }}>{sub}</div>
                )}
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {/* Academic Performance — SVG line chart */}
            <div style={{ background: cardBg, border, padding: '8px 10px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '7.5px', fontWeight: 700 }}>Academic Performance</span>
                <span style={{ fontSize: '5.5px', color: muted, background: '#1e293b', padding: '1px 5px', borderRadius: '4px' }}>Term</span>
              </div>
              <svg width="100%" height="48" viewBox="0 0 400 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sa-perf-grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={primary} stopOpacity="0.3"/>
                    <stop offset="100%" stopColor={primary} stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,120 Q50,110 80,60 T160,80 T240,40 T320,50 T400,20 V150 H0 Z" fill="url(#sa-perf-grad)"/>
                <path d="M0,120 Q50,110 80,60 T160,80 T240,40 T320,50 T400,20" fill="none" stroke={primary} strokeWidth="3" strokeLinecap="round"/>
                <circle cx="80" cy="60" r="4" fill={primary}/>
                <circle cx="240" cy="40" r="4" fill={primary}/>
                <circle cx="400" cy="20" r="4" fill={primary}/>
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                {['Jan','Feb','Mar','Apr','May'].map(m => <span key={m} style={{ fontSize: '5.5px', color: muted, fontWeight: 500 }}>{m}</span>)}
              </div>
            </div>

            {/* Attendance Trend — bar chart */}
            <div style={{ background: cardBg, border, padding: '8px 10px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '7.5px', fontWeight: 700 }}>Attendance Trend</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: primary }}/>
                  <span style={{ fontSize: '5.5px', color: muted }}>Present</span>
                </div>
              </div>
              <div style={{ height: '48px', display: 'flex', alignItems: 'flex-end', gap: '3px', padding: '0 2px' }}>
                {perfBars.map((h, i) => (
                  <div key={i} style={{ flex: 1, background: '#1e293b', borderRadius: '2px 2px 0 0', height: `${h}%`, position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `rgba(60,131,246,0.45)`, borderRadius: '2px 2px 0 0', height: '100%' }}/>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                {['Mon','Tue','Wed','Thu','Fri'].map(d => <span key={d} style={{ fontSize: '5.5px', color: muted, fontWeight: 500 }}>{d}</span>)}
              </div>
            </div>
          </div>

          {/* Grades table + side panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: '6px' }}>
            {/* Subject Grades table */}
            <div style={{ background: cardBg, border, borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '7px 10px', borderBottom: border }}>
                <span style={{ fontSize: '7.5px', fontWeight: 700 }}>Subject Grades</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', padding: '4px 10px', background: 'rgba(30,41,59,0.5)' }}>
                {['Subject','Teacher','Score','Grade'].map(h => (
                  <span key={h} style={{ fontSize: '5.5px', fontWeight: 700, color: muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {grades.map(({ subject, teacher, score, grade }, i) => (
                <div key={subject} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', padding: '5px 10px', borderBottom: i < grades.length - 1 ? border : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: '7px', fontWeight: 600 }}>{subject}</span>
                  <span style={{ fontSize: '6.5px', color: muted }}>{teacher}</span>
                  <span style={{ fontSize: '7.5px', fontWeight: 700 }}>{score}</span>
                  <span style={{ fontSize: '6.5px', fontWeight: 700, color: primary, background: `rgba(60,131,246,0.12)`, padding: '1px 5px', borderRadius: '5px' }}>{grade}</span>
                </div>
              ))}
            </div>

            {/* Right column — Assignments + Announcements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Assignments */}
              <div style={{ background: cardBg, border, borderRadius: '10px', padding: '7px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '7.5px', fontWeight: 700 }}>Assignments</span>
                  <span style={{ fontSize: '6px', color: primary, fontWeight: 600 }}>View All</span>
                </div>
                {assignments.map(({ label, sub, iconBg, iconColor, icon }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', padding: '5px 6px', borderRadius: '7px', background: '#1e293b', marginBottom: '4px' }}>
                    <div style={{ padding: '3px', borderRadius: '5px', background: iconBg, color: iconColor, flexShrink: 0 }}>
                      <SvgIcon name={icon} size={9}/>
                    </div>
                    <div>
                      <div style={{ fontSize: '7px', fontWeight: 700 }}>{label}</div>
                      <div style={{ fontSize: '5.5px', color: muted }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Announcements */}
              <div style={{ background: cardBg, border, borderRadius: '10px', padding: '7px 10px' }}>
                <span style={{ fontSize: '7.5px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Announcements</span>
                {announcements.map(({ title, sub, active }) => (
                  <div key={title} style={{ borderLeft: `3px solid ${active ? primary : '#334155'}`, paddingLeft: '6px', paddingTop: '2px', paddingBottom: '2px', marginBottom: '5px' }}>
                    <div style={{ fontSize: '7px', fontWeight: 700 }}>{title}</div>
                    <div style={{ fontSize: '5.5px', color: muted, marginTop: '1px' }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
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
  const wrapRef = useRef(null);
  const role = ROLES_DATA.find((r) => r.key === active);

  /* ── Scroll-driven tab switching (desktop only) ── */
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth <= 768) return;
      const el = wrapRef.current;
      if (!el) return;
      const rect       = el.getBoundingClientRect();
      const scrolled   = -rect.top;
      const scrollable = el.offsetHeight - window.innerHeight;
      if (scrolled < 0 || scrolled > scrollable) return;
      const progress = scrolled / scrollable;
      const idx = Math.min(Math.floor(progress * ROLES_DATA.length), ROLES_DATA.length - 1);
      const key = ROLES_DATA[idx].key;
      setActive(prev => (prev !== key ? key : prev));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={wrapRef} className="lp-roles-scroll-wrap" id="roles">
      <div className="lp-roles-sticky">
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
            {/* Left panel — re-keyed so perks stagger in on every switch */}
            <div key={`left-${active}`} className="lp-roles-card__left lp-roles-anim">
              <div className="lp-roles-card__icon-wrap" style={{ color: role.color, background: `${role.color}18` }}>
                <SvgIcon name={role.icon} size={32} />
              </div>
              <h3 className="lp-roles-card__title">{role.label}</h3>
              <p className="lp-roles-card__sub">{role.subtitle}</p>
              <ul className="lp-roles-card__perks">
                {role.perks.map((p, i) => (
                  <li
                    key={p}
                    className="lp-roles-card__perk lp-roles-perk-anim"
                    style={{ animationDelay: `${0.08 + i * 0.07}s` }}
                  >
                    <span className="lp-roles-card__perk-dot" style={{ background: role.color }} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right panel — re-keyed to trigger mockup slide-in */}
            <div className="lp-roles-card__right">
              <div key={active} className="lp-roles-right-anim" style={{ width: '100%' }}>
                {active === 'superadmin' ? (
                  <SuperAdminDashboardMockup />
                ) : active === 'schooladmin' ? (
                  <SchoolAdminDashboardMockup />
                ) : active === 'teacher' ? (
                  <TeacherDashboardMockup />
                ) : (
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
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll-progress pill dots */}
        <div className="lp-roles-progress">
          {ROLES_DATA.map(({ key, color }) => (
            <button
              key={key}
              className={`lp-roles-progress__dot${active === key ? ' lp-roles-progress__dot--active' : ''}`}
              style={active === key ? { background: color } : {}}
              onClick={() => setActive(key)}
              aria-label={key}
            />
          ))}
        </div>

        {/* Scroll hint — visible only at top of section */}
        <div className="lp-roles-scroll-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
          scroll to explore
        </div>
      </div>
    </div>
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
  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
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
          <button className="lp-btn lp-btn--primary" onClick={scrollToContact}>Get in Touch <SvgIcon name="send" size={14} /></button>
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
// CONTACT SECTION
// ============================================================
const CONTACT_INFO = [
  { icon: 'mail',     label: 'Email Support',  value: 'support@elkendeh.com',                color: '#0dccf2' },
  { icon: 'phone',    label: 'Call Us',         value: '+231555292225 / +23278005141',         color: '#A78BFA' },
  { icon: 'location', label: 'Headquarters',    value: 'Sinkor, 21st Street Coleman Avenue',  color: '#34D399' },
];

const SUPPORT_CATS = [
  { icon: 'emergency', color: '#F472B6', title: 'Technical Support',  desc: 'System issues, errors, or outages. We aim for under 2-hour response.' },
  { icon: 'analytics', color: '#0dccf2', title: 'Sales & Onboarding', desc: 'Questions about plans, demos, and getting your school started.' },
  { icon: 'payments',  color: '#34D399', title: 'Billing & Finance',  desc: 'Invoice queries, payment issues, or subscription changes.' },
  { icon: 'code',      color: '#A78BFA', title: 'Developer & API',    desc: 'API access, webhooks, and integration documentation.' },
];

function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'General Inquiry', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setForm({ name: '', email: '', subject: 'General Inquiry', message: '' });
    }, 3000);
  };

  return (
    <section className="lp-section" id="contact">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge lp-badge--primary">
            <SvgIcon name="mail" size={13} />
            Customer Support
          </div>
          <h2 className="lp-section-title">Get in Touch</h2>
          <p className="lp-section-sub">We're here to help your institution succeed. Reach out for support, sales, or general inquiries.</p>
        </div>

        <div className="lp-contact__info">
          {CONTACT_INFO.map(({ icon, label, value, color }) => (
            <div key={label} className="lp-contact__info-card">
              <div className="lp-contact__info-icon" style={{ color, background: `${color}18` }}>
                <SvgIcon name={icon} size={20} />
              </div>
              <div className="lp-contact__info-body">
                <p className="lp-contact__info-label">{label}</p>
                <p className="lp-contact__info-value">{value}</p>
              </div>
              <span className="lp-contact__info-arrow">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                </svg>
              </span>
            </div>
          ))}
        </div>

        <div className="lp-contact__body">
          <div className="lp-contact__form-wrap">
            <div className="lp-contact__form-header">
              <SvgIcon name="send" size={18} style={{ color: 'var(--lp-primary)' }} />
              <h3 className="lp-contact__form-title">Send a Message</h3>
            </div>
            <form className="lp-contact__form" onSubmit={handleSubmit}>
              <div className="lp-contact__field">
                <label className="lp-contact__label">Full Name</label>
                <div className="lp-contact__input-wrap">
                  <SvgIcon name="people" size={16} className="lp-contact__input-icon" />
                  <input
                    className="lp-contact__input"
                    type="text"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="lp-contact__field">
                <label className="lp-contact__label">School Email</label>
                <div className="lp-contact__input-wrap">
                  <SvgIcon name="mail" size={16} className="lp-contact__input-icon" />
                  <input
                    className="lp-contact__input"
                    type="email"
                    placeholder="admin@school.edu"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="lp-contact__field">
                <label className="lp-contact__label">Subject</label>
                <div className="lp-contact__input-wrap">
                  <SvgIcon name="report" size={16} className="lp-contact__input-icon" />
                  <select
                    className="lp-contact__input lp-contact__select"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  >
                    <option>General Inquiry</option>
                    <option>Technical Support</option>
                    <option>Billing Question</option>
                    <option>Feature Request</option>
                    <option>Partnership Inquiry</option>
                  </select>
                </div>
              </div>
              <div className="lp-contact__field">
                <label className="lp-contact__label">Message</label>
                <textarea
                  className="lp-contact__input lp-contact__textarea"
                  placeholder="How can we help you today?"
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                />
              </div>
              <button
                type="submit"
                className={`lp-btn lp-btn--primary lp-btn--full${sent ? ' lp-contact__btn--sent' : ''}`}
              >
                {sent
                  ? <><SvgIcon name="check" size={16} /> Message Sent!</>
                  : <><SvgIcon name="send" size={16} /> Send Message</>
                }
              </button>
            </form>
          </div>

          <div className="lp-contact__support">
            <h3 className="lp-contact__support-title">How Can We Help?</h3>
            <p className="lp-contact__support-sub">Browse our support categories to find the right team for your question.</p>
            <div className="lp-contact__categories">
              {SUPPORT_CATS.map(({ icon, color, title, desc }) => (
                <div key={title} className="lp-contact__category">
                  <div className="lp-contact__cat-icon" style={{ color, background: `${color}18` }}>
                    <SvgIcon name={icon} size={18} />
                  </div>
                  <div>
                    <p className="lp-contact__cat-title">{title}</p>
                    <p className="lp-contact__cat-desc">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="lp-contact__response-info">
              <span className="lp-security__pulse-dot" />
              <span>Average response time: <strong>under 4 hours</strong></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// CTA BANNER
// ============================================================
function CTABanner({ onNavigate }) {
  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <section className="lp-cta-banner">
      <div className="lp-cta-banner__glow" aria-hidden="true" />
      <div className="lp-container lp-cta-banner__inner">
        <h2 className="lp-cta-banner__title">Ready to transform your school?</h2>
        <p className="lp-cta-banner__sub">Join hundreds of African institutions modernizing their education management with EK-SMS today.</p>
        <div className="lp-cta-banner__actions">
          <button className="lp-btn lp-btn--white lp-btn--lg" onClick={() => onNavigate('register')}>Book a Demo</button>
          <button className="lp-btn lp-btn--ghost-white lp-btn--lg" onClick={scrollToContact}>
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
              <PruhLogo size={36} showText={true} variant="white" textColor="rgba(255,255,255,0.92)" />
            </div>
            <p className="lp-footer__brand-product">2026 EL-KENDEH School Management System (EK-SMS)</p>
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
              {[['Features','features'],['Security','security'],['Workflow','workflow']].map(([l,id]) => (
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
              {[['About Us','about'],['Team','team'],['FAQ','faq'],['Contact','contact']].map(([l,id]) => (
                <li key={l}><button className="lp-footer__link" onClick={() => scrollTo(id)}>{l}</button></li>
              ))}
              {['Careers','Partners'].map((l) => <li key={l}><span className="lp-footer__link">{l}</span></li>)}
            </ul>
          </div>
        </div>

        <div className="lp-footer__bottom">
          <p className="lp-footer__copy">© 2026 EL-KENDEH School Management System (EK-SMS). All rights reserved.</p>
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
        <FAQSection />
        <AboutSection />
        <ContactSection />
        <CTABanner onNavigate={onNavigate} />
      </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
