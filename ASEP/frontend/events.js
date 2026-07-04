// events.js - Backend for Events Management System
// Handles event bookings, user bookings, and admin event management

import { auth, db } from './firebase-config.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDoc,
  onSnapshot,
  Timestamp 
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// =========================
// EVENT MANAGEMENT FUNCTIONS
// =========================

/**
 * Fetch all events from Firestore
 * @returns {Promise<Array>} Array of event objects
 */
export async function fetchAllEvents() {
  try {
    const eventsCollection = collection(db, 'events');
    const eventsSnapshot = await getDocs(eventsCollection);
    const events = eventsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      bookingCount: doc.data().bookingCount || 0
    }));
    return events;
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}

/**
 * Fetch real-time updates for events
 * @param {Function} callback - Function to call when events update
 */
export function listenToEvents(callback) {
  const eventsCollection = collection(db, 'events');
  return onSnapshot(eventsCollection, (snapshot) => {
    const events = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    callback(events);
  }, (error) => {
    console.error('Failed to listen to events:', error);
  });
}

/**
 * Fetch a single event by ID
 * @param {string} eventId - Event document ID
 * @returns {Promise<Object>} Event object
 */
export async function fetchEventById(eventId) {
  try {
    const eventDoc = await getDoc(doc(db, 'events', eventId));
    if (eventDoc.exists()) {
      return { id: eventDoc.id, ...eventDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return null;
  }
}

// =========================
// BOOKING FUNCTIONS
// =========================

/**
 * Book an event for the current user
 * @param {string} eventId - Event document ID
 * @param {Object} bookingDetails - Details of the booking
 * @returns {Promise<Object>} Booking confirmation
 */
export async function bookEvent(eventId, bookingDetails = {}) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be logged in to book an event');
    }

    const event = await fetchEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Check if event has available spots
    const bookedCount = await getEventBookingCount(eventId);
    if (bookedCount >= event.totalSpots) {
      throw new Error('Event is fully booked');
    }

    // Create booking record
    const bookingData = {
      userId: user.uid,
      userEmail: user.email,
      eventId: eventId,
      eventTitle: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      eventPrice: event.price,
      bookingDate: Timestamp.now(),
      numberOfTickets: bookingDetails.numberOfTickets || 1,
      status: 'confirmed',
      totalPrice: calculateTotalPrice(event.price, bookingDetails.numberOfTickets || 1),
      specialRequests: bookingDetails.specialRequests || ''
    };

    const bookingsCollection = collection(db, 'bookings');
    const bookingDoc = await addDoc(bookingsCollection, bookingData);

    // Update event booking count
    const eventDocRef = doc(db, 'events', eventId);
    await updateDoc(eventDocRef, {
      bookingCount: (event.bookingCount || 0) + (bookingDetails.numberOfTickets || 1)
    });

    console.log('Booking successful:', bookingDoc.id);
    return {
      success: true,
      bookingId: bookingDoc.id,
      ...bookingData
    };
  } catch (error) {
    console.error('Booking failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get count of bookings for an event
 * @param {string} eventId - Event document ID
 * @returns {Promise<number>} Number of bookings
 */
export async function getEventBookingCount(eventId) {
  try {
    const bookingsCollection = collection(db, 'bookings');
    const q = query(bookingsCollection, where('eventId', '==', eventId));
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Failed to get booking count:', error);
    return 0;
  }
}

/**
 * Fetch user's bookings
 * @param {string} userId - User ID (optional, uses current user if not provided)
 * @returns {Promise<Array>} Array of booking objects
 */
export async function getUserBookings(userId = null) {
  try {
    const user = userId ? null : auth.currentUser;
    const targetUserId = userId || user?.uid;

    if (!targetUserId) {
      throw new Error('No user ID provided and user not logged in');
    }

    const bookingsCollection = collection(db, 'bookings');
    const q = query(bookingsCollection, where('userId', '==', targetUserId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
  } catch (error) {
    console.error('Failed to fetch user bookings:', error);
    return [];
  }
}

/**
 * Listen to user's bookings in real-time
 * @param {Function} callback - Function to call with bookings
 * @returns {Function} Unsubscribe function
 */
export function listenToUserBookings(callback) {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      const bookingsCollection = collection(db, 'bookings');
      const q = query(bookingsCollection, where('userId', '==', user.uid));
      
      onSnapshot(q, (snapshot) => {
        const bookings = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        callback(bookings);
      });
    } else {
      callback([]);
    }
  });
  
  return unsubscribe;
}

/**
 * Cancel a booking
 * @param {string} bookingId - Booking document ID
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelBooking(bookingId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be logged in');
    }

    // Get booking details
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    if (!bookingDoc.exists()) {
      throw new Error('Booking not found');
    }

    const bookingData = bookingDoc.data();
    
    // Verify ownership
    if (bookingData.userId !== user.uid) {
      throw new Error('Unauthorized: Cannot cancel another user\'s booking');
    }

    // Update booking status
    await updateDoc(doc(db, 'bookings', bookingId), {
      status: 'cancelled'
    });

    // Update event booking count
    const eventDocRef = doc(db, 'events', bookingData.eventId);
    const eventData = await getDoc(eventDocRef);
    if (eventData.exists()) {
      const currentCount = eventData.data().bookingCount || 0;
      await updateDoc(eventDocRef, {
        bookingCount: Math.max(0, currentCount - (bookingData.numberOfTickets || 1))
      });
    }

    return { success: true, message: 'Booking cancelled successfully' };
  } catch (error) {
    console.error('Failed to cancel booking:', error);
    return { success: false, error: error.message };
  }
}

// =========================
// ADMIN FUNCTIONS
// =========================

/**
 * Create a new event (Admin only)
 * @param {Object} eventData - Event details
 * @returns {Promise<Object>} Creation result
 */
export async function createEvent(eventData) {
  try {
    const user = auth.currentUser;
    if (!user || user.email !== 'admin@hiddenpath.com') {
      throw new Error('Admin privileges required');
    }

    const eventWithDefaults = {
      title: eventData.title,
      date: eventData.date,
      location: eventData.location,
      price: eventData.price,
      category: eventData.category || 'General',
      description: eventData.description || '',
      totalSpots: eventData.totalSpots || 50,
      bookingCount: 0,
      image: eventData.image || 'https://via.placeholder.com/300x200',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'active'
    };

    const eventsCollection = collection(db, 'events');
    const newEvent = await addDoc(eventsCollection, eventWithDefaults);

    return {
      success: true,
      eventId: newEvent.id,
      ...eventWithDefaults
    };
  } catch (error) {
    console.error('Failed to create event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an event (Admin only)
 * @param {string} eventId - Event document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Update result
 */
export async function updateEvent(eventId, updates) {
  try {
    const user = auth.currentUser;
    if (!user || user.email !== 'admin@hiddenpath.com') {
      throw new Error('Admin privileges required');
    }

    const eventDocRef = doc(db, 'events', eventId);
    await updateDoc(eventDocRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });

    return { success: true, message: 'Event updated successfully' };
  } catch (error) {
    console.error('Failed to update event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an event (Admin only)
 * @param {string} eventId - Event document ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteEvent(eventId) {
  try {
    const user = auth.currentUser;
    if (!user || user.email !== 'admin@hiddenpath.com') {
      throw new Error('Admin privileges required');
    }

    await deleteDoc(doc(db, 'events', eventId));
    return { success: true, message: 'Event deleted successfully' };
  } catch (error) {
    console.error('Failed to delete event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all bookings for an event (Admin only)
 * @param {string} eventId - Event document ID
 * @returns {Promise<Array>} Array of booking objects
 */
export async function getEventBookings(eventId) {
  try {
    const user = auth.currentUser;
    if (!user || user.email !== 'admin@hiddenpath.com') {
      throw new Error('Admin privileges required');
    }

    const bookingsCollection = collection(db, 'bookings');
    const q = query(bookingsCollection, where('eventId', '==', eventId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
  } catch (error) {
    console.error('Failed to get event bookings:', error);
    return [];
  }
}

/**
 * Get all bookings across all events (Admin only)
 * @returns {Promise<Array>} Array of all booking objects
 */
export async function getAllBookings() {
  try {
    const user = auth.currentUser;
    if (!user || user.email !== 'admin@hiddenpath.com') {
      throw new Error('Admin privileges required');
    }

    const bookingsCollection = collection(db, 'bookings');
    const snapshot = await getDocs(bookingsCollection);
    
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
  } catch (error) {
    console.error('Failed to get all bookings:', error);
    return [];
  }
}

// =========================
// UTILITY FUNCTIONS
// =========================

/**
 * Calculate total price for booking
 * @param {string|number} eventPrice - Price per ticket (can include ₹ symbol)
 * @param {number} numberOfTickets - Number of tickets
 * @returns {string} Formatted total price
 */
function calculateTotalPrice(eventPrice, numberOfTickets = 1) {
  if (eventPrice === 'Free' || eventPrice === 'free') {
    return 'Free';
  }

  const priceNum = parseInt(eventPrice.toString().replace(/[^0-9]/g, '')) || 0;
  const total = priceNum * numberOfTickets;
  
  return `₹${total}`;
}

/**
 * Format booking date to readable string
 * @param {Timestamp|Date} timestamp - Timestamp object from Firestore
 * @returns {string} Formatted date string
 */
export function formatBookingDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Check if user has available spots for an event
 * @param {string} eventId - Event document ID
 * @param {number} requiredSpots - Number of spots needed
 * @returns {Promise<boolean>} True if spots available
 */
export async function hasAvailableSpots(eventId, requiredSpots = 1) {
  try {
    const event = await fetchEventById(eventId);
    if (!event) return false;

    const bookedCount = await getEventBookingCount(eventId);
    const available = event.totalSpots - bookedCount;

    return available >= requiredSpots;
  } catch (error) {
    console.error('Failed to check available spots:', error);
    return false;
  }
}

/**
 * Get event statistics (Admin only)
 * @returns {Promise<Object>} Statistics object
 */
export async function getEventStatistics() {
  try {
    const user = auth.currentUser;
    if (!user || user.email !== 'admin@hiddenpath.com') {
      throw new Error('Admin privileges required');
    }

    const events = await fetchAllEvents();
    const allBookings = await getAllBookings();

    const totalRevenue = allBookings.reduce((sum, booking) => {
      const priceNum = parseInt(booking.eventPrice.toString().replace(/[^0-9]/g, '')) || 0;
      return sum + priceNum * (booking.numberOfTickets || 1);
    }, 0);

    return {
      totalEvents: events.length,
      totalBookings: allBookings.length,
      totalRevenue: `₹${totalRevenue}`,
      activeEvents: events.filter(e => e.status === 'active').length,
      bookingsByStatus: {
        confirmed: allBookings.filter(b => b.status === 'confirmed').length,
        cancelled: allBookings.filter(b => b.status === 'cancelled').length
      }
    };
  } catch (error) {
    console.error('Failed to get event statistics:', error);
    return {};
  }
}
