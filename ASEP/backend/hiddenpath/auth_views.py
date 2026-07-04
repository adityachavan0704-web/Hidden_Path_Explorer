"""
Authentication Views for HiddenPath Explorer.
Handles user registration, login, logout, and profile management.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from hiddenpath.authentication import generate_jwt_token
from hiddenpath.models import UserProfile
from hiddenpath.serializers import UserSerializer, UserProfileSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    Register a new user.
    
    Expected POST data:
    {
        "email": "user@example.com",
        "username": "username",
        "password": "password",
        "first_name": "John",
        "last_name": "Doe"
    }
    """
    email = request.data.get('email')
    username = request.data.get('username')
    password = request.data.get('password')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')

    # Validation
    if not email or not username or not password:
        return Response(
            {'error': 'Email, username, and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(password) < 6:
        return Response(
            {'error': 'Password must be at least 6 characters long.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if user already exists
    if User.objects.filter(email=email).exists():
        return Response(
            {'error': 'Email already registered.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already taken.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Create user
        user = User.objects.create_user(
            email=email,
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        # Create user profile
        UserProfile.objects.create(user=user)

        # Generate JWT token
        token = generate_jwt_token(user)

        return Response({
            'message': 'User registered successfully.',
            'token': token,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login user and return JWT token.
    
    Expected POST data:
    {
        "email" or "username": "value",
        "password": "password"
    }
    """
    email_or_username = request.data.get('email') or request.data.get('username')
    password = request.data.get('password')

    if not email_or_username or not password:
        return Response(
            {'error': 'Email/username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Try to find user by email or username
        user = User.objects.filter(
            email=email_or_username
        ).first() or User.objects.filter(
            username=email_or_username
        ).first()

        if not user:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Authenticate user
        if not user.check_password(password):
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Generate JWT token
        token = generate_jwt_token(user)

        return Response({
            'message': 'Login successful.',
            'token': token,
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout user (essentially a pass-through since JWT is stateless).
    """
    return Response({
        'message': 'Logout successful. Please discard your token.'
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """
    Get or update user profile.
    """
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=request.user)

    if request.method == 'GET':
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
