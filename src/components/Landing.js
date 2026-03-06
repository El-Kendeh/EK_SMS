import React, { useState, useEffect, useRef } from 'react';
import './Landing.css';
import PruhLogo from './PruhLogo';
import Ballpit from './Ballpit';
import ScrollVelocity from './ScrollVelocity';
import Hyperspeed from './Hyperspeed';
import ClickSpark from './ClickSpark';
import { LanguageProvider, useLang } from '../i18n/LanguageContext';
import InstallPrompt from './InstallPrompt';

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
const CYCLING_KEYS = [
  { key: 'word_enrollment',      color: '#0dccf2' },
  { key: 'word_academics',       color: '#22D3A3' },
  { key: 'word_attendance',      color: '#A78BFA' },
  { key: 'word_staff_mgmt',      color: '#FB923C' },
  { key: 'word_grade_reporting', color: '#F472B6' },
  { key: 'word_scheduling',      color: '#60A5FA' },
  { key: 'word_student_prog',    color: '#34D399' },
  { key: 'word_communication',   color: '#FBBF24' },
];

function AnimatedWord() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('visible');
  const { t } = useLang();

  useEffect(() => {
    const id = setInterval(() => {
      setPhase('exit');
      setTimeout(() => {
        setIndex((i) => (i + 1) % CYCLING_KEYS.length);
        setPhase('enter');
        setTimeout(() => setPhase('visible'), 30);
      }, 300);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const { key, color } = CYCLING_KEYS[index];
  return (
    <span
      className={`lp-cycling-word lp-cycling-word--${phase}`}
      style={{ color, textShadow: `0 0 22px ${color}70, 0 0 48px ${color}30` }}
      aria-live="polite"
      aria-atomic="true"
    >
      {t(key)}
    </span>
  );
}

// ============================================================
// ANIMATED HEADLINE (cycling between two hero headlines)
// ============================================================
function AnimatedHeadline() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('visible');
  const { t } = useLang();

  const headlines = [
    <>{t('hero_h1a')}<br />{t('hero_h1b')}{' '}<span className="lp-hero__headline-gradient">{t('hero_h1c')}</span></>,
    <>{t('hero_h2a')}<br />{t('hero_h2b')} <span className="lp-hero__headline-gradient">{t('hero_h2c')}</span></>,
  ];

  useEffect(() => {
    const id = setInterval(() => {
      setPhase('exit');
      setTimeout(() => {
        setIndex(i => (i + 1) % headlines.length);
        setPhase('enter');
        setTimeout(() => setPhase('visible'), 50);
      }, 380);
    }, 4500);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <h1 className={`lp-hero__headline lp-cycling-headline lp-cycling-headline--${phase}`}>
      {headlines[index]}
    </h1>
  );
}

// ============================================================
// ANIMATED SUBHEADLINE (cycling between two hero subs)
// ============================================================
function AnimatedSubHeadline() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('visible');
  const { t } = useLang();

  const subs = [t('hero_sub1'), t('hero_sub2')];

  useEffect(() => {
    const id = setInterval(() => {
      setPhase('exit');
      setTimeout(() => {
        setIndex(i => (i + 1) % subs.length);
        setPhase('enter');
        setTimeout(() => setPhase('visible'), 50);
      }, 380);
    }, 5000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <p className={`lp-hero__sub lp-cycling-sub lp-cycling-sub--${phase}`}>
      {t('hero_sub_prefix')}{subs[index]}
    </p>
  );
}

// ============================================================
// HOOKS — scroll reveal, count-up
// ============================================================
function useScrollReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useCountUp(target, duration = 2200) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useScrollReveal(0.4);
  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, target, duration]);
  return [ref, count];
}

/* Staggered count-up — driven by external `started` flag + a per-item delay.
   Returns [count, progress 0-1, done boolean] */
function useCountUpStaggered(target, duration, delay, started) {
  const [count, setCount]       = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone]         = useState(false);
  useEffect(() => {
    if (!started) return;
    let raf;
    const timer = setTimeout(() => {
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setCount(Math.round(eased * target));
        setProgress(eased);
        if (p < 1) { raf = requestAnimationFrame(tick); }
        else { setDone(true); }
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [started, target, duration, delay]);
  return [count, progress, done];
}

// ============================================================
// PARTICLE FIELD  (canvas — draws nodes + lines, reacts to mouse)
// ============================================================
function ParticleField({ count = 55 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const mouse = { x: -2000, y: -2000 };

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMouseMove = (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const onMouseLeave = () => { mouse.x = -2000; mouse.y = -2000; };
    canvas.addEventListener('mousemove', onMouseMove, { passive: true });
    canvas.addEventListener('mouseleave', onMouseLeave);

    const pts = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.3 + 0.4,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      a: Math.random() * 0.4 + 0.15,
    }));

    const CONN = 130, MCONN = 160;
    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < CONN) { ctx.beginPath(); ctx.strokeStyle = `rgba(13,204,242,${0.07 * (1 - d / CONN)})`; ctx.lineWidth = 0.6; ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
        }
        const md = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (md < MCONN) {
          ctx.beginPath(); ctx.strokeStyle = `rgba(13,204,242,${0.2 * (1 - md / MCONN)})`; ctx.lineWidth = 0.9; ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          p.vx += ((p.x - mouse.x) / md) * 0.011;
          p.vy += ((p.y - mouse.y) / md) * 0.011;
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(13,204,242,${p.a})`; ctx.fill();
        p.x += p.vx; p.y += p.vy; p.vx *= 0.999; p.vy *= 0.999;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); ro.disconnect(); canvas.removeEventListener('mousemove', onMouseMove); canvas.removeEventListener('mouseleave', onMouseLeave); };
  }, []);
  return <canvas ref={canvasRef} className="lp-particles" aria-hidden="true" />;
}

// ============================================================
// CURSOR GLOW
// ============================================================
function CursorGlow() {
  const [pos, setPos] = useState({ x: -400, y: -400 });
  useEffect(() => {
    const move = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);
  return <div className="lp-cursor-glow" style={{ left: pos.x, top: pos.y }} aria-hidden="true" />;
}

// ============================================================
// ANIMATED STATS STRIP
// ============================================================
const STATS_DATA = [
  { target: 500,   suffix: '+',    prefix: '',  tKey: 'stat_institutions' },
  { target: 50000, suffix: '+',    prefix: '',  tKey: 'stat_students'     },
  { target: 99,    suffix: '.9%',  prefix: '',  tKey: 'stat_uptime'       },
  { target: 30,    suffix: ' min', prefix: '<', tKey: 'stat_setup'        },
];

function StatItem({ target, suffix, prefix, tKey, delay, started }) {
  const DURATION = 1800;
  const [count, progress, done] = useCountUpStaggered(target, DURATION, delay, started);
  const { t } = useLang();
  return (
    <div className={`lp-stat-item${done ? ' lp-stat-item--done' : started ? ' lp-stat-item--counting' : ''}`}>
      {/* fill bar that tracks count progress */}
      <div
        className="lp-stat-bar"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
      <div className="lp-stat-number">
        <span className="lp-stat-affix lp-stat-affix--pre">{prefix}</span>
        {count.toLocaleString()}
        {/* suffix fades in only at completion for a satisfying reveal */}
        <span className={`lp-stat-affix lp-stat-affix--post${done ? ' lp-stat-affix--visible' : ''}`}>
          {suffix}
        </span>
      </div>
      <p className="lp-stat-label">{t(tKey)}</p>
    </div>
  );
}

function StatsSection() {
  const [started, setStarted] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="lp-stats">
      <div className="lp-container lp-stats__inner">
        {STATS_DATA.map((s, i) => (
          <StatItem key={s.tKey} {...s} delay={i * 160} started={started} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// LANGUAGE TOGGLE
// ============================================================
function LangToggle() {
  const { lang, toggleLang } = useLang();
  return (
    <button
      className="lp-nav__lang-toggle"
      onClick={toggleLang}
      aria-label={lang === 'en' ? 'Switch to French' : 'Passer en anglais'}
    >
      <span className="lp-nav__lang-flag">{lang === 'en' ? 'FR' : 'EN'}</span>
    </button>
  );
}

// ============================================================
// NAVBAR
// ============================================================
function Navbar({ onNavigate, menuOpen, setMenuOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const { t } = useLang();

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
    [t('nav_features'), 'features'],
    [t('nav_roles'),    'roles'],
    [t('nav_security'), 'security'],
    [t('nav_about'),    'about'],
    [t('nav_contact'),  'contact'],
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
          <LangToggle />
          <button className="lp-nav__btn-ghost" onClick={() => onNavigate('login')}>{t('nav_signin')}</button>
          <button className="lp-nav__btn-primary" onClick={() => onNavigate('register')}>{t('nav_getstarted')}</button>
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
            <div className="lp-nav__mobile-lang"><LangToggle /></div>
            <button className="lp-btn lp-btn--outline lp-btn--full" onClick={() => { setMenuOpen(false); onNavigate('login'); }}>{t('nav_signin')}</button>
            <button className="lp-btn lp-btn--primary lp-btn--full" onClick={() => { setMenuOpen(false); onNavigate('register'); }}>{t('nav_register')}</button>
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
  const heroRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const { t } = useLang();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2);
      const ny = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
      setTilt({ x: ny * -5, y: nx * 5 });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });
    el.addEventListener('mousemove', onMove, { passive: true });
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, []);

  const isResting = tilt.x === 0 && tilt.y === 0;

  return (
    <section ref={heroRef} className="lp-hero" id="hero">
      {/* Ballpit 3D physics background — desktop only (too heavy for mid-range Android) */}
      {!isMobile && (
        <div className="lp-hero__ballpit" style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          opacity: 0.35,
        }}>
          <Ballpit
            count={80}
            gravity={0.01}
            friction={0.9975}
            wallBounce={0.95}
            followCursor={false}
            colors={[0x0dccf2, 0x22D3A3, 0xA78BFA, 0x1B3FAF, 0x0dccf2]}
          />
        </div>
      )}

      {/* Particle network — reduced count on mobile */}
      <ParticleField count={isMobile ? 22 : 55} />

      {/* Grid overlay */}
      <div className="lp-hero__grid" aria-hidden="true" />

      {/* Original glows */}
      <div className="lp-hero__glow lp-hero__glow--1" aria-hidden="true" />
      <div className="lp-hero__glow lp-hero__glow--2" aria-hidden="true" />

      {/* Extra animated orbs */}
      <div className="lp-hero__orb lp-hero__orb--a" aria-hidden="true" />
      <div className="lp-hero__orb lp-hero__orb--b" aria-hidden="true" />
      <div className="lp-hero__orb lp-hero__orb--c" aria-hidden="true" />

      <div className="lp-container lp-hero__inner">
        {/* ── Text column ── */}
        <div className="lp-hero__text">
          <div className="lp-hero__badge">
            <PruhLogo size={18} showText={false} variant="white" />
            <span className="lp-hero__badge-sep" />
            <span className="lp-hero__badge-check">✔</span>
            <span className="lp-hero__badge-text">{t('hero_badge')}</span>
          </div>

          <AnimatedHeadline />

          <p className="lp-hero__sub lp-hero__sub--animated">
            {t('hero_simplify_prefix')} <AnimatedWord /> {t('hero_simplify_suffix')}
          </p>
          <AnimatedSubHeadline />

          <div className="lp-hero__ctas">
            <button className="lp-btn lp-btn--cta-primary lp-btn--lg" onClick={() => onNavigate('register')}>
              <SvgIcon name="rocket" size={18} />
              {t('hero_cta_register')}
            </button>
            <button className="lp-btn lp-btn--cta-outline lp-btn--lg" onClick={() => onNavigate('login')}>
              <SvgIcon name="play" size={18} />
              {t('hero_cta_demo')}
            </button>
          </div>

          <div className="lp-hero__trust">
            {[t('hero_trust_0'), t('hero_trust_1'), t('hero_trust_2')].map((item) => (
              <span key={item} className="lp-hero__trust-item">
                <SvgIcon name="check" size={13} />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ── 3D Floating Dashboard ── */}
        <div className="lp-hero__mockup-wrap lp-hero__mockup-float">
          <div
            className="lp-hero__mockup"
            style={{
              transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: isResting ? 'transform 0.9s ease' : 'transform 0.12s ease',
            }}
          >
            <div className="lp-mockup__chrome">
              <span className="lp-mockup__dot" style={{ background: '#EF4444' }} />
              <span className="lp-mockup__dot" style={{ background: '#F59E0B' }} />
              <span className="lp-mockup__dot" style={{ background: '#10B981' }} />
              <div className="lp-mockup__url" />
              {/* blinking notification */}
              <div className="lp-mockup__notif" aria-hidden="true" />
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
                      <div
                        className="lp-mockup__bar lp-mockup__bar--anim"
                        style={{ height: `${h}%`, animationDelay: `${0.5 + i * 0.07}s` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Reflection glow beneath dashboard */}
          <div className="lp-hero__mockup-glow" aria-hidden="true" />
        </div>
      </div>

      {/* Partners trust bar */}
      <div className="lp-hero__partners">
        <p className="lp-hero__partners-label">{t('hero_partners_label')}</p>
        <ScrollVelocity
          texts={[
            'Greenwood Academy  ·  Albert Academy  ·  Methodist Boys HS  ·  Academy Tech  ·  Christ the Kings College  ·',
          ]}
          velocity={60}
          numCopies={4}
          className="lp-hero__partner"
        />
      </div>
    </section>
  );
}

// ============================================================
// FEATURES SECTION
// ============================================================
const FEATURES_CATEGORIES = [
  {
    id: 'academics',
    label: 'Academics',
    icon: 'teacher',
    color: '#34D399',
    features: [
      { icon: 'analytics', color: '#F472B6', title: 'Results & Grading',   desc: 'CA, MidTerm, and Final score tracking with auto-computed totals, letter grades and class rankings.',
        flip: true, backPoints: ['CA + MidTerm + Final scoring', 'Auto-computed grade letters', 'Class rank & position', 'Bulk grade entry & locking'] },
      { icon: 'calendar',  color: '#34D399', title: 'Attendance',           desc: 'Real-time attendance tracking with automated SMS notifications sent directly to guardians.' },
      { icon: 'audit',     color: '#60A5FA', title: 'Timetable',            desc: 'Build weekly class schedules, assign teachers to subjects, and avoid scheduling conflicts automatically.',
        flip: true, backPoints: ['Drag-and-drop timetable builder', 'Teacher conflict detection', 'Subject hour tracking', 'Printable weekly schedule'] },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: 'school',
    color: '#A78BFA',
    features: [
      { icon: 'school',   color: '#0dccf2', title: 'Admissions',          desc: 'Streamlined student intake: application forms, document upload, screening, and enrollment confirmation.',
        flip: true, backPoints: ['Online application portal', 'Document upload & verification', 'Bulk approval workflow', 'Automated acceptance letters'] },
      { icon: 'people',   color: '#60A5FA', title: 'Student Records',     desc: 'Centralized database for student profiles, academic history, disciplinary records and bulk enrollment.',
        flip: true, backPoints: ['Bulk CSV / Excel student import', 'Photo, docs & disciplinary log', 'Full academic history per term', 'Search, filter & export records'] },
      { icon: 'teacher',  color: '#A78BFA', title: 'Teacher Management',  desc: 'Staff profiles, subject assignments, lesson planning, attendance marking, and parent communication.' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'payments',
    color: '#FB923C',
    features: [
      { icon: 'payments',  color: '#FB923C', title: 'Fees',               desc: 'Automated invoicing with flexible fee structures, term-based billing, and scholarship tracking.',
        flip: true, backPoints: ['Flexible fee structure setup', 'Term-based auto-invoicing', 'Scholarship & bursary tracking', 'Multi-currency support'] },
      { icon: 'verified',  color: '#4ADE80', title: 'Payment Tracking',   desc: 'Monitor all incoming payments, flag arrears, send automated reminders, and reconcile deposits.' },
      { icon: 'report',    color: '#FBBF24', title: 'Reports',            desc: 'One-click financial reports: collection summaries, outstanding balances, and per-student fee statements.',
        flip: true, backPoints: ['Collection summary by term', 'Outstanding balance reports', 'Per-student fee statements', 'Export to Excel or PDF'] },
    ],
  },
];

function FlipCard({ icon, color, title, desc, backPoints, autoFlipped }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (autoFlipped) setFlipped(true);
  }, [autoFlipped]);

  return (
    <div
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
  const [activeCategory, setActiveCategory] = useState('academics');
  const [sectionSeen, setSectionSeen] = useState(false);
  const sectionRef = useRef(null);
  const { t } = useLang();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setSectionSeen(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const category = FEATURES_CATEGORIES.find(c => c.id === activeCategory);

  return (
    <section ref={sectionRef} className="lp-section lp-section--alt" id="features">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge lp-badge--primary">{t('feat_badge')}</div>
          <h2 className="lp-section-title">{t('feat_title')}</h2>
          <p className="lp-section-sub">{t('feat_sub')}</p>
        </div>

        <div className="lp-features-tabs">
          {FEATURES_CATEGORIES.map(({ id, color, icon }) => (
            <button
              key={id}
              className={`lp-features-tab${activeCategory === id ? ' lp-features-tab--active' : ''}`}
              style={activeCategory === id ? { borderColor: color, color } : {}}
              onClick={() => setActiveCategory(id)}
            >
              <SvgIcon name={icon} size={16} />
              {t(`feat_cat_${id}`)}
            </button>
          ))}
        </div>

        <div className={`lp-features-grid lp-features-grid--3col${sectionSeen ? ' lp-features-grid--seen' : ''}`}>
          {category.features.map(({ icon, color, title, desc, flip, backPoints }) =>
            flip
              ? <FlipCard key={title} icon={icon} color={color} title={title} desc={desc} backPoints={backPoints} autoFlipped={sectionSeen} />
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

function ParentDashboardMockup() {
  const primary  = '#3b82f6';
  const cyan     = '#06b6d4';
  const bg       = '#0f172a';
  const card     = '#1e293b';
  const bdr      = '1px solid #334155';
  const muted    = '#94a3b8';
  const txt      = '#e2e8f0';

  /* Inline SVG paths for icons not in the global ICON_PATHS */
  const bellPath    = 'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2m6-6V11a6 6 0 0 0-5-5.92V4a1 1 0 0 0-2 0v1.08A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z';
  const trendUp     = 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z';
  const homePath    = 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z';
  const walletPath  = 'M21 7.28V5c0-1.1-.9-2-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-2.28c.59-.35 1-.98 1-1.72V9c0-.74-.41-1.37-1-1.72zM21 9v6h-7V9h7zM5 19V5h14v2h-6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h6v2H5z';
  const headsetPath = 'M12 3C7.03 3 3 7.03 3 12v1h2v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h2v-1c0-4.97-4.03-9-9-9zM5 12H3c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h2V12zm14 0h-2v4h2c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1z';
  const receiptPath = 'M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5zM19 19.09H5V4.91h14v14.18zM6 15h12v2H6zm0-4h12v2H6zm0-4h12v2H6z';

  const metrics = [
    { label: 'GPA Score',  value: '3.8',  icon: ICON_PATHS.school,   color: primary,   iBg: 'rgba(59,130,246,0.12)',  iBdr: 'rgba(59,130,246,0.25)' },
    { label: 'Attendance', value: '95%',  icon: ICON_PATHS.calendar, color: '#4ade80', iBg: 'rgba(74,222,128,0.12)',  iBdr: 'rgba(74,222,128,0.25)' },
    { label: 'Due Fees',   value: '$150', icon: ICON_PATHS.payments,  color: '#fb923c', iBg: 'rgba(251,146,60,0.12)', iBdr: 'rgba(251,146,60,0.25)', accent: '#f97316' },
    { label: 'Exams',      value: '2',    icon: ICON_PATHS.report,   color: '#c084fc', iBg: 'rgba(192,132,252,0.12)', iBdr: 'rgba(192,132,252,0.25)' },
  ];

  const bars = [
    { month: 'JAN', cls: 80, ind: 60 },
    { month: 'FEB', cls: 90, ind: 75 },
    { month: 'MAR', cls: 85, ind: 65 },
    { month: 'APR', cls: 95, ind: 85, hi: true },
    { month: 'MAY', cls: 75, ind: 70 },
  ];

  const Icon = ({ path, size = 12, color = txt }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ flexShrink: 0 }}>
      <path d={path} />
    </svg>
  );

  return (
    <div style={{ background: bg, borderRadius: '14px', overflow: 'hidden', width: '100%', fontFamily: 'Inter, system-ui, sans-serif', color: txt, display: 'flex', flexDirection: 'column', maxHeight: '460px', overflowY: 'auto', scrollbarWidth: 'none' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderBottom: bdr, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PruhLogo size={30} showText={false} variant="white" />
          <div>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: txt, lineHeight: 1.2 }}>EK-SMS Portal</div>
            <div style={{ fontSize: '7px', color: muted }}>Parent / Guardian Access</div>
          </div>
        </div>
        <div style={{ position: 'relative', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: card, borderRadius: '50%', border: bdr }}>
          <Icon path={bellPath} size={13} color={muted} />
          <div style={{ position: 'absolute', top: '3px', right: '3px', width: '5px', height: '5px', background: '#ef4444', borderRadius: '50%' }} />
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Progress summary card */}
        <div style={{ background: card, borderRadius: '12px', border: bdr, overflow: 'hidden' }}>
          {/* Gradient banner */}
          <div style={{ background: 'linear-gradient(135deg, #0f3460 0%, #1a4a7a 50%, #0ea5e9 100%)', padding: '14px 14px 20px', position: 'relative' }}>
            <span style={{ background: primary, color: '#fff', fontSize: '7px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Academic Term 2</span>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '14px', background: `linear-gradient(to top, ${card}, transparent)` }} />
          </div>
          {/* Card body */}
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>Progress Summary</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: cyan }}>A-</div>
                <div style={{ fontSize: '6px', color: muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Avg Grade</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0', borderTop: bdr, borderBottom: bdr }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icon path={ICON_PATHS.audit} size={11} color="#4ade80" />
                <span style={{ fontSize: '7.5px', fontWeight: 500 }}>98% Attendance</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icon path={trendUp} size={11} color={cyan} />
                <span style={{ fontSize: '7.5px', fontWeight: 500 }}>Top 5% of Class</span>
              </div>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.55)', padding: '7px 10px', borderRadius: '8px', borderLeft: `3px solid ${primary}` }}>
              <div style={{ fontSize: '6px', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>Teacher Remark</div>
              <p style={{ fontSize: '7px', color: '#cbd5e1', fontStyle: 'italic', lineHeight: 1.45, margin: 0 }}>
                "Aidan is excelling in Mathematics and showing great leadership in class projects."
              </p>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div>
          <div style={{ fontSize: '6px', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Performance Metrics</div>
          <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
            {metrics.map(({ label, value, icon, color, iBg, iBdr, accent }) => (
              <div key={label} style={{ minWidth: '68px', background: card, borderRadius: '10px', border: bdr, borderTop: accent ? `2px solid ${accent}` : bdr, padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px', flexShrink: 0 }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: iBg, border: `1px solid ${iBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon path={icon} size={13} color={color} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: txt }}>{value}</div>
                <div style={{ fontSize: '5.5px', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Trend */}
        <div style={{ background: card, borderRadius: '12px', border: bdr, padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '9px', fontWeight: 700 }}>Performance Trend</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '6px', fontWeight: 700, color: primary, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '999px', padding: '2px 8px' }}>
              DETAILS <Icon path={ICON_PATHS.arrowRight} size={8} color={primary} />
            </div>
          </div>
          <div style={{ height: '58px', display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '6px' }}>
            {bars.map(({ month, cls, ind, hi }) => (
              <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                <div style={{ width: '100%', flex: 1, background: bg, borderRadius: '3px 3px 0 0', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(59,130,246,0.2)', borderRadius: '3px 3px 0 0', height: `${cls}%` }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: hi ? cyan : 'rgba(6,182,212,0.4)', borderRadius: '3px 3px 0 0', height: `${ind}%`, boxShadow: hi ? '0 0 8px rgba(6,182,212,0.4)' : 'none' }} />
                </div>
                <span style={{ fontSize: '5.5px', fontWeight: 700, color: hi ? cyan : muted, marginTop: '3px' }}>{month}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', paddingTop: '6px', borderTop: bdr }}>
            {[{ dot: cyan, label: 'Individual' }, { dot: 'rgba(59,130,246,0.4)', label: 'Class Avg' }].map(({ dot, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dot }} />
                <span style={{ fontSize: '5.5px', color: muted, fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div style={{ fontSize: '6px', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {[
              { label: 'Message Teacher', path: headsetPath, color: primary, bg: 'rgba(59,130,246,0.1)', bdr: 'rgba(59,130,246,0.2)' },
              { label: 'Pay Fees',        path: receiptPath, color: '#4ade80', bg: 'rgba(74,222,128,0.1)', bdr: 'rgba(74,222,128,0.2)' },
            ].map(({ label, path, color, bg: aBg, bdr: aBdr }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 10px', background: card, borderRadius: '10px', border: bdr }}>
                <div style={{ width: '26px', height: '26px', background: aBg, borderRadius: '7px', border: `1px solid ${aBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon path={path} size={14} color={color} />
                </div>
                <span style={{ fontSize: '7.5px', fontWeight: 700, color: txt }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Bottom nav ── */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 12px 10px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: bdr, marginTop: 'auto' }}>
        {[
          { label: 'Home',     path: homePath,          color: primary },
          { label: 'Academic', path: ICON_PATHS.school,  color: muted   },
          { label: 'Finance',  path: walletPath,         color: muted   },
          { label: 'Profile',  path: ICON_PATHS.people,  color: muted   },
        ].map(({ label, path, color }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <Icon path={path} size={16} color={color} />
            <span style={{ fontSize: '6px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
          </div>
        ))}
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
  const { t } = useLang();
  const role = ROLES_DATA.find((r) => r.key === active);

  return (
    <section className="lp-section" id="roles">
      <div className="lp-container">

        <div className="lp-section-header">
          <div className="lp-badge lp-badge--primary">{t('roles_badge')}</div>
          <h2 className="lp-section-title">{t('roles_title')}</h2>
          <p className="lp-section-sub">{t('roles_sub')}</p>
        </div>

        <div className="lp-roles-tabs">
          {ROLES_DATA.map(({ key, color }) => (
            <button
              key={key}
              className={`lp-roles-tab${active === key ? ' lp-roles-tab--active' : ''}`}
              style={active === key ? { borderColor: color, color } : {}}
              onClick={() => setActive(key)}
            >
              {t(`role_${key}`)}
            </button>
          ))}
        </div>

        <div className="lp-roles-card" style={{ '--role-color': role.color }}>
          {/* Left panel — re-keyed so perks stagger in on every switch */}
          <div key={`left-${active}`} className="lp-roles-card__left lp-roles-anim">
            <div className="lp-roles-card__icon-wrap" style={{ color: role.color, background: `${role.color}18` }}>
              <SvgIcon name={role.icon} size={32} />
            </div>
            <h3 className="lp-roles-card__title">{t(`role_${active}`)}</h3>
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
          <div className="lp-roles-card__right lp-roles-card__right--float">
            <div key={active} className="lp-roles-right-anim" style={{ width: '100%' }}>
              {active === 'superadmin' ? (
                <SuperAdminDashboardMockup />
              ) : active === 'schooladmin' ? (
                <SchoolAdminDashboardMockup />
              ) : active === 'teacher' ? (
                <TeacherDashboardMockup />
              ) : active === 'parent' ? (
                <ParentDashboardMockup />
              ) : null}
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
  const { t } = useLang();
  return (
    <section className="lp-section lp-section--dark" id="security">
      <div className="lp-container lp-security__inner">
        <div className="lp-security__text">
          <div className="lp-badge lp-badge--red">
            <SvgIcon name="verified" size={14} />
            {t('sec_badge')}
          </div>
          <h2 className="lp-section-title lp-security__title">
            {t('sec_title_a')}<br />
            <span className="lp-gradient-text">{t('sec_title_b')}</span>
          </h2>
          <p className="lp-section-sub">
            {t('sec_sub')}
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
  const [ref, visible] = useScrollReveal(0.08);
  const { t } = useLang();
  return (
    <section ref={ref} className={`lp-section lp-section--alt lp-reveal${visible ? ' lp-reveal--visible' : ''}`} id="workflow">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge lp-badge--primary">{t('workflow_badge')}</div>
          <h2 className="lp-section-title">{t('workflow_title')}</h2>
          <p className="lp-section-sub">{t('workflow_sub')}</p>
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
// COMPARISON TABLE SECTION
// ============================================================
const COMPARE_ROWS = [
  {
    feature: 'Grade Integrity & Anti-tampering',
    eksms:  { label: 'SHA-256 + Merkle audit chain', status: 'full'    },
    excel:  { label: 'None',                          status: 'none'    },
    basic:  { label: 'Basic password lock',           status: 'partial' },
  },
  {
    feature: 'Attendance + Parent SMS Alerts',
    eksms:  { label: 'Real-time auto-SMS to guardians', status: 'full'    },
    excel:  { label: 'Manual register',                 status: 'none'    },
    basic:  { label: 'Digital only, no SMS',            status: 'partial' },
  },
  {
    feature: 'Parent Communication',
    eksms:  { label: 'SMS + App + Parent Portal',   status: 'full'    },
    excel:  { label: 'Phone calls only',             status: 'none'    },
    basic:  { label: 'Email only',                   status: 'partial' },
  },
  {
    feature: 'Fee Management & Invoicing',
    eksms:  { label: 'Auto-invoicing + reminders',  status: 'full'    },
    excel:  { label: 'Manual tallying',              status: 'none'    },
    basic:  { label: 'Invoice templates only',       status: 'partial' },
  },
  {
    feature: 'Report Card Generation',
    eksms:  { label: 'One-click PDF + QR verify',   status: 'full'    },
    excel:  { label: 'Manual typing & printing',     status: 'none'    },
    basic:  { label: 'Basic templates',              status: 'partial' },
  },
  {
    feature: 'Multi-campus Support',
    eksms:  { label: 'Unified multi-branch dashboard', status: 'full'    },
    excel:  { label: 'Separate file per campus',        status: 'none'    },
    basic:  { label: 'Limited or paid add-on',          status: 'partial' },
  },
  {
    feature: 'Immutable Audit Trails',
    eksms:  { label: 'Every action logged & signed', status: 'full'    },
    excel:  { label: 'None',                          status: 'none'    },
    basic:  { label: 'Basic activity log',            status: 'partial' },
  },
  {
    feature: 'Setup & Onboarding Time',
    eksms:  { label: '< 30 min guided wizard',        status: 'full'    },
    excel:  { label: 'Ongoing manual effort',          status: 'none'    },
    basic:  { label: 'Days to weeks',                  status: 'partial' },
  },
  {
    feature: 'Data Security',
    eksms:  { label: 'AES-256 + MFA + CSP headers', status: 'full'    },
    excel:  { label: 'File password at best',         status: 'none'    },
    basic:  { label: 'Basic password auth',           status: 'partial' },
  },
  {
    feature: 'Built for African Schools',
    eksms:  { label: 'SL, LR & West Africa ready',  status: 'full'    },
    excel:  { label: 'Generic, not localised',        status: 'none'    },
    basic:  { label: 'Generic global tool',           status: 'partial' },
  },
];

const STATUS_CONFIG = {
  full:    { color: '#34D399', bg: 'rgba(52,211,153,0.12)',  icon: 'M5 13l4 4L19 7' },
  partial: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  icon: 'M20 12H4'        },
  none:    { color: '#F87171', bg: 'rgba(248,113,113,0.12)', icon: 'M6 18L18 6M6 6l12 12' },
};

function StatusCell({ status, label }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="lp-compare__cell" style={{ background: cfg.bg }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d={cfg.icon} />
      </svg>
      <span style={{ color: status === 'full' ? '#e2e8f0' : '#94a3b8', fontSize: '0.82rem' }}>{label}</span>
    </div>
  );
}

function ComparisonSection() {
  const [ref, visible] = useScrollReveal(0.06);
  const { t } = useLang();
  return (
    <section ref={ref} className={`lp-section lp-reveal${visible ? ' lp-reveal--visible' : ''}`} id="compare">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge lp-badge--primary">{t('compare_badge')}</div>
          <h2 className="lp-section-title">{t('compare_title')}</h2>
          <p className="lp-section-sub">{t('compare_sub')}</p>
        </div>

        <div className="lp-compare">
          {/* Column headers */}
          <div className="lp-compare__head">
            <div className="lp-compare__head-feature">Feature</div>
            <div className="lp-compare__head-col lp-compare__head-col--eksms">
              <div className="lp-compare__head-badge">
                <SvgIcon name="verified" size={14} />
                EK-SMS
              </div>
            </div>
            <div className="lp-compare__head-col">Excel / Manual</div>
            <div className="lp-compare__head-col">Basic Software</div>
          </div>

          {/* Data rows */}
          {COMPARE_ROWS.map(({ feature, eksms, excel, basic }, i) => (
            <div key={feature} className={`lp-compare__row${i % 2 === 0 ? ' lp-compare__row--alt' : ''}`}>
              <div className="lp-compare__feature">
                <span className="lp-compare__feature-dot" />
                {feature}
              </div>
              <div className="lp-compare__col lp-compare__col--eksms">
                <StatusCell status={eksms.status} label={eksms.label} />
              </div>
              <div className="lp-compare__col">
                <StatusCell status={excel.status} label={excel.label} />
              </div>
              <div className="lp-compare__col">
                <StatusCell status={basic.status} label={basic.label} />
              </div>
            </div>
          ))}

          {/* Footer summary */}
          <div className="lp-compare__footer">
            <div className="lp-compare__legend">
              {[['full','All features included'],['partial','Partial / limited'],['none','Not available']].map(([s, t]) => (
                <span key={s} className="lp-compare__legend-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={STATUS_CONFIG[s].color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={STATUS_CONFIG[s].icon} />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
            <div className="lp-compare__footer-note">
              EK-SMS scores <strong style={{ color: '#34D399' }}>10/10</strong> across every critical school management need.
            </div>
          </div>
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
  { q: 'How secure is student data?',              a: 'All student data is protected with AES-256 encryption, role-based access control, and TLS 1.3 in transit. Only authorised users can access records, and every action is logged in an immutable audit trail with cryptographic signing.' },
  { q: 'Can we migrate from Excel?',               a: 'Yes — EK-SMS accepts Excel (.xlsx) and CSV uploads for students, teachers, grades, timetables, and fee records. Our import wizard validates data before committing, and our onboarding team guides you through every step.' },
  { q: 'Can parents access results online?',       a: 'Yes. Parents receive a secure login to the EK-SMS Parent Portal where they can view their child\'s grades, attendance records, report cards, and outstanding fees from any browser or the mobile app — anytime, anywhere.' },
  { q: 'Is it mobile friendly?',                   a: 'Absolutely. The EK-SMS web dashboard is fully responsive on phones, tablets, and desktops. Dedicated iOS and Android apps are also available for parents, teachers, and administrators on the go.' },
];

function FAQSection() {
  const [open, setOpen] = useState(0);
  const [faqRef, faqVisible] = useScrollReveal(0.06);
  const { t } = useLang();
  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <section ref={faqRef} className={`lp-section lp-section--alt lp-reveal${faqVisible ? ' lp-reveal--visible' : ''}`} id="faq">
      <div className="lp-container lp-faq__inner">
        <div className="lp-faq__header">
          <div className="lp-badge lp-badge--primary">{t('faq_badge')}</div>
          <h2 className="lp-section-title">{t('faq_title')}</h2>
          <p className="lp-section-sub">{t('faq_sub')}</p>
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
          <h3 className="lp-faq__cta-title">{t('faq_cta_title')}</h3>
          <p className="lp-faq__cta-sub">{t('faq_cta_sub')}</p>
          <button className="lp-btn lp-btn--cta-primary lp-btn--lg" onClick={scrollToContact}>
            <SvgIcon name="send" size={16} />
            {t('faq_cta_btn')}
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// ABOUT SECTION
// ============================================================
function AboutSection() {
  const [ref, visible] = useScrollReveal(0.08);
  const { t } = useLang();
  return (
    <section ref={ref} className={`lp-section lp-reveal${visible ? ' lp-reveal--visible' : ''}`} id="about">
      <div className="lp-container">
        <div className="lp-section-header">
          <h2 className="lp-section-title"><span className="lp-gradient-text">{t('about_title')}</span></h2>
          <p className="lp-section-sub">{t('about_sub')}</p>
        </div>
        <div className="lp-about__cards">
          <div className="lp-about__card">
            <div className="lp-about__card-icon"><SvgIcon name="rocket" size={24} /></div>
            <h3 className="lp-about__card-title">{t('about_mission')}</h3>
            <p className="lp-about__card-desc">To revolutionize school management across Africa through accessible, cloud-based technology that simplifies administration and enhances learning outcomes for every institution.</p>
          </div>
          <div className="lp-about__card">
            <div className="lp-about__card-icon"><SvgIcon name="analytics" size={24} /></div>
            <h3 className="lp-about__card-title">{t('about_vision')}</h3>
            <p className="lp-about__card-desc">Building a future where every African institution, regardless of location or resources, thrives with digital efficiency, data-driven insights, and tamper-proof academic integrity.</p>
          </div>
        </div>
        <div className="lp-about__pillars">
          {[
            { icon: 'rocket',   title: t('about_pillar_innov'), desc: 'Cutting-edge features tailored for modern African educational needs.' },
            { icon: 'verified', title: t('about_pillar_integ'), desc: 'Transparent data handling, immutable audit logs, and secure systems.' },
            { icon: 'people',   title: t('about_pillar_imp'),   desc: 'Real change in educational communities across the African continent.' },
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
  { icon: 'mail',     label: 'Email Support',  value: 'admin@elkendeh.com',                  color: '#0dccf2' },
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
  const { t } = useLang();

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[EK-SMS] ${form.subject} — from ${form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nSubject: ${form.subject}\n\n${form.message}`
    );
    window.open(`mailto:admin@elkendeh.com?subject=${subject}&body=${body}`);
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
            {t('contact_badge')}
          </div>
          <h2 className="lp-section-title">{t('contact_title')}</h2>
          <p className="lp-section-sub">{t('contact_sub')}</p>
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
              <h3 className="lp-contact__form-title">{t('contact_form_title')}</h3>
            </div>
            <form className="lp-contact__form" onSubmit={handleSubmit}>
              <div className="lp-contact__field">
                <label className="lp-contact__label">{t('contact_name')}</label>
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
                <label className="lp-contact__label">{t('contact_email')}</label>
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
                <label className="lp-contact__label">{t('contact_subject')}</label>
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
                <label className="lp-contact__label">{t('contact_message')}</label>
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
                  ? <><SvgIcon name="check" size={16} /> {t('contact_sent')}</>
                  : <><SvgIcon name="send" size={16} /> {t('contact_send')}</>
                }
              </button>
            </form>
          </div>

          <div className="lp-contact__support">
            <h3 className="lp-contact__support-title">{t('contact_support_title')}</h3>
            <p className="lp-contact__support-sub">{t('contact_support_sub')}</p>
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
  const { t } = useLang();
  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <section className="lp-cta-banner">
      {/* Hyperspeed road animation background */}
      <div className="lp-cta__hyperspeed">
      <Hyperspeed effectOptions={{
        distortion: 'turbulentDistortion',
        length: 400,
        roadWidth: 10,
        islandWidth: 2,
        lanesPerRoad: 3,
        fov: 90,
        fovSpeedUp: 150,
        speedUp: 2,
        carLightsFade: 0.4,
        totalSideLightSticks: 20,
        lightPairsPerRoadWay: 40,
        shoulderLinesWidthPercentage: 0.05,
        brokenLinesWidthPercentage: 0.1,
        brokenLinesLengthPercentage: 0.5,
        lightStickWidth: [0.12, 0.5],
        lightStickHeight: [1.3, 1.7],
        movingAwaySpeed: [60, 80],
        movingCloserSpeed: [-120, -160],
        carLightsLength: [12, 80],
        carLightsRadius: [0.05, 0.14],
        carWidthPercentage: [0.3, 0.5],
        carShiftX: [-0.8, 0.8],
        carFloorSeparation: [0, 5],
        colors: {
          roadColor: 0x080808,
          islandColor: 0x0a0a0a,
          background: 0x000000,
          shoulderLines: 0x131318,
          brokenLines: 0x131318,
          leftCars:  [0x0dccf2, 0x22D3A3, 0xA78BFA],
          rightCars: [0x03b3c3, 0x0e5ea5, 0x1B3FAF],
          sticks: 0x0dccf2,
        },
      }} />
      </div>
      <div className="lp-cta-banner__glow" aria-hidden="true" />
      <div className="lp-container lp-cta-banner__inner">
        <h2 className="lp-cta-banner__title">{t('cta_title')}</h2>
        <p className="lp-cta-banner__sub">{t('cta_sub')}</p>
        <div className="lp-cta-banner__actions">
          <button className="lp-btn lp-btn--white lp-btn--lg" onClick={() => onNavigate('register')}>{t('cta_primary')}</button>
          <button className="lp-btn lp-btn--ghost-white lp-btn--lg" onClick={scrollToContact}>
            {t('cta_secondary')} <SvgIcon name="arrowRight" size={16} />
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
  const { t } = useLang();
  const scrollTo = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <WaitlistCapture />
        <div className="lp-footer__grid">
          <div className="lp-footer__brand">
            <div className="lp-footer__brand-row">
              <PruhLogo size={36} showText={true} variant="white" textColor="rgba(255,255,255,0.92)" />
            </div>
            <p className="lp-footer__brand-product">2026 EL-KENDEH School Management System (EK-SMS)</p>
            <p className="lp-footer__brand-tagline">{t('footer_tagline')}</p>
            <div className="lp-footer__socials">
              {['facebook', 'twitter', 'linkedin'].map((s) => (
                <button key={s} className="lp-footer__social" aria-label={s}><SvgIcon name={s} size={16} /></button>
              ))}
            </div>
          </div>

          <div className="lp-footer__col">
            <h4 className="lp-footer__col-title">{t('footer_product')}</h4>
            <ul className="lp-footer__links">
              {[['Features','features'],['Security','security'],['Workflow','workflow']].map(([l,id]) => (
                <li key={l}><button className="lp-footer__link" onClick={() => scrollTo(id)}>{l}</button></li>
              ))}
            </ul>
          </div>

          <div className="lp-footer__col">
            <h4 className="lp-footer__col-title">{t('footer_resources')}</h4>
            <ul className="lp-footer__links">
              {['Blog', 'Case Studies', 'Documentation', 'API Reference', 'Support Center'].map((l) => (
                <li key={l}><span className="lp-footer__link">{l}</span></li>
              ))}
            </ul>
          </div>

          <div className="lp-footer__col">
            <h4 className="lp-footer__col-title">{t('footer_company')}</h4>
            <ul className="lp-footer__links">
              {[['About Us','about'],['Team','team'],['FAQ','faq'],['Contact','contact']].map(([l,id]) => (
                <li key={l}><button className="lp-footer__link" onClick={() => scrollTo(id)}>{l}</button></li>
              ))}
              {['Careers','Partners'].map((l) => <li key={l}><span className="lp-footer__link">{l}</span></li>)}
            </ul>
          </div>
        </div>

        <div className="lp-footer__bottom">
          <p className="lp-footer__copy">{t('footer_copy')}</p>
          <div className="lp-footer__legal">
            {[t('footer_privacy'), t('footer_terms'), t('footer_cookies')].map((l) => (
              <span key={l} className="lp-footer__legal-link">{l}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================
// LIVE CHAT WIDGET — Tawk.to-style UI
// ============================================================
const AUTO_REPLY = "Thanks for reaching out! 😊 Our team will get back to you shortly. For urgent matters email admin@elkendeh.com";

function ChatWidget() {
  const { t } = useLang();
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, from: 'agent', text: "Hi there! 👋 Welcome to EK-SMS Support. How can we help you today?", time: 'Just now' },
  ]);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, typing, open]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(p => [...p, { id: Date.now(), from: 'user', text, time: now }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(p => [...p, { id: Date.now() + 1, from: 'agent', text: AUTO_REPLY, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }, 1600);
  };

  return (
    <>
      {/* ── Chat panel ── */}
      {open && (
        <div className="lp-chat__panel" role="dialog" aria-label="Support chat">

          {/* Header */}
          <div className="lp-chat__header">
            <div className="lp-chat__header-left">
              <div className="lp-chat__header-avatar">
                <PruhLogo size={30} variant="white" />
              </div>
              <div>
                <p className="lp-chat__header-name">EK-SMS Support</p>
                <p className="lp-chat__header-status">
                  <span className="lp-chat__status-dot" />
                  Online · replies immediately
                </p>
              </div>
            </div>
            <button className="lp-chat__header-close" onClick={() => setOpen(false)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="lp-chat__body" ref={bodyRef}>
            {messages.map(msg => (
              <div key={msg.id} className={`lp-chat__row lp-chat__row--${msg.from}`}>
                {msg.from === 'agent' && (
                  <div className="lp-chat__agent-avatar">
                    <PruhLogo size={22} variant="white" />
                  </div>
                )}
                <div className="lp-chat__bubble-wrap">
                  <div className={`lp-chat__bubble lp-chat__bubble--${msg.from}`}>
                    {msg.text}
                  </div>
                  <span className="lp-chat__time">{msg.time}</span>
                </div>
              </div>
            ))}
            {typing && (
              <div className="lp-chat__row lp-chat__row--agent">
                <div className="lp-chat__agent-avatar">
                  <PruhLogo size={22} variant="white" />
                </div>
                <div className="lp-chat__typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="lp-chat__footer">
            <input
              className="lp-chat__input"
              type="text"
              placeholder="Type a message…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              maxLength={500}
            />
            <button
              className="lp-chat__send"
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── FAB ── */}
      <button
        className={`lp-chat__fab${open ? ' lp-chat__fab--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close chat' : 'Open support chat'}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
        )}
        {!open && <span className="lp-chat__fab-dot" />}
      </button>
    </>
  );
}

// ============================================================
// TESTIMONIALS SECTION
// ============================================================
const TESTIMONIALS = [
  {
    name: 'Ibrahim Sesay',
    role: 'Principal',
    school: 'Albert Academy, Freetown',
    initials: 'IS',
    color: '#0dccf2',
    quote: 'EK-SMS transformed how we manage student records and fees. What used to take days now takes minutes. Our teachers spend more time teaching and less time on paperwork.',
    stars: 5,
  },
  {
    name: 'Aminata Koroma',
    role: 'School Administrator',
    school: 'Greenwood Academy, Bo',
    initials: 'AK',
    color: '#22D3A3',
    quote: 'The attendance tracking and parent SMS notifications are a game-changer. Parents get real-time updates about their children, and our attendance improved noticeably within weeks.',
    stars: 5,
  },
  {
    name: 'Mohamed Jalloh',
    role: 'Head of Academics',
    school: "Methodist Boys' HS, Freetown",
    initials: 'MJ',
    color: '#A78BFA',
    quote: 'The grade audit trail gives us full accountability. We finally have confidence that results are transparent and tamper-proof — something our school community has been asking for.',
    stars: 5,
  },
];

function TestimonialsSection() {
  const { t } = useLang();

  return (
    <section className="lp-section lp-section--alt" id="testimonials">
      <div className="lp-container">
        <div className="lp-section-header">
          <div className="lp-badge lp-badge--primary">{t('test_badge')}</div>
          <h2 className="lp-section-title">{t('test_title')}</h2>
          <p className="lp-section-sub">{t('test_sub')}</p>
        </div>

        <div className="lp-testimonials-grid">
          {TESTIMONIALS.map(({ name, role, school, initials, color, quote, stars }) => (
            <div key={name} className="lp-testimonial-card" style={{ '--card-accent': color }}>
              <div className="lp-testimonial-stars">
                {Array.from({ length: stars }, (_, i) => (
                  <SvgIcon key={i} name="star" size={14} style={{ color: '#FBBF24' }} />
                ))}
              </div>
              <blockquote className="lp-testimonial-quote">"{quote}"</blockquote>
              <div className="lp-testimonial-author">
                <div className="lp-testimonial-avatar" style={{ background: `${color}20`, color }}>
                  {initials}
                </div>
                <div className="lp-testimonial-author-info">
                  <div className="lp-testimonial-name">{name}</div>
                  <div className="lp-testimonial-meta">{role} · {school}</div>
                </div>
                <span className="lp-testimonial-tag">Beta</span>
              </div>
            </div>
          ))}
        </div>

        <div className="lp-testimonials-cta">
          <p className="lp-testimonials-cta__title">{t('test_be_first')}</p>
          <p className="lp-testimonials-cta__sub">{t('test_be_first_sub')}</p>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SCROLL UI — progress bar + back-to-top
// ============================================================
function ScrollUI() {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop]   = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop  = window.scrollY;
      const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
      setShowTop(scrollTop > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="lp-scroll-progress" style={{ width: `${progress}%` }} aria-hidden="true" />
      {showTop && (
        <button
          className="lp-back-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/>
          </svg>
        </button>
      )}
    </>
  );
}

// ============================================================
// WAITLIST EMAIL CAPTURE (footer)
// ============================================================
function WaitlistCapture() {
  const [email,  setEmail]  = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [msg,    setMsg]    = useState('');
  const { t } = useLang();

  const submit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res  = await fetch('/api/waitlist/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      setStatus(data.success ? 'success' : 'error');
      setMsg(data.message);
    } catch {
      setStatus('error');
      setMsg('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="lp-waitlist">
      <p className="lp-waitlist__title">{t('waitlist_title')}</p>
      <p className="lp-waitlist__sub">{t('waitlist_sub')}</p>
      {status === 'success' ? (
        <div className="lp-waitlist__success">
          <SvgIcon name="check" size={15} />
          {msg}
        </div>
      ) : (
        <form className="lp-waitlist__form" onSubmit={submit}>
          <input
            className="lp-waitlist__input"
            type="email"
            placeholder={t('waitlist_placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="lp-waitlist__btn" disabled={status === 'loading'}>
            {status === 'loading' ? '…' : t('waitlist_btn')}
          </button>
        </form>
      )}
      {status === 'error' && <p className="lp-waitlist__error">{msg}</p>}
    </div>
  );
}

// ============================================================
// COUNTDOWN URGENCY STRIP (below navbar)
// ============================================================
const LAUNCH_DATE  = new Date('2026-04-30T23:59:59');
const SPOTS_LEFT   = 12;

function CountdownStrip() {
  const [timeLeft,  setTimeLeft]  = useState(null);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('ek_countdown_dismissed') === '1'
  );

  useEffect(() => {
    if (dismissed) return;
    const tick = () => {
      const diff = LAUNCH_DATE - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000)  / 60000),
        s: Math.floor((diff % 60000)    / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dismissed]);

  if (dismissed || !timeLeft) return null;

  const dismiss = () => {
    sessionStorage.setItem('ek_countdown_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="lp-countdown" role="banner">
      <div className="lp-countdown__inner">
        <span className="lp-countdown__pill">Early Access</span>
        <span className="lp-countdown__text">
          First <strong>50 schools</strong> get 3 months free —
          <strong className="lp-countdown__spots"> {SPOTS_LEFT} spots left</strong>
        </span>
        <div className="lp-countdown__timer" aria-label="Time remaining">
          {[['d','days'],['h','hrs'],['m','min'],['s','sec']].map(([k, label]) => (
            <span key={k} className="lp-countdown__unit">
              <span className="lp-countdown__num">{String(timeLeft[k]).padStart(2,'0')}</span>
              <span className="lp-countdown__label">{label}</span>
            </span>
          ))}
        </div>
      </div>
      <button className="lp-countdown__close" onClick={dismiss} aria-label="Dismiss banner">
        <SvgIcon name="close" size={14} />
      </button>
    </div>
  );
}

// ============================================================
// TRUST BADGES STRIP (between hero and stats)
// ============================================================
const TRUST_BADGES = [
  { icon: 'lock',     label: 'SSL Encrypted',                color: '#0dccf2' },
  { icon: 'verified', label: 'GDPR Ready',                   color: '#22D3A3' },
  { icon: 'audit',    label: '99.9% Uptime Target',          color: '#A78BFA' },
  { icon: 'school',   label: 'African Data Laws Compliant',  color: '#FB923C' },
];

function TrustBadgesStrip() {
  return (
    <div className="lp-trust-strip" aria-label="Trust and compliance signals">
      <div className="lp-container lp-trust-strip__inner">
        {TRUST_BADGES.map(({ icon, label, color }) => (
          <div key={label} className="lp-trust-badge" style={{ '--badge-color': color }}>
            <div className="lp-trust-badge__icon">
              <SvgIcon name={icon} size={16} />
            </div>
            <span className="lp-trust-badge__label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// COOKIE CONSENT BANNER
// ============================================================
const COOKIE_KEY = 'ek_cookie_consent';

function CookieConsent() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    /* Delay slightly so it doesn't compete with page load animation */
    const timer = setTimeout(() => {
      if (!localStorage.getItem(COOKIE_KEY)) setVisible(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="lp-cookie" role="dialog" aria-label="Cookie consent" aria-live="polite">
      {/* Shield icon */}
      <div className="lp-cookie__icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l6 2.67V11c0 3.72-2.56 7.18-6 8.19C8.56 18.18 6 14.72 6 11V7.67L12 5z"/>
        </svg>
      </div>

      <div className="lp-cookie__body">
        <p className="lp-cookie__title">{t('cookie_title')}</p>
        <p className="lp-cookie__desc">{t('cookie_desc')}</p>
      </div>

      <div className="lp-cookie__actions">
        <button className="lp-cookie__btn lp-cookie__btn--accept" onClick={accept}>
          {t('cookie_accept')}
        </button>
        <button className="lp-cookie__btn lp-cookie__btn--decline" onClick={decline}>
          {t('cookie_decline')}
        </button>
      </div>
    </div>
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
    <LanguageProvider>
      <ClickSpark
        sparkColor="#0dccf2"
        sparkSize={12}
        sparkRadius={22}
        sparkCount={10}
        duration={500}
        easing="ease-out"
        extraScale={1.2}
      >
        <div className="lp">
          <Navbar onNavigate={onNavigate} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
          <main>
            <HeroSection onNavigate={onNavigate} />
            <TrustBadgesStrip />
            <StatsSection />
            <FeaturesSection />
            <RolesSection />
            <SecuritySection />
            <WorkflowSection />
            <TestimonialsSection />
            <ComparisonSection />
            <FAQSection />
            <AboutSection />
            <ContactSection />
            <CTABanner onNavigate={onNavigate} />
          </main>
          <Footer onNavigate={onNavigate} />
          <ChatWidget />
          <CursorGlow />
          <InstallPrompt />
          <ScrollUI />
          <CookieConsent />
        </div>
      </ClickSpark>
    </LanguageProvider>
  );
}
