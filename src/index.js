import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { register as registerSW } from './serviceWorkerRegistration';
import initializeSecurityFeatures from './security/init';
import { mockFetch, setRole } from './mock/mockHandlers';

// ── MOCK MODE: override all fetch calls with static mock data ──
(() => {
  const MOCK_MODE = true;
  if (MOCK_MODE) {
    const role = localStorage.getItem('mock_role') || 'school_admin';
    setRole(role);
    window.fetch = mockFetch;
  }
})();

initializeSecurityFeatures();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();

// Register service worker for PWA / offline support
registerSW();
