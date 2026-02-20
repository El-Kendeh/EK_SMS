/**
 * Content Security Policy (CSP) Helper
 * Generates and validates CSP headers
 */

import SECURITY_CONFIG from '../config/security';

export const generateCSPHeader = () => {
  const csp = SECURITY_CONFIG.CSP;
  const parts = [];

  for (const [directive, values] of Object.entries(csp)) {
    const valueString = Array.isArray(values) ? values.join(' ') : values;
    parts.push(`${directive} ${valueString}`);
  }

  return parts.join('; ');
};

/**
 * Apply CSP meta tag to document
 */
export const applyCSPMetaTag = () => {
  if (typeof document === 'undefined') return;

  const metaTag = document.createElement('meta');
  metaTag.httpEquiv = 'Content-Security-Policy';
  metaTag.content = generateCSPHeader();
  document.head.appendChild(metaTag);
};

/**
 * Get CSP reporting endpoint
 */
export const getCSPReportingEndpoint = () => {
  return `${SECURITY_CONFIG.API_URL}/api/csp-report/`;
};

/**
 * Handle CSP violations
 */
export const handleCSPViolation = (event) => {
  const { violatedDirective, blockedURI, originalPolicy } = event;
  
  console.error('CSP Violation:', {
    violatedDirective,
    blockedURI,
    originalPolicy,
  });

  // Report to backend in production
  if (process.env.NODE_ENV === 'production') {
    try {
      fetch(getCSPReportingEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          violatedDirective,
          blockedURI,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to report CSP violation:', error);
    }
  }
};

/**
 * Add event listeners for security events
 */
export const initializeSecurityListeners = () => {
  // CSP violation listener
  document.addEventListener('securitypolicyviolation', handleCSPViolation);

  // Unhandled rejection listener
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });

  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });

  return () => {
    document.removeEventListener('securitypolicyviolation', handleCSPViolation);
    window.removeEventListener('unhandledrejection', null);
    window.removeEventListener('error', null);
  };
};

const CSP_UTILS = {
  generateCSPHeader,
  applyCSPMetaTag,
  getCSPReportingEndpoint,
  handleCSPViolation,
  initializeSecurityListeners,
};

export default CSP_UTILS;
