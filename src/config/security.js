/**
 * Security configuration constants
 */

const DEFAULT_API_URL = 'https://backend.pruhsms.africa';
const getApiUrl = () => {
  const rawUrl = process.env.REACT_APP_API_URL || DEFAULT_API_URL;
  try {
    return new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : DEFAULT_API_URL).toString().replace(/\/$/, '');
  } catch (error) {
    return DEFAULT_API_URL;
  }
};

const API_URL = getApiUrl();
const API_ORIGIN = (() => {
  try {
    return new URL(API_URL).origin;
  } catch (error) {
    return DEFAULT_API_URL;
  }
})();

export const SECURITY_CONFIG = {
  // API Configuration
  API_URL,

  // Security Headers (request headers only - response headers are set by server)
  SECURE_HEADERS: {
    // All security headers should be set by the server in responses, NOT sent by client in requests
    // Removing X-Content-Type-Options, X-XSS-Protection, X-Frame-Options, Referrer-Policy
    // Only include headers that are legitimate for requests
  },

  // CORS Configuration
  CORS: {
    credentials: 'include',
    routes: {
      login: '/api/login/',
      logout: '/api/logout/',
      csrf: '/api/csrf-token/',
    },
  },

  // Session Configuration
  SESSION: {
    timeout: 3600000, // 1 hour in milliseconds
    warningTime: 60000, // 1 minute before timeout
  },

  // Password Requirements
  PASSWORD: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },

  // Rate Limiting
  RATE_LIMIT: {
    loginAttempts: 5,
    loginWindow: 900000, // 15 minutes
    apiRequestsPerMinute: 60,
  },

  // Input Validation
  VALIDATION: {
    maxEmailLength: 254,
    maxPasswordLength: 128,
    maxInputLength: 500,
    allowedFileTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    maxFileSize: 5242880, // 5MB
  },

  // Content Security Policy
  CSP: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:', 'https://embed.tawk.to', 'https://*.tawk.to', 'https://vercel.live', 'chrome-extension:'],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", "https://fonts.gstatic.com", "https://*.tawk.to", "https://vercel.live"],
    'connect-src': ["'self'", API_ORIGIN, 'https://backend.pruhsms.africa', 'https://pruhsms.africa','https://*.vercel.app','wss://*.pusher.com', 'wss://ws-us3.pusher.com', 'https://*.pusher.com', 'blob:', 'https://api.bigdatacloud.net', 'https://ipapi.co'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  },

  // Feature Policy / Permissions Policy
  FEATURE_POLICY: {
    'camera': "'none'",
    'microphone': "'none'",
    'geolocation': "'none'",
    'payment': "'none'",
    'usb': "'none'",
  },

  // Security Headers for Production
  PRODUCTION_HEADERS: {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://embed.tawk.to https://*.tawk.to https://vercel.live chrome-extension:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com https://*.tawk.to https://vercel.live; connect-src 'self' ${API_ORIGIN} https://backend.pruhsms.africa https://pruhsms.africa https://*.vercel.app blob: wss://*.pusher.com wss://ws-us3.pusher.com https://*.pusher.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
};

export default SECURITY_CONFIG;
