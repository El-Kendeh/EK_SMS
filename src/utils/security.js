/**
 * Security utility functions
 * Provides sanitization, validation, and secure API handling
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export const sanitizeHtml = (html) => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

/**
 * Sanitize user input
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return input.replace(/[&<>"']/g, (char) => map[char]);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with score and feedback
 */
export const validatePassword = (password) => {
  const feedback = [];
  let score = 0;

  if (password.length >= 12) {
    score += 1;
  } else {
    feedback.push('At least 12 characters');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Uppercase letters');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Numbers');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Special characters');
  }

  return {
    score,
    isStrong: score >= 4,
    feedback: feedback.length > 0 ? `Add: ${feedback.join(', ')}` : 'Strong password',
  };
};

/**
 * Secure API fetch with CSRF token and security headers
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options
 * @returns {Promise} Fetch response
 */
export const secureApiFetch = async (url, options = {}) => {
  const csrfToken = getCSRFToken();
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  };

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase())) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * Get CSRF token from cookie or meta tag
 * @returns {string} CSRF token
 */
export const getCSRFToken = () => {
  // Try meta tag first (Django template)
  const metaToken = document.querySelector('meta[name="csrf-token"]');
  if (metaToken) {
    return metaToken.getAttribute('content');
  }

  // Try cookie next
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      return decodeURIComponent(value);
    }
  }

  return '';
};

/**
 * Validate URL to prevent malicious redirects
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is safe
 */
export const isValidUrl = (url) => {
  try {
    const urlObj = new URL(url, window.location.origin);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Only allow same origin and configured API domains
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const apiOrigin = new URL(apiUrl).origin;
    
    return urlObj.origin === window.location.origin || 
           urlObj.origin === apiOrigin;
  } catch {
    return false;
  }
};

/**
 * Safe localStorage access with error handling
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export const safeSetStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
};

/**
 * Safe localStorage retrieval
 * @param {string} key - Storage key
 * @returns {any} Retrieved value
 */
export const safeGetStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error('Storage error:', e);
    return null;
  }
};

/**
 * Safe localStorage removal
 * @param {string} key - Storage key
 */
export const safeRemoveStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Storage error:', e);
  }
};

/**
 * Check if running on secure HTTPS (except localhost)
 * @returns {boolean} True if secure context
 */
export const isSecureContext = () => {
  return window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
};
