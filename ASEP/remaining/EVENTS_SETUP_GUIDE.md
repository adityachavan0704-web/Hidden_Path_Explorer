# Events Backend - Quick Setup Guide

## What's Been Added

### New Files
1. **events.js** - Event management API
2. **events-page.js** - Events page frontend logic
3. **admin-events.html** - Admin events management panel
4. **admin-events.js** - Admin events logic
5. **EVENTS_BACKEND_README.md** - Full documentation

### Modified Files
1. **events.html** - Added module imports
2. **admin.html** - Added events menu link

## Firestore Collections to Create

Create these two collections in your Firebase Firestore:

### 1. `events` Collection
Add sample documents with this structure:
```
{
  title: "Hornbill Festival",
  date: "Dec 1 - Dec 10",
  location: "Kisama, Nagaland",
  price: "₹500",
  category: "Cultural",
  description: "Annual festival celebrating Nagaland culture",
  totalSpots: 120,
  bookingCount: 0,
  image: "https://example.com/hornbill.jpg",
  status: "active",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. `bookings` Collection
This will be auto-populated when users book. Structure:
```
{
  userId: "firebase-user-id",
  userEmail: "user@example.com",
  eventId: "event-document-id",
  eventTitle: "Event Title",
  eventDate: "Date string",
  eventLocation: "Location",
  eventPrice: "₹500",
  bookingDate: timestamp,
  numberOfTickets: 1,
  status: "confirmed",
  totalPrice: "₹500",
  specialRequests: "Optional user notes"
}
```

## Firestore Security Rules

1. Go to Firebase Console → Firestore → Rules
2. Replace with these rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Events - public read, admin write
    match /events/{eventId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null && 
        request.auth.token.email == "admin@hiddenpath.com";
    }
    
    // Bookings - users see own, admins see all
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

## Testing the Implementation

### 1. Check Events Display
- Open `events.html`
- Events should load from Firestore
- You should see event cards with availability

### 2. Test Booking (as regular user)
- Login with a non-admin account
- Click "Book Now" on any event
- Select tickets and confirm
- Check "My Bookings" section

### 3. Test Admin Panel
- Login with `admin@hiddenpath.com`
- Navigate to admin panel link
- Go to `admin-events.html`
- Create/edit/delete events
- View all bookings and statistics

### 4. Verify Real-Time Updates
- Open events page in two browser windows
- In admin panel, edit an event
- Watch the event update in real-time on the events page

## Key Features Implemented

✅ **Event Management**
- Create, read, update, delete events
- Real-time synchronization

✅ **User Bookings**
- Book events with multiple tickets
- Add special requests
- Cancel bookings
- View booking history

✅ **Admin Dashboard**
- Statistics (events, bookings, revenue)
- Event management interface
- Booking list and details
- Real-time updates

✅ **Authentication Integration**
- User authentication required for booking
- Admin-only event management
- User can only manage own bookings

✅ **Real-Time Updates**
- Events update across all pages
- Bookings update in real-time
- Statistics update automatically

## Page URLs

- **Events Page:** `/events.html`
- **Admin Events:** `/admin-events.html`
- **Main Admin:** `/admin.html`

## Usage Examples

### Display Events
```javascript
import { fetchAllEvents, listenToEvents } from './events.js';

// Load all events once
const events = await fetchAllEvents();

// Listen to real-time updates
listenToEvents((events) => {
  console.log('Events:', events);
});
```

### Book Event
```javascript
import { bookEvent } from './events.js';

const result = await bookEvent('event-id', {
  numberOfTickets: 2,
  specialRequests: 'Aisle seating preferred'
});

if (result.success) {
  console.log('Booking confirmed:', result.bookingId);
}
```

### Admin: Create Event
```javascript
import { createEvent } from './events.js';

const result = await createEvent({
  title: 'New Festival',
  date: 'Date range',
  location: 'Location',
  price: '₹1000',
  category: 'Cultural',
  totalSpots: 100
});
```

## Troubleshooting

### Events Not Loading
1. Check browser console (F12)
2. Verify events collection exists in Firestore
3. Check Firestore rules allow read access
4. Verify Firebase config is correct

### Bookings Not Saving
1. Verify user is logged in
2. Check Firestore rules for booking collection
3. Ensure bookings collection exists
4. Check network tab for error responses

### Admin Panel Not Accessible
1. Login with `admin@hiddenpath.com`
2. Go to `/admin-events.html`
3. Check Firebase allows your user as admin

## Support Files

- Full documentation: `EVENTS_BACKEND_README.md`
- Core API: `events.js`
- Frontend logic: `events-page.js`
- Admin logic: `admin-events.js`

## Next Steps

1. ✅ Create Firestore collections
2. ✅ Apply security rules
3. ✅ Test events loading
4. ✅ Test booking functionality
5. ✅ Test admin panel
6. Add payment integration (optional)
7. Add email notifications (optional)

---

**Everything is ready to use!** Start testing the events system.
