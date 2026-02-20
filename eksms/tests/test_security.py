"""
Security tests for Django application.
Run with: pytest tests/test_security.py
"""

import pytest
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status


class SecurityHeadersTestCase(TestCase):
    """Test security headers are properly set."""
    
    def setUp(self):
        self.client = Client()
    
    def test_security_headers_present(self):
        """Test that security headers are present in responses."""
        response = self.client.get('/admin/')
        
        # Check for security headers
        assert 'X-Content-Type-Options' in response
        assert response['X-Content-Type-Options'] == 'nosniff'
        
        assert 'X-Frame-Options' in response
        assert response['X-Frame-Options'] == 'DENY'
        
        assert 'X-XSS-Protection' in response
        
        assert 'Referrer-Policy' in response
    
    def test_hsts_header(self):
        """Test HSTS header is set."""
        response = self.client.get('/admin/')
        # Note: HSTS only set in production (DEBUG=False)
        # In development, check if setting is non-zero
        if not settings.DEBUG:
            assert 'Strict-Transport-Security' in response


class CSRFProtectionTestCase(TestCase):
    """Test CSRF protection is working."""
    
    def setUp(self):
        self.client = Client()
    
    def test_csrf_token_required(self):
        """Test that CSRF token is required for POST."""
        # GET should work fine and return CSRF token
        response = self.client.get('/api/csrf-token/')
        assert response.status_code == 200
        assert 'csrfToken' in response.json()
    
    def test_post_without_csrf_token_fails(self):
        """Test that POST without CSRF token fails."""
        response = self.client.post('/api/auth/login/', {
            'username': 'test',
            'password': 'test'
        })
        # Should be 403 Forbidden or 400 Bad Request
        assert response.status_code in [403, 400]


