/**
 * Security and logging utilities
 * Tracks security events and suspicious activities
 */

export const SecurityLogger = {
  levels: {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL',
  },

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...data,
    };

    console.log(`[${level}] ${message}`, logEntry);

    // In production, send security logs to backend or monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendToBackend(logEntry);
    }
  },

  info(message, data) {
    this.log(this.levels.INFO, message, data);
  },

  warning(message, data) {
    this.log(this.levels.WARNING, message, data);
  },

  error(message, data) {
    this.log(this.levels.ERROR, message, data);
  },

  critical(message, data) {
    this.log(this.levels.CRITICAL, message, data);
  },

  async sendToBackend(logEntry) {
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/api/logs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to send log to backend:', error);
    }
  },

  // Track XSS attempts
  trackXSSAttempt(input, context) {
    this.warning('Potential XSS attempt detected', {
      context,
      inputLength: input?.length,
    });
  },

  // Track CSRF attempts
  trackCSRFAttempt(context) {
    this.critical('Potential CSRF attempt detected', { context });
  },

  // Track unauthorized access
  trackUnauthorized(context) {
    this.warning('Unauthorized access attempt', { context });
  },

  // Track API errors
  trackApiError(endpoint, status, error) {
    this.error('API error', {
      endpoint,
      status,
      error: error.message,
    });
  },

  // Track authentication
  trackAuth(action, context) {
    this.info(`Authentication ${action}`, { context });
  },
};

/**
 * Rate limiter for sensitive operations
 */
export class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 900000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];

    // Clean old attempts outside the window
    const validAttempts = userAttempts.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (validAttempts.length >= this.maxAttempts) {
      SecurityLogger.warning('Rate limit exceeded', { key });
      return false;
    }

    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }

  reset(key) {
    this.attempts.delete(key);
  }

  resetAll() {
    this.attempts.clear();
  }
}

/**
 * Session timeout handler
 */
export class SessionTimeout {
  constructor(timeoutMs = 3600000, warningMs = 60000) {
    this.timeoutMs = timeoutMs;
    this.warningMs = warningMs;
    this.timeoutId = null;
    this.warningId = null;
    this.onWarning = null;
    this.onTimeout = null;
  }

  start() {
    this.clear();
    
    // Warning timer
    this.warningId = setTimeout(() => {
      SecurityLogger.info('Session timeout warning');
      if (this.onWarning) {
        this.onWarning();
      }
    }, this.timeoutMs - this.warningMs);

    // Timeout timer
    this.timeoutId = setTimeout(() => {
      SecurityLogger.info('Session timeout');
      this.logout();
    }, this.timeoutMs);
  }

  reset() {
    this.start();
  }

  clear() {
    clearTimeout(this.timeoutId);
    clearTimeout(this.warningId);
  }

  logout() {
    this.clear();
    if (this.onTimeout) {
      this.onTimeout();
    }
  }
}

/**
 * Monitor for suspicious activity
 */
export class SuspiciousActivityMonitor {
  constructor() {
    this.failedAttempts = new Map();
    this.maxFailedAttempts = 3;
  }

  trackFailedAttempt(identifier) {
    const attempts = (this.failedAttempts.get(identifier) || 0) + 1;
    this.failedAttempts.set(identifier, attempts);

    if (attempts >= this.maxFailedAttempts) {
      SecurityLogger.critical('Suspicious activity detected', {
        identifier,
        attempts,
      });
    }

    return attempts;
  }

  resetAttempts(identifier) {
    this.failedAttempts.delete(identifier);
  }

  getAllAttempts(identifier) {
    return this.failedAttempts.get(identifier) || 0;
  }
}

const SECURITY_MONITOR = {
  SecurityLogger,
  RateLimiter,
  SessionTimeout,
  SuspiciousActivityMonitor,
};

export default SECURITY_MONITOR;
