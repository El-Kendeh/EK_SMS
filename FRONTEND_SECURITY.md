Frontend Security Guide

React Application Security Hardening


Overview

This frontend security setup provides:
- XSS Protection (input sanitization)
- CSRF Token Handling
- Secure API Client with CORS
- Content Security Policy (CSP)
- Session Management
- Rate Limiting
- Security Event Logging
- Password Validation
- Input Validation


Key Security Features

1. XSS (Cross-Site Scripting) Protection
   - All user input is sanitized before rendering
   - HTML entities are escaped
   - Use sanitizeInput() for user content
   
   Example:
   ```javascript
   import { sanitizeInput } from './utils/security';
   const safeUserInput = sanitizeInput(userInput);
   ```

2. CSRF (Cross-Site Request Forgery) Protection
   - CSRF tokens automatically included in requests
   - Token extracted from Django backend
   - Sent with all state-changing requests (POST, PUT, PATCH, DELETE)
   
   Example:
   ```javascript
   import apiClient from './api/client';
   await apiClient.post('/api/endpoint/', data);
   ```

3. Secure API Client
   - Central API client with security features
   - Automatic CSRF token handling
   - Secure header injection
   - Request retry logic
   - Timeout handling
   
   Usage:
   ```javascript
   import apiClient from './api/client';
   
   const data = await apiClient.get('/api/endpoint/');
   const response = await apiClient.post('/api/endpoint/', { key: 'value' });
   await apiClient.delete('/api/endpoint/');
   ```

4. Content Security Policy (CSP)
   - Prevents inline script execution
   - Restricts resource loading
   - Blocks framing
   - Controls form submissions
   
   Configuration in: src/config/security.js

5. Session Security
   - Automatic session timeout (1 hour default)
   - Warning before timeout
   - Custom session handlers
   
   ```javascript
   import { SessionTimeout } from './utils/securityMonitoring';
   
   const session = new SessionTimeout();
   session.onWarning = () => showTimeoutWarning();
   session.onTimeout = () => logout();
   session.start();
   ```

6. Rate Limiting
   - Limits login attempts
   - Prevents brute force attacks
   - Configurable thresholds
   
   ```javascript
   import { RateLimiter } from './utils/securityMonitoring';
   
   const limiter = new RateLimiter(5, 900000); // 5 attempts per 15 min
   if (limiter.isAllowed('login')) {
     // Allow login
   }
   ```

7. Password Validation
   - Enforces strong passwords
   - Minimum length (12 characters)
   - Requires uppercase, lowercase, numbers, special chars
   - Provides feedback on strength
   
   ```javascript
   import { validatePassword } from './utils/security';
   
   const result = validatePassword(password);
   console.log(result.isStrong); // boolean
   console.log(result.feedback); // string
   ```

8. Input Validation
   - Email validation
   - URL validation
   - String sanitization
   - Type checking
   
   ```javascript
   import { 
     validateEmail, 
     sanitizeInput,
     isValidUrl 
   } from './utils/security';
   
   validateEmail('user@example.com');
   isValidUrl('https://example.com');
   ```

9. Security Logging
   - Tracks security events
   - Monitors suspicious activity
   - XSS attempt detection
   - CSRF attempt detection
   - Unauthorized access tracking
   
   ```javascript
   import { SecurityLogger } from './utils/securityMonitoring';
   
   SecurityLogger.info('User logged in');
   SecurityLogger.warning('Failed login attempt');
   SecurityLogger.critical('Suspicious activity detected');
   ```

10. Storage Security
    - Safe localStorage access with error handling
    - JSON serialization/deserialization
    - Try-catch protection
    
    ```javascript
    import { 
      safeSetStorage, 
      safeGetStorage,
      safeRemoveStorage
    } from './utils/security';
    
    safeSetStorage('token', userData);
    const data = safeGetStorage('token');
    safeRemoveStorage('token');
    ```


Environment Variables

Development (.env.frontend):
  REACT_APP_API_URL=http://localhost:8000
  REACT_APP_ENVIRONMENT=development
  REACT_APP_SESSION_TIMEOUT=3600000

Production (.env.production):
  REACT_APP_API_URL=https://your-production-domain.com
  REACT_APP_ENVIRONMENT=production
  REACT_APP_SESSION_TIMEOUT=3600000


File Structure

src/
├── api/
│   └── client.js              # Secure API client
├── config/
│   └── security.js            # Security configuration
├── utils/
│   ├── security.js            # Core security utilities
│   ├── securityMonitoring.js  # Logging & monitoring
│   └── csp.js                 # Content Security Policy
├── App.js                     # Main app component
└── index.js                   # Entry point


Usage Examples

