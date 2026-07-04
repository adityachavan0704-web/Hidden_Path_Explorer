"""
Authentication URLs for HiddenPath Explorer.
"""

from django.urls import path
from hiddenpath.auth_views import (
    register_view, login_view, logout_view, user_profile_view
)

urlpatterns = [
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('profile/', user_profile_view, name='profile'),
]
