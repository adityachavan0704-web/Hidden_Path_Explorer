"""
API Views for HiddenPath Explorer.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.contrib.auth.models import User
from hiddenpath.models import Event, Booking, Review, Destination, UserProfile
from hiddenpath.serializers import (
    EventSerializer, EventDetailSerializer, BookingSerializer,
    CreateBookingSerializer, ReviewSerializer, DestinationSerializer,
    UserSerializer, UserProfileSerializer
)


class EventViewSet(viewsets.ModelViewSet):
    """ViewSet for Event management."""
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['location', 'event_type', 'crowd_level']
    search_fields = ['name', 'location', 'description']
    ordering_fields = ['created_at', 'price', 'current_bookings']

    def get_serializer_class(self):
        """Use detailed serializer for retrieve action."""
        if self.action == 'retrieve':
            return EventDetailSerializer
        return EventSerializer

    def get_queryset(self):
        """Filter events based on query parameters."""
        queryset = Event.objects.all()

        # Search filter
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(location__icontains=search) |
                Q(description__icontains=search)
            )

        # Location filter
        location = self.request.query_params.get('location', None)
        if location:
            queryset = queryset.filter(location__icontains=location)

        # Type filter
        event_type = self.request.query_params.get('type', None)
        if event_type:
            queryset = queryset.filter(event_type=event_type)

        # Availability filter
        available_only = self.request.query_params.get('available_only', False)
        if available_only:
            queryset = queryset.exclude(current_bookings__gte=Event.objects.get(pk=queryset.first().pk).max_capacity)

        return queryset

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def book(self, request, pk=None):
        """Book an event."""
        event = self.get_object()
        serializer = CreateBookingSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            booking = serializer.save()
            return Response(
                BookingSerializer(booking).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        """Get reviews for an event."""
        event = self.get_object()
        reviews = event.reviews.all()
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get popular events (by booking count)."""
        events = Event.objects.all().order_by('-current_bookings')[:10]
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """Get all unique locations."""
        locations = Event.objects.values_list('location', flat=True).distinct()
        return Response(list(locations))


class BookingViewSet(viewsets.ModelViewSet):
    """ViewSet for Booking management."""
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own bookings, admins see all."""
        if self.request.user.is_staff:
            return Booking.objects.all()
        return Booking.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def confirm(self, request, pk=None):
        """Confirm a booking (admin only)."""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only admins can confirm bookings.'},
                status=status.HTTP_403_FORBIDDEN
            )

        booking = self.get_object()
        booking.status = 'confirmed'
        booking.confirmation_date = timezone.now()
        booking.save()
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def cancel(self, request, pk=None):
        """Cancel a booking."""
        booking = self.get_object()

        # Check permission
        if booking.user != request.user and not request.user.is_staff:
            return Response(
                {'detail': 'You can only cancel your own bookings.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if booking.status == 'cancelled':
            return Response(
                {'detail': 'Booking is already cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update booking
        booking.status = 'cancelled'
        booking.cancellation_date = timezone.now()
        booking.save()

        # Update event booking count
        booking.event.current_bookings -= booking.number_of_participants
        booking.event.save()

        return Response(BookingSerializer(booking).data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get booking statistics (admin only)."""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Only admins can view statistics.'},
                status=status.HTTP_403_FORBIDDEN
            )

        total_bookings = Booking.objects.count()
        confirmed_bookings = Booking.objects.filter(status='confirmed').count()
        pending_bookings = Booking.objects.filter(status='pending').count()
        cancelled_bookings = Booking.objects.filter(status='cancelled').count()

        return Response({
            'total_bookings': total_bookings,
            'confirmed': confirmed_bookings,
            'pending': pending_bookings,
            'cancelled': cancelled_bookings,
        })


class ReviewViewSet(viewsets.ModelViewSet):
    """ViewSet for Review management."""
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        """Automatically set the user to the current user."""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def my_reviews(self, request):
        """Get user's own reviews."""
        reviews = Review.objects.filter(user=request.user)
        serializer = self.get_serializer(reviews, many=True)
        return Response(serializer.data)


class DestinationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Destinations (read-only for now)."""
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """Get all unique destination locations."""
        locations = Destination.objects.values_list('location', flat=True).distinct()
        return Response(list(locations))


# Non-viewset API views for specific operations

from django.utils import timezone

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_bookings(request):
    """Get current user's bookings."""
    bookings = Booking.objects.filter(user=request.user).order_by('-booking_date')
    serializer = BookingSerializer(bookings, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_profile(request):
    """Get current user's profile."""
    user = request.user
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=user)

    serializer = UserProfileSerializer(profile)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def add_review(request):
    """Add a review for an event."""
    serializer = ReviewSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
