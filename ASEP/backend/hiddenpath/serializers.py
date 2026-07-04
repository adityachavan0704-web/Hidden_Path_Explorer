"""
Serializers for HiddenPath Explorer API.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from hiddenpath.models import UserProfile, Event, Booking, Review, Destination
from django.utils import timezone


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile."""
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'email', 'username', 'phone', 'date_of_birth', 'location', 'bio', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user registration and basic info."""
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'profile']
        read_only_fields = ['id']


class EventSerializer(serializers.ModelSerializer):
    """Serializer for events."""
    available_slots = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()
    tags_list = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'name', 'location', 'description', 'event_type',
            'crowd_level', 'image_url', 'latitude', 'longitude',
            'best_season', 'duration_hours', 'max_capacity',
            'current_bookings', 'price', 'tags', 'tags_list',
            'available_slots', 'is_available', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'current_bookings', 'created_at', 'updated_at']

    def get_available_slots(self, obj):
        return obj.available_slots()

    def get_is_available(self, obj):
        return obj.is_available()

    def get_tags_list(self, obj):
        if obj.tags:
            return [tag.strip() for tag in obj.tags.split(',')]
        return []


class EventDetailSerializer(EventSerializer):
    """Detailed event serializer with reviews."""
    reviews = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()

    class Meta(EventSerializer.Meta):
        fields = EventSerializer.Meta.fields + ['reviews', 'average_rating']

    def get_reviews(self, obj):
        reviews = obj.reviews.all()[:5]  # Last 5 reviews
        return ReviewSerializer(reviews, many=True).data

    def get_average_rating(self, obj):
        reviews = obj.reviews.all()
        if reviews:
            avg = sum(r.rating for r in reviews) / len(reviews)
            return round(avg, 2)
        return None


class BookingSerializer(serializers.ModelSerializer):
    """Serializer for bookings."""
    event_name = serializers.CharField(source='event.name', read_only=True)
    event = EventSerializer(read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'user_email', 'event', 'event_name', 'status',
            'number_of_participants', 'total_amount', 'booking_date',
            'confirmation_date', 'special_requests', 'booking_reference'
        ]
        read_only_fields = ['id', 'booking_reference', 'booking_date', 'user_email']


class CreateBookingSerializer(serializers.ModelSerializer):
    """Serializer for creating bookings."""

    class Meta:
        model = Booking
        fields = ['event', 'number_of_participants', 'special_requests']

    def create(self, validated_data):
        user = self.context['request'].user
        event = validated_data['event']
        num_participants = validated_data['number_of_participants']

        # Check availability
        if not event.is_available():
            raise serializers.ValidationError("Event is fully booked.")

        if event.available_slots() < num_participants:
            raise serializers.ValidationError(
                f"Not enough slots available. {event.available_slots()} slots remaining."
            )

        # Calculate total amount
        total_amount = event.price * num_participants

        # Create booking
        booking = Booking.objects.create(
            user=user,
            event=event,
            number_of_participants=num_participants,
            total_amount=total_amount,
            special_requests=validated_data.get('special_requests', '')
        )

        # Update event booking count
        event.current_bookings += num_participants
        event.save()

        return booking


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for reviews."""
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'user_email', 'rating', 'title', 'comment', 'created_at']
        read_only_fields = ['id', 'user_email', 'created_at']


class DestinationSerializer(serializers.ModelSerializer):
    """Serializer for destinations."""
    tags_list = serializers.SerializerMethodField()

    class Meta:
        model = Destination
        fields = [
            'id', 'name', 'location', 'description', 'destination_type',
            'image_url', 'latitude', 'longitude', 'tags', 'tags_list'
        ]

    def get_tags_list(self, obj):
        if obj.tags:
            return [tag.strip() for tag in obj.tags.split(',')]
        return []