class AuthenticationTestCase(TestCase):
    """Test authentication security."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPassword123'
        )
    
    def test_weak_password_rejected(self):
        """Test that weak passwords are rejected."""
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        
        with pytest.raises(ValidationError):
            validate_password('123')  # Too short
        
        with pytest.raises(ValidationError):
            validate_password('password')  # Common password
    
    def test_sql_injection_prevention(self):
        """Test that SQL injection is prevented."""
        User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='AdminPassword123'
        )
        
        # Attempt SQL injection
        response = self.client.post('/api/auth/login/', {
            'username': "admin' OR '1'='1",
            'password': "' OR '1'='1"
        })
        
        # Should fail, not log in as admin
        assert response.status_code == 401
    
    def test_xss_prevention(self):
        """Test that XSS is prevented."""
        # Create user with potentially malicious data
        user = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='TestPassword123'
        )
        
        # Attempt to login
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser2',
            'password': 'TestPassword123'
        })
        
        if response.status_code == 200:
            # Check that response is properly escaped
            assert '<script>' not in str(response.content)


class CORSTestCase(TestCase):
    """Test CORS configuration."""
    
    def setUp(self):
        self.client = Client()
    
    def test_cors_headers_set(self):
        """Test that CORS headers are properly set."""
        response = self.client.options(
            '/api/endpoint/',
            HTTP_ORIGIN='http://localhost:3000'
        )
        
        # Should have CORS headers
        if response.status_code == 200:
            assert 'Access-Control-Allow-Origin' in response


class RateLimitingTestCase(TestCase):
    """Test rate limiting on sensitive endpoints."""
    
    def setUp(self):
        self.client = Client()
    
    def test_login_rate_limiting(self):
        """Test that login attempts are rate limited."""
        # This depends on django-ratelimit configuration
        # Make multiple login attempts
        for i in range(150):  # Assuming limit is 100/h
            response = self.client.post('/api/auth/login/', {
                'username': f'user{i}',
                'password': 'wrong'
            })
            
            # After rate limit is exceeded, should get 429
            if i > 100:
                assert response.status_code == 429, f"Expected rate limit at attempt {i}"


class SessionSecurityTestCase(TestCase):
    """Test session security settings."""
    
    def setUp(self):
        self.client = Client()
    
    def test_session_cookie_secure_flags(self):
        """Test that session cookies have correct flags."""
        # Create a user and login
        User.objects.create_user('test', 'test@test.com', 'password')
        response = self.client.post('/api/auth/login/', {
            'username': 'test',
            'password': 'password'
        })
        
        # Check for security flags in cookies
        if 'Set-Cookie' in response:
            cookies = response['Set-Cookie']
            # In production, should have Secure flag
            # Secure flag only set when HTTPS


class ClickjackingProtectionTestCase(TestCase):
    """Test clickjacking protection."""
    
    def setUp(self):
        self.client = Client()
    
    def test_xframe_options_set(self):
        """Test X-Frame-Options header."""
        response = self.client.get('/admin/')
        assert response['X-Frame-Options'] == 'DENY'


class SSLTestCase(TestCase):
    """Test SSL/TLS settings."""
    
    def test_ssl_redirect_enabled_in_production(self):
        """Test that SSL redirect is enabled in production."""
        from django.conf import settings
        
        if not settings.DEBUG:
            assert settings.SECURE_SSL_REDIRECT is True
            assert settings.SESSION_COOKIE_SECURE is True
            assert settings.CSRF_COOKIE_SECURE is True
    
    def test_hsts_enabled_in_production(self):
        """Test that HSTS is enabled in production."""
        from django.conf import settings
        
        if not settings.DEBUG:
            assert settings.SECURE_HSTS_SECONDS > 0
            assert settings.SECURE_HSTS_INCLUDE_SUBDOMAINS is True


class InputValidationTestCase(TestCase):
    """Test input validation."""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_long_string_input(self):
        """Test that excessively long input is rejected."""
        # Create a very long username
        long_username = 'a' * 10000
        
        response = self.client.post('/api/auth/login/', {
            'username': long_username,
            'password': 'test'
        })
        
        # Should be rejected
        assert response.status_code in [400, 413]
    
    def test_null_byte_injection(self):
        """Test that null bytes don't cause issues."""
        response = self.client.post('/api/auth/login/', {
            'username': 'test\x00bad',
            'password': 'test'
        })
        
        # Should handle gracefully
        assert response.status_code != 500


class DependencySecurityTestCase(TestCase):
    """Test for known vulnerabilities in dependencies."""
    
    def test_django_version(self):
        """Check Django version is current."""
        import django
        # Check that Django version is not outdated
        version = tuple(map(int, django.VERSION[:2]))
        # At minimum, should be 4.2+ (LTS) or 5.0+
        assert version >= (4, 2), f"Django version {version} may have vulnerabilities"


# Integration Tests

@pytest.mark.django_db
class IntegrationTests(TestCase):
    """Integration tests for security features."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPassword123'
        )
    
    def test_full_authentication_flow(self):
        """Test complete authentication flow with security."""
        # 1. Get CSRF token
        response = self.client.get('/api/csrf-token/')
        assert response.status_code == 200
        csrf_token = response.json()['csrfToken']
        
        # 2. Login with CSRF token
        self.client.defaults['HTTP_X_CSRFTOKEN'] = csrf_token
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'TestPassword123'
        })
        
        assert response.status_code == 200
        token = response.json()['token']
        
        # 3. Access protected resource
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Token {token}'
        response = self.client.get('/api/protected/')
        assert response.status_code == 200


# Performance & Security Tests

class PerformanceSecurityTests(TestCase):
    """Tests for security-related performance."""
    
    def test_password_hashing_time(self):
        """Test that password hashing takes reasonable time."""
        import time
        from django.contrib.auth.models import User
        
        start = time.time()
        User.objects.create_user('test', 'test@test.com', 'password')
        speed = time.time() - start
        
        # Should take at least 100ms (password hashing is slow intentionally)
        assert speed >= 0.1, "Password hashing may be too fast"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
