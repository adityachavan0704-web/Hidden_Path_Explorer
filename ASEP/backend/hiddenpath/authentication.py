"""
JWT Authentication for HiddenPath Explorer API.
"""

import jwt
import json
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import User


class JWTAuthentication(authentication.TokenAuthentication):
    """Custom JWT authentication class."""

    def authenticate(self, request):
        """Authenticate request using JWT token."""
        auth = authentication.get_authorization_header(request).split()

        if not auth or auth[0].lower() != b'bearer':
            return None

        if len(auth) == 1:
            raise AuthenticationFailed('Invalid token header.')

        if len(auth) > 2:
            raise AuthenticationFailed('Invalid token header.')

        token = auth[1]

        try:
            # Decode token
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM]
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired.')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token.')

        try:
            user = User.objects.get(id=payload['user_id'])
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found.')

        return (user, token)


def generate_jwt_token(user):
    """Generate JWT token for user."""
    payload = {
        'user_id': user.id,
        'email': user.email,
        'username': user.username,
        'exp': datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }

    token = jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )

    return token
