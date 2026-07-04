# HiddenPath Explorer - Events Backend Documentation

## Overview

This document describes the complete backend implementation for the Events section of the HiddenPath Explorer website. The system handles event management, user bookings, and admin operations using Firebase Firestore.

## Architecture

### Files Created/Modified

1. **events.js** - Core event management module
2. **events-page.js** - Frontend logic for events.html
3. **admin-events.html** - Admin panel for event management
4. **admin-events.js** - Admin event management logic
5. **events.html** - Updated to include backend integration

## Database Schema

### Collections

#### `events` Collection
```javascript
{
  id: string (document ID),
  title: string,
  date: string,
  location: string,
  price: string,
  category: string,
  description: string,
  totalSpots: number,
  bookingCount: number,
  image: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  status: string ("active" | "inactive")
}
```

#### `bookings` Collection
```javascript
{
  id: string (document ID),
  userId: string,
  userEmail: string,
  eventId: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  eventPrice: string,
  bookingDate: Timestamp,
  numberOfTickets: number,
  status: string ("confirmed" | "cancelled"),
  totalPrice: string,
  specialRequests: string
}
```

## Core Functions

### events.js - Public API

#### Event Fetching
```javascript
// Fetch all events
const events = await fetchAllEvents();

// Listen to events in real-time
const unsubscribe = listenToEvents((events) => {
  console.log('Events updated:', events);
});

// Fetch single event
const event = await fetchEventById(eventId);
```

#### Booking Functions
```javascript
// Book an event
const result = await bookEvent(eventId, {
  numberOfTickets: 2,
  specialRequests: "I need aisle seating"
});

// Get user's bookings
const bookings = await getUserBookings();

// Cancel a booking
const result = await cancelBooking(bookingId);

// Listen to user bookings in real-time
listenToUserBookings((bookings) => {
  // Update UI with bookings
});
```

#### Admin Functions (Require admin@hiddenpath.com)
```javascript
// Create event
const result = await createEvent({
  title: "Hornbill Festival",
  date: "Dec 1 - Dec 10",
  location: "Kisama, Nagaland",
  price: "₹500",
  category: "Cultural",
  description: "...",
  totalSpots: 100,
  image: "https://..."
});

// Update event
const result = await updateEvent(eventId, {
  title: "Updated Title",
  totalSpots: 150
});

// Delete event
const result = await deleteEvent(eventId);

// Get event bookings
const bookings = await getEventBookings(eventId);

// Get all bookings
const allBookings = await getAllBookings();

// Get statistics
const stats = await getEventStatistics();
```

## Frontend Implementation

### events-page.js Features

1. **Event Display**
   - Real-time event loading from Firestore
   - Dynamic event cards with availability indicators
   - Sorted out events are disabled

2. **Booking System**
   - Modal-based booking interface
   - Ticket quantity selector
   - Special requests field
   - Price calculation
   - Booking confirmation with ID

3. **User Bookings**
   - View all confirmed and cancelled bookings
   - Cancel bookings with confirmation
   - Real-time updates
   - Booking details display

4. **Authentication**
   - Required login for booking
   - Admin-only features
   - User-specific booking access

### Admin Events Management

#### admin-events.html Features

1. **Dashboard**
   - Total events count
   - Total bookings count
   - Confirmed bookings count
   - Total revenue

2. **Events Tab**
   - List all events
   - Create new events
   - Edit event details
   - Delete events
   - View booking progress
   - Real-time updates

3. **Bookings Tab**
   - View all bookings across all events
   - Booking details table
   - Filter by status
   - User information
   - Revenue tracking

## User Flows

### Customer Booking Flow

```
1. User views events page
2. Events load from Firestore (real-time)
3. User clicks "Book Now"
4. System checks authentication
5. If not logged in → Redirect to login
6. If logged in → Show booking modal
7. User selects number of tickets
8. User enters special requests (optional)
9. User confirms booking
10. System creates booking record in Firestore
11. Event bookingCount updated
12. User receives booking confirmation with ID
13. Booking appears in "My Bookings" section
```

### Admin Event Management Flow

```
1. Admin navigates to admin-events.html
2. System verifies admin privileges
3. Dashboard statistics load
4. Admin can:
   - View all events with booking status
   - Create new events
   - Edit existing events
   - Delete events
   - View all bookings
   - Track revenue
```

