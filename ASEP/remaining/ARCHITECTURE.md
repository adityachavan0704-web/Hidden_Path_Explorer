# Events Backend - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HiddenPath Explorer Website                  │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  events.html (User View)      admin-events.html (Admin View)     │
│  ├─ Event Display             ├─ Dashboard Stats                 │
│  ├─ Booking Modal             ├─ Event Management                │
│  └─ My Bookings               ├─ Bookings Table                  │
│       (events-page.js)        └─ (admin-events.js)               │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                                    ↓
┌───────────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│                       events.js (Core API)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Event Functions    Booking Functions   Admin Funcs   │    │
│  │  ─────────────────  ─────────────────   ────────────  │    │
│  │  • fetch All        • book Event        • create      │    │
│  │  • fetch By ID      • get Bookings      • update      │    │
│  │  • listen Events    • cancel Booking    • delete      │    │
│  │  • get Count        • listen Bookings   • get Stats   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                                    ↓
┌───────────────────────────────────────────────────────────────────┐
│                    Data Access Layer                              │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│              Firebase Firestore Collections                       │
│  ┌──────────────────────┐      ┌──────────────────────┐          │
│  │    events            │      │    bookings          │          │
│  ├──────────────────────┤      ├──────────────────────┤          │
│  │ • title              │      │ • userId             │          │
│  │ • date               │      │ • eventId            │          │
│  │ • location           │      │ • numberOfTickets    │          │
│  │ • price              │      │ • status             │          │
│  │ • category           │      │ • bookingDate        │          │
│  │ • totalSpots         │      │ • totalPrice         │          │
│  │ • bookingCount       │      │ • specialRequests    │          │
│  │ • createdAt          │      │                      │          │
│  │ • updatedAt          │      │                      │          │
│  └──────────────────────┘      └──────────────────────┘          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                                    ↓
┌───────────────────────────────────────────────────────────────────┐
│                    Firebase Services                              │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Firebase Config → Authentication → Firestore Database          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### User Booking Flow

```
User Views Events
       ↓
(events-page.js) loadAndDisplayEvents()
       ↓
(events.js) fetchAllEvents()
       ↓
[Firestore] Get events collection
       ↓
Display Event Cards
       ↓
User Clicks "Book Now"
       ↓
Check Authentication
       ↓ (Not logged in)
Redirect to Login
       ↓ (Logged in)
Show Booking Modal
       ↓
User Confirms
       ↓
(events-page.js) bookEvent()
       ↓
(events.js) bookEvent()
       ↓
[Firestore] Create booking document
       ↓
[Firestore] Update event bookingCount
       ↓
Show Confirmation
       ↓
Update My Bookings Section
```

### Admin Event Management Flow

```
Admin Logs In (admin@hiddenpath.com)
       ↓
Navigate to admin-events.html
       ↓
(admin-events.js) checkAdminAccess()
       ↓
Verify Admin Email
       ↓ (Not admin)
Redirect to Login
       ↓ (Is admin)
Load Dashboard
       ↓
(events.js) getEventStatistics()
       ↓
[Firestore] Query events & bookings
       ↓
Display Statistics
       ↓
Set Up Real-Time Listeners
       ↓
Admin Clicks "Add Event"
       ↓
Show Event Form Modal
       ↓
Admin Fills Form & Submits
       ↓
(admin-events.js) handleEventFormSubmit()
       ↓
(events.js) createEvent()
       ↓
[Firestore] Add event document
       ↓
(events-page.js) listenToEvents()
       ↓
Events Update in Real-Time
       ↓
Show Success Message
```

## Real-Time Update Architecture

```
┌──────────────────────────────┐
│     User 1 (Events Page)     │
│  listenToEvents()            │
└──────────────┬───────────────┘
               │
               │ Real-time listener
               ↓
┌──────────────────────────────┐
│      Firestore Database      │
│      events collection       │
│      bookings collection     │
└──────────────┬───────────────┘
               │
               │ Changes trigger
               ↓
┌──────────────────────────────┐
│     User 2 (Admin Panel)     │
│  listenToEvents()            │
└──────────────────────────────┘

Result: Both users see updates instantly!
```

## Component Interaction Map

