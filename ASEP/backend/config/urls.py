"""
URL Configuration for HiddenPath Explorer project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import routers
from hiddenpath import views

# API Routers
router = routers.DefaultRouter()
router.register(r'events', views.EventViewSet, basename='event')
router.register(r'bookings', views.BookingViewSet, basename='booking')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('hiddenpath.auth_urls')),
    path('api/', include(router.urls)),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
