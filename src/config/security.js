/**
 * Security configuration constants
 */

export const SECURITY_CONFIG = {
  // API Configuration
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',

  // Security Headers
  SECURE_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
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
    'script-src': ["'self'", "'unsafe-inline'"], // Consider removing unsafe-inline
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", 'https://ek-sms-backend.onrender.com', 'http://localhost:8000'],
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
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://ek-sms-backend.onrender.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
};

export default SECURITY_CONFIG;