```
                    ┌─────────────────┐
                    │  events.html    │
                    │  (User View)    │
                    └────────┬────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │ events-page.js  │
                    │  (Frontend)     │
                    └────────┬────────┘
                             │
                    ┌────────┴─────────┐
                    ↓                  ↓
            ┌──────────────┐   ┌──────────────┐
            │ events.js    │   │ script.js    │
            │ (Core API)   │   │ (Utils)      │
            └──────┬───────┘   └──────────────┘
                   │
                   ↓
          ┌────────────────────┐
          │ firebase-config.js │
          │ (Firebase Init)    │
          └────────┬───────────┘
                   │
                   ↓
          ┌────────────────────┐
          │ Firebase Services  │
          │ - Auth             │
          │ - Firestore        │
          └────────────────────┘

AND

                ┌─────────────────────────┐
                │ admin-events.html       │
                │ (Admin Dashboard)       │
                └────────┬────────────────┘
                         │
                         ↓
                ┌─────────────────────────┐
                │ admin-events.js         │
                │ (Admin Logic)           │
                └────────┬────────────────┘
                         │
                         ↓
                ┌─────────────────────────┐
                │ events.js (Admin APIs)  │
                │ - createEvent()         │
                │ - updateEvent()         │
                │ - deleteEvent()         │
                │ - getEventStatistics()  │
                └────────┬────────────────┘
                         │
                         ↓
                ┌─────────────────────────┐
                │ Firebase Firestore      │
                │ - events collection     │
                │ - bookings collection   │
                └─────────────────────────┘
```

## Authentication & Authorization Flow

```
┌────────────────────────────────┐
│  Firebase Authentication       │
│  (email + password)            │
└────────────┬───────────────────┘
             │
        ┌────┴─────┐
        ↓          ↓
   ┌─────────┐ ┌──────────────┐
   │ Regular │ │ Admin User   │
   │  User   │ │ (special)    │
   └────┬────┘ └──────┬───────┘
        │             │
        ↓             ↓
  Can Book     Can Manage
  Can View     Can Delete
  Can Cancel   Can Stats
```

## Module Dependency Graph

```
admin-events.html
       ↓
admin-events.js ─────┐
                     │
                     ├─→ events.js ─→ firebase-config.js
                     │                      ↓
events.html          │              Firebase SDK
       ↓             │              (Auth, Firestore)
events-page.js ──────┴─→ events.js
       ↓                     ↑
    script.js ──────────────┘
       ↓
firebase-config.js
```

## Database Query Patterns

```
1. Fetch All Events
   Firestore Query: collection('events').get()
   Listeners: onSnapshot(collection('events'))

2. Get User Bookings
   Firestore Query: collection('bookings')
                   .where('userId', '==', currentUser.uid)
   Listeners: onSnapshot(query, ...)

3. Get Event Bookings (Admin)
   Firestore Query: collection('bookings')
                   .where('eventId', '==', eventId)

4. Check Availability
   Count: bookingCount vs totalSpots
```

## Real-Time Synchronization Flow

```
Database Change
       ↓
Firestore Listener Triggered
       ↓
Callback Function Called
       ↓
┌─────────────────────────────────────┐
│ Example: listenToEvents()           │
│ New events array created            │
│ renderEvents() called               │
│ DOM updated                         │
│ All instances see update            │
└─────────────────────────────────────┘
       ↓
User Sees Updated Information
No Refresh Needed!
```

## Security Architecture

```
┌──────────────────────────────────┐
│   Public Access (Read)           │
├──────────────────────────────────┤
│ - View events collection         │
│ - List all events               │
└──────────────────────────────────┘
       ↓
┌──────────────────────────────────┐
│   Authenticated User Access      │
├──────────────────────────────────┤
│ - Read own bookings              │
│ - Create bookings                │
│ - Update own bookings            │
│ - Delete own bookings            │
└──────────────────────────────────┘
       ↓
┌──────────────────────────────────┐
│   Admin-Only Access              │
├──────────────────────────────────┤
│ Email: admin@hiddenpath.com      │
│ - Create events                  │
│ - Update events                  │
│ - Delete events                  │
│ - View all bookings              │
│ - View statistics                │
└──────────────────────────────────┘
```

## Error Handling Flow

```
User Action
       ↓
Try {
  Execute Operation (API call)
       ↓
  Catch Error
}
       ↓
┌──────────────────────────┐
│  Error Type Check        │
├──────────────────────────┤
│ • Network Error          │
│ • Auth Error             │
│ • Validation Error       │
│ • Database Error         │
│ • Permission Error       │
└──────────────────┬───────┘
                   ↓
            Log to Console
                   ↓
         Display User Message
                   ↓
        User Sees Error Alert
```

## Performance Considerations

```
Initial Load
├─ Fetch Events (optimized query)
├─ Display Cards (efficient DOM)
└─ Set Up Listeners (memory-safe)

Real-Time Updates
├─ Listener triggered on change
├─ Only affected components update
└─ No full page refresh

Booking Process
├─ Form validation (client-side)
├─ Single Firestore write
├─ Single event update
└─ Instant UI refresh

Admin Dashboard
├─ Lazy load statistics
├─ Real-time listener for updates
└─ No polling required
```

---

## Summary

This architecture provides:
✅ Scalable design
✅ Real-time synchronization
✅ Clean separation of concerns
✅ Secure access control
✅ Efficient data flow
✅ Error handling
✅ Performance optimization

All integrated with Firebase for reliability and security.
