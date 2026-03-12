/**
 * Secure API client with CSRF token handling and security headers
 */

import { getCSRFToken } from '../utils/security';
import SECURITY_CONFIG from '../config/security';

class ApiClient {
  constructor() {
    this.baseURL = SECURITY_CONFIG.API_URL;
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
  }

  /**
   * Make a secure API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const csrfToken = getCSRFToken();

    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers,
    };

    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase())) {
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
    }

    // Add security headers
    Object.assign(headers, SECURITY_CONFIG.SECURE_HEADERS);

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

        const response = await fetch(url, {
          credentials: 'include', // Include cookies for CORS
          ...options,
          headers,
          body, // Pass the processed body
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 403) {
            // CSRF token might be invalid
            this.refreshCSRFToken();
          }
          throw new ApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response
          );
        }

        return response;
      } catch (error) {
        lastError = error;

        if (error instanceof ApiError) {
          throw error;
        }

        // Retry on network errors (but not on last attempt)
        if (error.name !== 'AbortError' && attempt === this.retryAttempts - 1) {
          throw new ApiError(error.message, 0, null);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    throw lastError;
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'GET',
    });
    return response.json();
  }

  /**
   * POST request
   */
  async post(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data,
    });
    return response.json();
  }

  /**
   * PUT request
   */
  async put(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data,
    });
    return response.json();
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: data,
    });
    return response.json();
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    const response = await this.request(endpoint, {
      ...options,
      method: 'DELETE',
    });
    
    // DELETE might not have a body
    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  }

  /**
   * Refresh CSRF token
   */
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
  constructor(message, status, response) {
    super(message);
    this.status = status;
    this.response = response;
    this.name = 'ApiError';
  }
}

const apiClient = new ApiClient();
export default apiClient;
export { ApiError };
