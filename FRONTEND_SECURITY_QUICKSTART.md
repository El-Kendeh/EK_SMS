Frontend Security Quick Start

Getting Started with React Security


1. Security Utilities Structure

src/
├── api/
│   └── client.js              # All API calls go through this
├── config/
│   └── security.js            # Security configuration
├── security/
│   └── init.js                # Initialize security on app load
├── utils/
│   ├── security.js            # Core functions (sanitize, validate)
│   ├── securityMonitoring.js  # Logging and rate limiting
│   └── csp.js                 # Content Security Policy


2. Using the API Client (Securely!)

ALWAYS use this for API calls - it handles CSRF tokens automatically:

```javascript
import apiClient from './api/client';

// GET request
const users = await apiClient.get('/api/users/');

// POST request with CSRF token (automatic)
const response = await apiClient.post('/api/login/', {
  email: 'user@example.com',
  password: 'password',
});

// DELETE request with CSRF token (automatic)
await apiClient.delete('/api/users/123/');
```


3. Sanitizing User Input

NEVER display raw user input without sanitizing:

```javascript
import { sanitizeInput } from './utils/security';

// Before rendering user name or comments
const safeName = sanitizeInput(userProvidedName);

// Prevents XSS attacks like: <img src=x onerror="alert('XSS')">
```


4. Validating User Input

Validate before sending to backend:

```javascript
import { 
  validateEmail, 
  validatePassword 
} from './utils/security';

// Email validation
if (!validateEmail(email)) {
  console.error('Invalid email format');
  return;
}

// Password validation
const pwdCheck = validatePassword(password);
if (!pwdCheck.isStrong) {
  console.error(pwdCheck.feedback); // "Add: Numbers, Special characters"
  return;
}
```


5. Rate Limiting Login Attempts

Prevent brute force attacks:

```javascript
import { RateLimiter } from './utils/securityMonitoring';

const loginLimiter = new RateLimiter(5, 900000); // 5 attempts per 15 min

async function handleLogin(email, password) {
  if (!loginLimiter.isAllowed(email)) {
    console.error('Too many login attempts. Try again later.');
    return;
  }
  
  // Proceed with login...
}
```


6. Security Logging

Track important events:

```javascript
import { SecurityLogger } from './utils/securityMonitoring';

// Log user actions
SecurityLogger.info('User logged in', { userId: 123 });

// Log warnings
SecurityLogger.warning('Failed login attempt', { ip: '192.168.1.1' });

// Log critical events
SecurityLogger.critical('Unauthorized access attempt', { endpoint: '/admin' });
```


7. Session Timeout

Automatically handled in src/security/init.js:
- Session expires after 1 hour (configurable)
- 1-minute warning before timeout
- Auto-resets on user activity (mouse, keyboard, scroll)
- Logs user out automatically


8. CSRF Protection

Automatically included in all requests via apiClient:

```javascript
// This automatically includes CSRF token
const response = await apiClient.post('/api/data/', { data: 'value' });

// NEVER use raw fetch() for POST/PUT/DELETE:
// ❌ fetch('/api/data/', { method: 'POST', ...}) - MISSING CSRF TOKEN
// ✅ apiClient.post('/api/data/', {...}) - CSRF TOKEN INCLUDED
```


9. Safe Links and Navigation

Prevent malicious redirects:

```javascript
import { isValidUrl } from './utils/security';

function SafeNav({ href, label }) {
  // Only allow same-origin or configured API domain
  if (!isValidUrl(href)) {
    return <span>{label}</span>; // Don't redirect
  }
  return <a href={href}>{label}</a>;
}
```


10. Secure Storage

Safe localStorage access with error handling:

```javascript
import { 
  safeSetStorage, 
  safeGetStorage, 
  safeRemoveStorage 
} from './utils/security';

// Store data
safeSetStorage('user', { id: 123, email: 'user@example.com' });

// Retrieve data
const user = safeGetStorage('user');

// Remove data on logout
safeRemoveStorage('user');
```


Environment Configuration

Development: .env.frontend
  REACT_APP_API_URL=http://localhost:8000
  REACT_APP_ENVIRONMENT=development
  NODE_ENV=development

Production: .env.production
  REACT_APP_API_URL=https://your-production-domain.com
  REACT_APP_ENVIRONMENT=production
  NODE_ENV=production


