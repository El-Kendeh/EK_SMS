/**
 * Initialize security settings
 * Run this in your main App.js or index.js
 */

import { initializeSecurityListeners } from './utils/csp';
import { SessionTimeout, SecurityLogger } from './utils/securityMonitoring';
import SECURITY_CONFIG from './config/security';

/**
 * Initialize all security features
 */
export const initializeSecurityFeatures = () => {
  // Initialize CSP listeners
  initializeSecurityListeners();

  // Initialize session timeout
  const sessionTimeout = new SessionTimeout(
    SECURITY_CONFIG.SESSION.timeout,
    SECURITY_CONFIG.SESSION.warningTime
  );

  sessionTimeout.onWarning = () => {
    SecurityLogger.info('Session timeout warning');
    // Show user notification
    console.warn('Your session will expire soon');
  };

  sessionTimeout.onTimeout = () => {
    SecurityLogger.info('Session expired');
    // Redirect to login
    window.location.href = '/login';
  };

  // Start session timeout on app load
  sessionTimeout.start();

  // Reset session on user activity
  ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, () => {
      sessionTimeout.reset();
    });
  });

  SecurityLogger.info('Security features initialized');

  return () => {
    sessionTimeout.clear();
  };
};

export default initializeSecurityFeatures;
