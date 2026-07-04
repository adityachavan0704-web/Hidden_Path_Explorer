# Events Backend - Quick Reference

## File Structure
```
ASEP/
├── events.js                      # Core API module
├── events-page.js                 # Frontend logic
├── events.html                    # Events page (updated)
├── admin-events.html              # Admin panel
├── admin-events.js                # Admin logic
├── admin.html                     # Main admin (updated)
├── firebase-config.js             # Firebase config (existing)
├── IMPLEMENTATION_SUMMARY.md      # This summary
├── EVENTS_SETUP_GUIDE.md          # Setup guide
└── EVENTS_BACKEND_README.md       # Full documentation
```

## Database Collections

### events
```
Document Fields:
- title: string
- date: string
- location: string
- price: string
- category: string
- description: string
- totalSpots: number
- bookingCount: number
- image: string
- status: string
- createdAt: timestamp
- updatedAt: timestamp
```

### bookings
```
Document Fields:
- userId: string
- userEmail: string
- eventId: string
- eventTitle: string
- eventDate: string
- eventLocation: string
- eventPrice: string
- bookingDate: timestamp
- numberOfTickets: number
- status: string ("confirmed", "cancelled")
- totalPrice: string
- specialRequests: string
```

## API Reference

### Event Functions

**Fetch Events**
```javascript
import { fetchAllEvents } from './events.js';
const events = await fetchAllEvents();
```

**Listen to Events**
```javascript
import { listenToEvents } from './events.js';
const unsubscribe = listenToEvents((events) => {
  console.log(events);
});
```

**Get Single Event**
```javascript
import { fetchEventById } from './events.js';
const event = await fetchEventById(eventId);
```

### Booking Functions

**Book Event**
```javascript
import { bookEvent } from './events.js';
const result = await bookEvent(eventId, {
  numberOfTickets: 2,
  specialRequests: "Notes"
});
```

**Get User Bookings**
```javascript
import { getUserBookings } from './events.js';
const bookings = await getUserBookings();
```

**Listen to Bookings**
```javascript
import { listenToUserBookings } from './events.js';
listenToUserBookings((bookings) => {
  console.log(bookings);
});
```

**Cancel Booking**
```javascript
import { cancelBooking } from './events.js';
const result = await cancelBooking(bookingId);
```

### Admin Functions

**Create Event** (Admin only)
```javascript
import { createEvent } from './events.js';
const result = await createEvent({
  title: "Event Name",
  date: "Date",
  location: "Location",
  price: "₹500",
  category: "Category",
  totalSpots: 100,
  description: "Description",
  image: "URL"
});
```

**Update Event** (Admin only)
```javascript
import { updateEvent } from './events.js';
const result = await updateEvent(eventId, {
  title: "New Title",
  totalSpots: 150
});
```

**Delete Event** (Admin only)
```javascript
import { deleteEvent } from './events.js';
const result = await deleteEvent(eventId);
```

**Get Event Bookings** (Admin only)
```javascript
import { getEventBookings } from './events.js';
const bookings = await getEventBookings(eventId);
```

**Get All Bookings** (Admin only)
```javascript
import { getAllBookings } from './events.js';
const allBookings = await getAllBookings();
```

**Get Statistics** (Admin only)
```javascript
import { getEventStatistics } from './events.js';
const stats = await getEventStatistics();
```

## Page URLs

| Page | URL | Purpose |
|------|-----|---------|
| Events | `/events.html` | View and book events |
| Admin Events | `/admin-events.html` | Manage events |
| Admin Main | `/admin.html` | Manage alerts |

## Response Format

All async functions return:
```javascript
{
  success: boolean,
  error?: string,
  [data]: any  // Additional data depends on function
}
```

Example:
```javascript
const result = await bookEvent(eventId, details);
if (result.success) {
  console.log('Booking ID:', result.bookingId);
} else {
  console.error('Error:', result.error);
}
```

## Frontend Components