## Security

### Authentication
- Uses Firebase Authentication
- Admin email: `admin@hiddenpath.com`
- Only admins can create/edit/delete events
- Users must be logged in to book

### Authorization
- Admin-only functions check user email
- Users can only view/cancel their own bookings
- Event deletion only available to admins

### Data Validation
- Required fields checked before submission
- Price calculations handled safely
- Timestamp management via Firestore

## Real-Time Features

The system uses Firestore's real-time listeners:

```javascript
// Events update automatically across all tabs
listenToEvents((events) => {
  // Called whenever events are added/updated/deleted
});

// User bookings update in real-time
listenToUserBookings((bookings) => {
  // Called whenever user's bookings change
});
```

## Error Handling

All functions return structured responses:

```javascript
{
  success: boolean,
  error?: string,
  [data]: any
}
```

Example usage:
```javascript
const result = await bookEvent(eventId, bookingDetails);
if (result.success) {
  console.log('Booking ID:', result.bookingId);
} else {
  console.error('Error:', result.error);
}
```

## Integration with Existing Pages

### events.html
- Links to `events.js` and `events-page.js`
- Displays events from Firestore
- Users can book events
- Shows user's bookings

### admin.html
- Added link to `admin-events.html`
- Menu bar for navigation between alerts and events

### Authentication
- Uses existing Firebase config
- Integrates with `firebase-config.js`
- Works with existing auth system

## Firestore Rules (Recommended)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Events - readable by all, writable by admins
    match /events/{eventId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null && 
        request.auth.token.email == "admin@hiddenpath.com";
    }

    // Bookings - users see only their own, admins see all
    match /bookings/{bookingId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId ||
         request.auth.token.email == "admin@hiddenpath.com");
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## Testing

### Test Event Data

Use the admin panel to create test events:

1. **Hornbill Festival**
   - Category: Cultural
   - Date: Dec 1 - Dec 10
   - Location: Kisama, Nagaland
   - Price: ₹500
   - Spots: 120

2. **Tawang Monastery Prayer**
   - Category: Spiritual
   - Date: Daily, 4:00 AM
   - Location: Tawang, Arunachal
   - Price: Free
   - Spots: 50

3. **Dzukou Valley Trek**
   - Category: Adventure
   - Date: Next Weekend
   - Location: Nagaland Border
   - Price: ₹1200
   - Spots: 15

### Testing Bookings

1. Login as regular user
2. Go to events.html
3. Click "Book Now" on any event
4. Select number of tickets
5. Confirm booking
6. Check "My Bookings" section
7. Try to cancel a booking

### Testing Admin Features

1. Login as admin (admin@hiddenpath.com)
2. Navigate to admin-events.html
3. Test creating, editing, deleting events
4. View all bookings
5. Check statistics update in real-time

## Future Enhancements

1. **Payment Integration**
   - Integrate Stripe or Razorpay
   - Handle payment verification
   - Generate invoices

2. **Email Notifications**
   - Confirmation emails on booking
   - Reminder emails
   - Cancellation receipts

3. **Advanced Filtering**
   - Filter events by category
   - Filter by date range
   - Filter by price
   - Search functionality

4. **Waitlist System**
   - Queue users when events are full
   - Automatic notification when spots open

5. **Review System**
   - User reviews for events
   - Rating system
   - Review moderation

6. **Analytics**
   - Event popularity metrics
   - Booking trends
   - Revenue analytics
   - User demographics

## Troubleshooting

### Events not loading
- Check Firebase Firestore connection
- Verify events collection exists
- Check browser console for errors

### Bookings not saving
- Verify user is authenticated
- Check Firestore rules
- Ensure bookings collection is created
- Check network tab in dev tools

### Real-time updates not working
- Verify `listenToEvents` is called
- Check browser console for listener errors
- Ensure Firestore is properly initialized

### Admin features not accessible
- Verify login email is `admin@hiddenpath.com`
- Check authentication state
- Review Firestore security rules

## Support

For issues or questions:
1. Check browser console for error messages
2. Review Firestore logs in Firebase Console
3. Verify Firebase configuration in `firebase-config.js`
4. Check user authentication status

---

**Last Updated:** January 18, 2026