1. Secure Login Component
   
   ```javascript
   import apiClient from './api/client';
   import { validateEmail, validatePassword } from './utils/security';
   import { RateLimiter, SecurityLogger } from './utils/securityMonitoring';
   
   const limiter = new RateLimiter(5, 900000);
   
   async function handleLogin(email, password) {
     if (!limiter.isAllowed('login')) {
       SecurityLogger.warning('Login rate limit exceeded');
       return;
     }
     
     if (!validateEmail(email)) {
       console.error('Invalid email');
       return;
     }
     
     const pwdValidation = validatePassword(password);
     if (!pwdValidation.isStrong) {
       console.error(pwdValidation.feedback);
       return;
     }
     
     try {
       const response = await apiClient.post('/api/login/', {
         email,
         password,
       });
       SecurityLogger.trackAuth('login', { email });
       // Handle successful login
     } catch (error) {
       SecurityLogger.trackApiError('/api/login/', error.status, error);
       // Handle login error
     }
   }
   ```

2. Safe Data Display
   
   ```javascript
   import { sanitizeInput } from './utils/security';
   
   function UserProfile({ user }) {
     return (
       <div>
         <h1>{sanitizeInput(user.name)}</h1>
         <p>{sanitizeInput(user.bio)}</p>
       </div>
     );
   }
   ```

3. Secure Navigation

   ```javascript
   import { isValidUrl } from './utils/security';
   
   function SafeLink({ href, children }) {
     if (!isValidUrl(href)) {
       return <span>{children}</span>;
     }
     return <a href={href}>{children}</a>;
   }
   ```


Dependencies Required

Add to package.json:
  - react-helmet (for managing document head)
  - js-sha256 (for hashing)
  - axios (alternative to fetch)
  - react-query (for API caching)


Security Best Practices

1. Always use apiClient for API calls
   - Includes CSRF tokens
   - Handles errors
   - Provides retry logic

2. Sanitize user input before display
   - Never use dangerouslySetInnerHTML
   - Use sanitizeInput() for text content

3. Validate user input
   - Email, phone, passwords
   - URLs, file types
   - Input length limits

4. Use environment variables
   - Store API URLs in .env files
   - Never hardcode sensitive data
   - Keep .env files in .gitignore

5. Handle errors gracefully
   - Don't expose stack traces to users
   - Log errors securely
   - Provide user-friendly messages

6. Secure authentication
   - Use secure cookies (HttpOnly, Secure flags)
   - Implement session timeout
   - Clear sensitive data on logout
   - Never store passwords locally

7. Implement rate limiting
   - Protect login forms
   - Limit API requests
   - Require CAPTCHA if needed

8. Monitor security events
   - Log suspicious activities
   - Track failed attempts
   - Send alerts for critical events

9. Regular security updates
   - Keep dependencies updated
   - Use `npm audit` to check vulnerabilities
   - Run security scanners

10. Content Security Policy
    - Restrict resource loading
    - Prevent inline scripts
    - Monitor CSP violations


Testing Security

1. Check XSS vulnerabilities:
   ```javascript
   const xssPayload = '<img src=x onerror="alert(\'XSS\')">';
   const clean = sanitizeInput(xssPayload);
   // Should output: &lt;img src=x onerror=&quot;alert(&#039;XSS&#039;)&quot;&gt;
   ```

2. Test password validation:
   ```javascript
   validatePassword('weak');      // { score: 0, isStrong: false }
   validatePassword('StrongP@ss123'); // { score: 5, isStrong: true }
   ```

3. Test rate limiting:
   ```javascript
   const limiter = new RateLimiter(3, 1000);
   limiter.isAllowed('test');  // true
   limiter.isAllowed('test');  // true
   limiter.isAllowed('test');  // true
   limiter.isAllowed('test');  // false (rate limited)
   ```

4. Run npm audit:
   ```bash
   npm audit
   npm audit fix
   ```


Deployment Checklist

[ ] Set REACT_APP_ENVIRONMENT=production in .env
[ ] Set REACT_APP_API_URL to production domain
[ ] Enable HTTPS (required for secure cookies)
[ ] Enable Strict-Transport-Security header
[ ] Set Content-Security-Policy headers in web server
[ ] Enable X-Frame-Options: DENY
[ ] Enable X-Content-Type-Options: nosniff
[ ] Enable X-XSS-Protection: 1; mode=block
[ ] Run npm audit and fix vulnerabilities
[ ] Test all authentication flows
[ ] Test rate limiting
[ ] Monitor CSP violations
[ ] Set up error logging
[ ] Test on different browsers/devices
[ ] Perform security penetration testing


Useful Resources

- OWASP React Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/React_Security_Cheat_Sheet.html
- MDN Web Security: https://developer.mozilla.org/en-US/docs/Web/Security
- CSP Guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- Set-Cookie Security: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie


Next Steps

1. Integrate security utilities into all components
2. Add logging to sensitive operations
3. Implement session timeout UI
4. Add rate limiting to sensitive forms
5. Set up monitoring and alerting
6. Regular security audits
7. Keep dependencies updated