Common Implementation Patterns

Login Form:
```javascript
import { useState } from 'react';
import apiClient from './api/client';
import { validateEmail, validatePassword } from './utils/security';
import { RateLimiter, SecurityLogger } from './utils/securityMonitoring';

const loginLimiter = new RateLimiter(5, 900000);

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!validateEmail(email)) {
      setError('Invalid email format');
      return;
    }

    if (!loginLimiter.isAllowed(email)) {
      setError('Too many attempts. Try again later.');
      return;
    }

    try {
      const response = await apiClient.post('/api/login/', { 
        email, 
        password 
      });
      
      SecurityLogger.info('Login successful', { email });
      // Handle successful login
    } catch (err) {
      SecurityLogger.warning('Login failed', { email, error: err.message });
      setError('Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}
```

User Profile Display:
```javascript
import { sanitizeInput } from './utils/security';

export function UserProfile({ user }) {
  return (
    <div>
      <h1>{sanitizeInput(user.name)}</h1>
      <p>{sanitizeInput(user.bio)}</p>
      <email>{sanitizeInput(user.email)}</email>
    </div>
  );
}
```

Protected Route:
```javascript
import apiClient from './api/client';

export async function checkAuth() {
  try {
    const response = await apiClient.get('/api/me/');
    return response.user;
  } catch (error) {
    return null;
  }
}
```


Security Checklist

[ ] Using apiClient for all API calls
[ ] Sanitizing all user input before display
[ ] Validating user input before sending to backend
[ ] Implementing rate limiting on sensitive operations
[ ] Logging important security events
[ ] Using secure storage methods
[ ] Validating URLs before navigation
[ ] Environment variables configured correctly
[ ] Development using .env.frontend
[ ] Production using .env.production
[ ] Session timeout working (1-2 minute inactivity test)
[ ] CSRF tokens being sent (check Network tab in DevTools)
[ ] Content Security Policy enabled
[ ] No dangerouslySetInnerHTML in components
[ ] No hardcoded API URLs
[ ] No sensitive data in localStorage
[ ] Error messages don't expose sensitive info


Testing in Browser DevTools

1. Check CSRF Token:
   - Open Console
   - Run: getCSRFToken()
   - Should return a token string

2. Check API Request:
   - Open Network tab
   - Make an API call
   - Look for X-CSRFToken header
   - Look for Credentials: include

3. Check CSP Violations:
   - Open Console
   - Violations appear as WARNING messages
   - No blocked resources should appear

4. Check Session Timeout:
   - Console shows: "Session timeout warning" after 59 minutes
   - User logged out after 60 minutes


Debugging

Enable verbose logging:
```javascript
// In src/index.js
window.DEBUG = true;

// Then in console:
localStorage.DEBUG = 'true';
```

Check security logs in Console:
```javascript
// View all logs
SecurityLogger.log();

// View specific events
const logs = console.logs;
```


Production Deployment

Before deploying:

1. npm audit
   - Check for vulnerabilities
   - npm audit fix

2. npm run build
   - Creates optimized production build
   - Includes CSP headers

3. Environment Variables
   - Set REACT_APP_ENVIRONMENT=production
   - Set REACT_APP_API_URL to production domain
   - Never commit .env files

4. Web Server Configuration
   - Enable HTTPS (required for secure cookies)
   - Set Security Headers:
     - Strict-Transport-Security
     - Content-Security-Policy
     - X-Frame-Options: DENY
     - X-Content-Type-Options: nosniff

5. Testing
   - Test login flow
   - Test rate limiting
   - Check CORS from production frontend URL
   - Monitor security logs


Troubleshooting

CSRF Token Missing:
- Check if Django backend is sending token
- Verify getCSRFToken() returns a value
- Check Network tab for Set-Cookie headers

API Calls Failing (CORS):
- Check CORS_ALLOWED_ORIGINS in Django settings
- Verify frontend URL is in whitelist
- Check credentials: 'include' in fetch options

Session Not Timing Out:
- Check REACT_APP_SESSION_TIMEOUT in .env
- Check browser's local storage for session data
- Verify event listeners are attached

CSP Violations:
- Check browser console for warnings
- Review SECURITY_CONFIG.CSP
- Whitelist necessary domains


Need Help?

See FRONTEND_SECURITY.md for comprehensive documentation
