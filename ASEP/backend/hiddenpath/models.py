"""
Django models for HiddenPath Explorer application.
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator

class UserProfile(models.Model):
    """Extended user profile."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    is_admin = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} Profile"


class Event(models.Model):
    """Event model for managing events."""
    CROWD_CHOICES = [
        ('low', 'Low'),
        ('moderate', 'Moderate'),
        ('high', 'High'),
    ]

    TYPE_CHOICES = [
        ('hidden_gem', 'Hidden Gem'),
        ('popular', 'Popular'),
        ('cultural', 'Cultural'),
        ('adventure', 'Adventure'),
        ('nature', 'Nature'),
    ]

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    description = models.TextField()
    event_type = models.CharField(max_length=50, choices=TYPE_CHOICES, default='hidden_gem')
    crowd_level = models.CharField(max_length=50, choices=CROWD_CHOICES, default='low')
    image_url = models.URLField(blank=True, null=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    best_season = models.CharField(max_length=100, blank=True, null=True)
    duration_hours = models.IntegerField(default=8, validators=[MinValueValidator(1)])
    max_capacity = models.IntegerField(default=50, validators=[MinValueValidator(1)])
    current_bookings = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tags = models.CharField(max_length=500, blank=True, null=True)  # Comma-separated
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['location']),
            models.Index(fields=['event_type']),
        ]

    def __str__(self):
        return f"{self.name} - {self.location}"

    def is_available(self):
        """Check if event has available slots."""
        return self.current_bookings < self.max_capacity

    def available_slots(self):
        """Get number of available slots."""
        return max(0, self.max_capacity - self.current_bookings)


class Booking(models.Model):
    """Booking model for managing event bookings."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='bookings')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    number_of_participants = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    booking_date = models.DateTimeField(auto_now_add=True)
    confirmation_date = models.DateTimeField(blank=True, null=True)
    cancellation_date = models.DateTimeField(blank=True, null=True)
    special_requests = models.TextField(blank=True, null=True)
    booking_reference = models.CharField(max_length=50, unique=True)

    class Meta:
        ordering = ['-booking_date']
        indexes = [
            models.Index(fields=['user', 'event']),
            models.Index(fields=['status']),
            models.Index(fields=['booking_reference']),
        ]
        unique_together = ('user', 'event')  # User can only book an event once

    def __str__(self):
        return f"Booking #{self.booking_reference} - {self.user.email}"

    def save(self, *args, **kwargs):
        """Generate booking reference if not exists."""
        if not self.booking_reference:
            import uuid
            self.booking_reference = f"BP-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)


class Review(models.Model):
    """Review model for event reviews."""
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(choices=RATING_CHOICES)
    title = models.CharField(max_length=200)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('user', 'event')

    def __str__(self):
        return f"Review by {self.user.email} - {self.event.name}"


class Destination(models.Model):
    """Destination model for place information."""
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)
    location = models.CharField(max_length=255)
    description = models.TextField()
    destination_type = models.CharField(max_length=100)
    image_url = models.URLField(blank=True, null=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    tags = models.CharField(max_length=500, blank=True, null=True)  # Comma-separated
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} - {self.location}"
