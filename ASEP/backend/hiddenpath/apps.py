"""
Django app configuration for HiddenPath.
"""

from django.apps import AppConfig


class HiddenpathConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'hiddenpath'
    verbose_name = 'HiddenPath Explorer'
