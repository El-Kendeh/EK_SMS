/**
 * Secure API client with CSRF token handling and security headers
 */

import { getCSRFToken } from '../utils/security';
import SECURITY_CONFIG from '../config/security';

class ApiClient {
  constructor() {
    this.baseURL = SECURITY_CONFIG.API_URL;
    this.timeout = 60000; // Increased to 60 seconds for registration
    this.retryAttempts = 3;
  }

  getToken() {
    try {
      const token = localStorage.getItem('token');
      return token && typeof token === 'string' && token.trim() ? token.trim() : null;
    } catch (error) {
      return null;
    }
  }

  clearAuth() {
    const hadToken = !!this.getToken();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (hadToken) {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('ek-sms-auth-changed'));
    }
  }

  buildHeaders(options = {}) {
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers,
    };

    const csrfToken = getCSRFToken();
    const method = options.method?.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }

    Object.assign(headers, SECURITY_CONFIG.SECURE_HEADERS);

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  isAuthError(response, errorData) {
    if (!response) return false;
    const message = (errorData?.message || response.statusText || '').toString();
    const code = (errorData?.code || '').toString();
    if (response.status === 401) {
      return /csrf|auth|token|expired|invalid|access denied|no token/i.test(message);
    }
    if (response.status === 403) {
      // Token/auth problems OR an account that is no longer approved/active (the
      // Phase 1 per-request approval gate sends code ACCOUNT_INACTIVE). A
      // deactivated/rejected account must be returned to login, not left with an
      // opaque error. NOTE: a plain role-permission denial ("Requires one of: ...")
      // is deliberately NOT treated as an auth error — a validly logged-in user
      // must not be logged out just for hitting one forbidden route.
      if (code === 'ACCOUNT_INACTIVE') return true;
      return /csrf|auth|token|expired|invalid|not active|requires super admin approval|account is pending/i.test(message);
    }
    return false;
  }

  async request(endpoint, options = {}) {
    const base = this.baseURL.replace(/\/+$/, '');
    let path = endpoint || '';
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }
    if (base.endsWith('/api') && path.startsWith('/api/')) {
      path = path.replace(/^\/api/, '');
    }
    /* Superadmin "view as school" context (set by the dashboard school
       picker). School-scoped endpoint families resolve their tenant from
       ?school_id — the backend only honours it for superadmin tokens. */
    try {
      const saSchoolId = sessionStorage.getItem('ek-sms-sa-school-id');
      if (
        saSchoolId &&
        /^\/(principal|finance|school)\//.test(path.replace(/^\/api/, '')) &&
        !path.includes('school_id=')
      ) {
        path += (path.includes('?') ? '&' : '?') + `school_id=${encodeURIComponent(saSchoolId)}`;
      }
    } catch (e) { /* sessionStorage unavailable — skip */ }
    const url = `${base}${path}`;
    const headers = this.buildHeaders(options);

    let body = options.body;
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      if (typeof body !== 'string') {
        body = JSON.stringify(body);
      }
    }

    let lastError;
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const { headers: _headers, body: _body, ...fetchOptions } = options;
        const response = await fetch(url, {
          credentials: 'include',
          ...fetchOptions,
          method: options.method,
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorData = null;
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

          try {
            errorData = await response.clone().json();
            if (errorData && errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (ignored) {
            // ignore non-json responses
          }

          if (response.status === 403) {
            this.refreshCSRFToken();
          }

          if (this.isAuthError(response, errorData)) {
            this.clearAuth();
            if (!errorMessage || response.status === 401) {
              errorMessage = 'Authentication failed. Please log in again.';
            }
          }

          throw new ApiError(errorMessage, response.status, response, errorData);
        }

        return response;
      } catch (error) {
        lastError = error;

        if (error instanceof ApiError) {
          throw error;
        }

        if (error.name === 'AbortError') {
          lastError = new ApiError('Request timeout', 0, null);
        }

        if (attempt === this.retryAttempts - 1) {
          throw lastError instanceof ApiError ? lastError : new ApiError(error.message, 0, null);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    throw lastError;
  }

  async get(endpoint, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'GET',
    });
    return response.json();
  }

  async post(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data,
    });
    return response.json();
  }

  async put(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data,
    });
    return response.json();
  }

  async patch(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: data,
    });
    return response.json();
  }

  async delete(endpoint, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'DELETE',
    });
    if (response.status === 204) {
      return null;
    }
    return response.json();
  }

  async refreshCSRFToken() {
    try {
      await this.get(SECURITY_CONFIG.CORS.routes.csrf);
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
    }
  }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, status, response, data = null) {
    super(message);
    this.status = status;
    this.response = response;
    this.data = data;          // full parsed JSON body (if any)
    this.name = 'ApiError';
    
    // Log error details for debugging
    console.error(`[ApiError] ${status}: ${message}`, {
      status, 
      message,
      url: response?.url
    });
  }
}

const apiClient = new ApiClient();
export default apiClient;
export { ApiError };
