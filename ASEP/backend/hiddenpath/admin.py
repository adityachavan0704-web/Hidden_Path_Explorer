"""
Admin interface configuration for HiddenPath models.
"""

from django.contrib import admin
from hiddenpath.models import UserProfile, Event, Booking, Review, Destination


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['get_email', 'phone', 'location', 'is_admin', 'created_at']
    list_filter = ['is_admin', 'created_at']
    search_fields = ['user__email', 'location']

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'event_type', 'current_bookings', 'max_capacity', 'price']
    list_filter = ['event_type', 'crowd_level', 'location', 'created_at']
    search_fields = ['name', 'location', 'description']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'location', 'description')
        }),
        ('Event Details', {
            'fields': ('event_type', 'crowd_level', 'best_season', 'duration_hours')
        }),
        ('Bookings & Capacity', {
            'fields': ('max_capacity', 'current_bookings', 'price')
        }),
        ('Location', {
            'fields': ('latitude', 'longitude')
        }),
        ('Additional', {
            'fields': ('image_url', 'tags')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['booking_reference', 'get_user_email', 'get_event_name', 'status', 'total_amount', 'booking_date']
    list_filter = ['status', 'booking_date', 'event__location']
    search_fields = ['booking_reference', 'user__email', 'event__name']
    readonly_fields = ['booking_reference', 'booking_date']

    def get_user_email(self, obj):
        return obj.user.email
    get_user_email.short_description = 'User Email'

    def get_event_name(self, obj):
        return obj.event.name
    get_event_name.short_description = 'Event'

    actions = ['confirm_booking', 'cancel_booking']

    def confirm_booking(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(status='pending').update(
            status='confirmed',
            confirmation_date=timezone.now()
        )
        self.message_user(request, f'{updated} bookings confirmed.')
    confirm_booking.short_description = 'Confirm selected bookings'

    def cancel_booking(self, request, queryset):
        from django.utils import timezone
        for booking in queryset:
            if booking.status != 'cancelled':
                booking.status = 'cancelled'
                booking.cancellation_date = timezone.now()
                booking.event.current_bookings -= booking.number_of_participants
                booking.event.save()
                booking.save()
        self.message_user(request, f'{queryset.count()} bookings cancelled.')
    cancel_booking.short_description = 'Cancel selected bookings'


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['get_user_email', 'get_event_name', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['user__email', 'event__name', 'title']
    readonly_fields = ['created_at', 'updated_at']

    def get_user_email(self, obj):
        return obj.user.email
    get_user_email.short_description = 'User Email'

    def get_event_name(self, obj):
        return obj.event.name
    get_event_name.short_description = 'Event'


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'destination_type']
    list_filter = ['destination_type', 'location']
    search_fields = ['name', 'location', 'description']
    readonly_fields = ['created_at', 'updated_at']
