"""
Example secure API views using Django REST Framework.
Implement authentication and permissions as shown below.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.views.decorators.http import require_http_methods
from django.middleware.csrf import get_token
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@require_http_methods(["GET"])
def csrf_token_view(request):
    """
    Provide CSRF token to frontend.
    Call this endpoint from your React app on page load.
    """
    token = get_token(request)
    return Response({'csrfToken': token})


@api_view(['POST'])
@require_http_methods(["POST"])
def login_view(request):
    """
    User login endpoint (example).
    In production, use Django REST Framework's authentication classes.
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        logger.warning(f'Login attempt with missing credentials from {request.META.get("REMOTE_ADDR")}')
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(username=username)
        if user.check_password(password):
            token, created = Token.objects.get_or_create(user=user)
            logger.info(f'User {username} logged in successfully')
            return Response({
                'token': token.key,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            })
        else:
            logger.warning(f'Failed login attempt for user {username}')
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
    except User.DoesNotExist:
        logger.warning(f'Login attempt with non-existent user: {username}')
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@require_http_methods(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    User logout endpoint (example).
    Deletes the user's authentication token.
    """
    try:
        request.user.auth_token.delete()
        logger.info(f'User {request.user.username} logged out')
        return Response({'message': 'Logged out successfully'})
    except Exception as e:
        logger.error(f'Logout error: {str(e)}')
        return Response(
            {'error': 'Logout failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@require_http_methods(["GET"])
@permission_classes([IsAuthenticated])
def protected_view(request):
    """
    Example protected endpoint requiring authentication.
    Only authenticated users can access this.
    """
    return Response({
        'message': f'Hello, {request.user.username}!',
        'user': {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email
        }
    })


# Security recommendations for API views:
# 1. Always use @require_http_methods to specify allowed methods
# 2. Always validate user input
# 3. Use DRF serializers for input validation and sanitization
# 4. Check permissions using @permission_classes decorator
# 5. Log security-relevant events
# 6. Return generic error messages (don't expose internal details)
# 7. Use HTTPS in production
# 8. Implement rate limiting on authentication endpoints
# 9. Use strong authentication tokens (don't use sessions for API)
# 10. Validate Content-Type headers