### events-page.js Exports
Functions available to HTML and other scripts:
- `initializeEventsPage()` - Initializes page
- `loadAndDisplayEvents()` - Loads and renders events
- `showBookingModal()` - Shows booking interface
- `renderUserBookings()` - Shows user's bookings
- `scrollToBookings()` - Scrolls to booking section

### admin-events.js Exports
Admin page functionality (auto-initialized on page load):
- `checkAdminAccess()` - Verifies admin access
- `switchTab()` - Switches between tabs
- `loadDashboard()` - Loads statistics
- `loadEvents()` - Loads event list
- `loadBookings()` - Loads booking table

## Authentication

**Admin User:**
- Email: `admin@hiddenpath.com`
- Can access admin panel
- Can manage events and bookings

**Regular User:**
- Any authenticated user
- Can view events
- Can book events
- Can view own bookings

**Guest:**
- Cannot book events
- Can view events
- Redirected to login on booking attempt

## Security Rules

```
- Events: Public read, admin write
- Bookings: Users read own, admins read all
- Users can only cancel own bookings
```

## Modal Functions

Available in event pages:
```javascript
// Show simple modal
showModal(title, message, [
  { text: "Button", action: () => {} }
]);

// Show confirm modal
showConfirmModal(title, message, confirmCallback);

// Close modal
closeModal();
```

## Real-Time Updates

Events page automatically updates when:
- Events are created/edited/deleted
- Bookings are made/cancelled
- Admin changes event details

No manual refresh needed!

## Error Handling

Common errors:
- `"User must be logged in to book an event"` - Login required
- `"Event is fully booked"` - No spots available
- `"Event not found"` - Invalid event ID
- `"Admin privileges required"` - Not authorized

Check browser console for detailed error messages.

## Testing URLs

1. **Local Testing:**
   - `file:///.../events.html` (for static testing)
   - Run through live server for full functionality

2. **Live Testing:**
   - Test on deployment URL
   - Test on multiple browsers
   - Test on mobile devices

## Keyboard Shortcuts

None currently implemented, but:
- Press `Tab` to navigate forms
- Press `Enter` to submit forms
- Press `Esc` to close modals (future)

## Browser DevTools Tips

**Check Events:**
```javascript
firebase.firestore().collection('events').get().then(snap => {
  console.log(snap.docs.map(d => ({id: d.id, ...d.data()})));
});
```

**Check Bookings:**
```javascript
firebase.firestore().collection('bookings').get().then(snap => {
  console.log(snap.docs.map(d => ({id: d.id, ...d.data()})));
});
```

**Check Auth State:**
```javascript
firebase.auth().onAuthStateChanged(user => {
  console.log('Current user:', user?.email);
});
```

## Performance Tips

1. Events load lazily from Firestore
2. Real-time listeners only on active pages
3. Images use CDN URLs
4. Minimal DOM manipulation
5. Efficient event delegation

## Accessibility

- Semantic HTML
- Keyboard navigation support
- ARIA labels on important elements
- Color contrast compliant
- Screen reader friendly

## Known Limitations

1. No pagination (future enhancement)
2. No image upload (use external URLs)
3. No multi-language support yet
4. No offline mode
5. No payment integration yet

## Future Enhancements

- [ ] Payment integration (Stripe/Razorpay)
- [ ] Email confirmations
- [ ] SMS notifications
- [ ] Waitlist for full events
- [ ] User reviews
- [ ] Event categories filter
- [ ] Search functionality
- [ ] Analytics dashboard
- [ ] Refund system
- [ ] Event tickets/QR codes

## Support Contacts

For issues:
1. Check `EVENTS_BACKEND_README.md`
2. Check `EVENTS_SETUP_GUIDE.md`
3. Review browser console
4. Check Firestore logs
5. Test with sample data first

## Version Info

- **Created:** January 18, 2026
- **Status:** Production Ready
- **Firebase SDK:** 12.7.0
- **Tested On:** Chrome, Firefox, Safari, Edge

---

**Everything is ready to use!** Refer to setup guide to get started.
