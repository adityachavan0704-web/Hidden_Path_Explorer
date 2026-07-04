// events-page.js - Events Page Frontend Logic
// Handles displaying events, booking functionality, and user's bookings

import { 
  fetchAllEvents, 
  bookEvent, 
  getUserBookings,
  listenToEvents,
  listenToUserBookings,
  cancelBooking,
  hasAvailableSpots,
  formatBookingDate
} from './events.js';
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// Initialize page when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  initializeEventsPage();
});

/**
 * Initialize events page functionality
 */
function initializeEventsPage() {
  // Load and display events
  loadAndDisplayEvents();
  
  // Set up real-time updates
  setupRealtimeEventUpdates();
  
  // Load user bookings if authenticated
  checkAuthAndLoadBookings();
  
  // Initialize icon system
  initializeIcons();
}

/**
 * Initialize Lucide icons
 */
function initializeIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

/**
 * Load and display all events
 */
async function loadAndDisplayEvents() {
  try {
    const events = await fetchAllEvents();
    renderEvents(events);
  } catch (error) {
    console.error('Failed to load events:', error);
    showErrorMessage('Failed to load events. Please refresh the page.');
  }
}

/**
 * Render events to the page
 * @param {Array} events - Array of event objects
 */
function renderEvents(events) {
  const container = document.querySelector('.grid.lg\\:grid-cols-3');
  
  if (!container) {
    console.warn('Events container not found');
    return;
  }

  if (events.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i data-lucide="calendar-x" class="w-12 h-12 mx-auto mb-4 text-stone-400"></i>
        <p class="text-stone-600">No events available at the moment.</p>
      </div>
    `;
    initializeIcons();
    return;
  }

  container.innerHTML = events.map(event => createEventCard(event)).join('');
  
  // Attach event listeners to book buttons
  attachBookingListeners();
  
  initializeIcons();
}

/**
 * Create HTML card for an event
 * @param {Object} event - Event object
 * @returns {string} HTML card markup
 */
function createEventCard(event) {
  const spotsRemaining = (event.totalSpots || 50) - (event.bookingCount || 0);
  const spotsLow = spotsRemaining <= 5;
  const isSoldOut = spotsRemaining <= 0;

  return `
    <div class="bg-white border border-stone-200 rounded-2xl overflow-hidden hover:border-emerald-500/50 hover:shadow-lg transition-all">
      <div class="bg-emerald-50 h-32 flex items-center justify-center relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-emerald-100/50 to-teal-100/50"></div>
        ${event.image ? `<img src="${event.image}" alt="${event.title}" class="w-full h-full object-cover">` : `<i data-lucide="ticket" class="w-12 h-12 text-emerald-300 relative z-10"></i>`}
      </div>
      <div class="p-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <span class="text-xs font-bold text-emerald-600 uppercase tracking-wider">${event.category || 'General'}</span>
            <h3 class="text-xl font-bold text-stone-800 mt-1">${event.title}</h3>
          </div>
          <div class="bg-stone-100 px-3 py-1 rounded-lg text-stone-800 font-bold border border-stone-200">${event.price}</div>
        </div>
        <div class="space-y-3 mb-6">
          <div class="flex items-center gap-3 text-stone-500 text-sm">
            <i data-lucide="calendar" class="w-4 h-4"></i>
            ${event.date}
          </div>
          <div class="flex items-center gap-3 text-stone-500 text-sm">
            <i data-lucide="map-pin" class="w-4 h-4"></i>
            ${event.location}
          </div>
          <div class="flex items-center gap-3 text-stone-500 text-sm">
            <i data-lucide="users" class="w-4 h-4"></i>
            <span class="${spotsLow ? 'text-red-600 font-semibold' : ''}">${spotsRemaining} spots remaining</span>
          </div>
        </div>
        ${event.description ? `<p class="text-stone-600 text-sm mb-4">${event.description}</p>` : ''}
        <button 
          class="book-btn w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
          data-event-id="${event.id}"
          data-event-title="${event.title}"
          data-event-price="${event.price}"
          ${isSoldOut ? 'disabled' : ''}
        >
          ${isSoldOut ? 'Sold Out' : 'Book Now'}
        </button>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners to book buttons
 */
function attachBookingListeners() {
  const bookButtons = document.querySelectorAll('.book-btn');
  
  bookButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Check if user is logged in
      if (!auth.currentUser) {
        showModal('Please log in to book an event', 'You need to be logged in to complete your booking.', [
          { text: 'Go to Login', action: () => window.location.href = 'login.html' },
          { text: 'Cancel', action: closeModal }
        ]);
        return;
      }

      const eventId = btn.dataset.eventId;
      const eventTitle = btn.dataset.eventTitle;
      const eventPrice = btn.dataset.eventPrice;
      
      showBookingModal(eventId, eventTitle, eventPrice);
    });
  });
}

/**
 * Show booking modal
 * @param {string} eventId - Event ID
 * @param {string} eventTitle - Event title
 * @param {string} eventPrice - Event price
 */
function showBookingModal(eventId, eventTitle, eventPrice) {
  const priceNum = parseInt(eventPrice.replace(/[^0-9]/g, '')) || 0;

  const modalContent = `
    <div class="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
      <h2 class="text-2xl font-bold text-stone-800 mb-6">Confirm Booking</h2>
      
      <div class="mb-6 p-4 bg-stone-50 rounded-xl">
        <p class="text-sm text-stone-600 mb-2">Event:</p>
        <p class="font-semibold text-stone-800">${eventTitle}</p>
        <p class="text-sm text-stone-600 mt-3">Price per ticket:</p>
        <p class="font-semibold text-emerald-600 text-lg">${eventPrice}</p>
      </div>

      <div class="mb-6">
        <label class="block text-sm font-semibold text-stone-700 mb-3">Number of Tickets</label>
        <div class="flex items-center border border-stone-300 rounded-lg">
          <button class="px-4 py-2 text-stone-600 hover:bg-stone-100" id="decrement-btn">−</button>
          <input type="number" id="ticket-count" value="1" min="1" max="10" class="flex-1 text-center py-2 border-0 focus:outline-none">
          <button class="px-4 py-2 text-stone-600 hover:bg-stone-100" id="increment-btn">+</button>
        </div>
      </div>

      <div class="mb-6 p-4 bg-emerald-50 rounded-xl">
        <p class="text-sm text-stone-600 mb-2">Total Price:</p>
        <p class="font-bold text-emerald-600 text-2xl" id="total-price">${eventPrice}</p>
      </div>

      <textarea 
        id="special-requests" 
        placeholder="Any special requests? (optional)" 
        class="w-full p-3 border border-stone-300 rounded-lg mb-6 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
        rows="3"
      ></textarea>

      <div class="flex gap-3">
        <button id="confirm-btn" class="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors">
          Confirm Booking
        </button>
        <button id="cancel-btn" class="flex-1 py-3 bg-stone-200 text-stone-700 font-bold rounded-lg hover:bg-stone-300 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  `;

  showModalWithContent(modalContent);

  // Attach handlers
  const ticketInput = document.getElementById('ticket-count');
  const decrementBtn = document.getElementById('decrement-btn');
  const incrementBtn = document.getElementById('increment-btn');
  const totalPriceEl = document.getElementById('total-price');
  const confirmBtn = document.getElementById('confirm-btn');
  const cancelBtn = document.getElementById('cancel-btn');

  // Update total price
  const updateTotalPrice = () => {
    const count = parseInt(ticketInput.value) || 1;
    if (priceNum === 0) {
      totalPriceEl.textContent = 'Free';
    } else {
      totalPriceEl.textContent = `₹${priceNum * count}`;
    }
  };

  decrementBtn.addEventListener('click', () => {
    const current = parseInt(ticketInput.value) || 1;
    if (current > 1) {
      ticketInput.value = current - 1;
      updateTotalPrice();
    }
  });

  incrementBtn.addEventListener('click', () => {
    const current = parseInt(ticketInput.value) || 1;
    if (current < 10) {
      ticketInput.value = current + 1;
      updateTotalPrice();
    }
  });

  ticketInput.addEventListener('change', updateTotalPrice);

  confirmBtn.addEventListener('click', async () => {
    const ticketCount = parseInt(ticketInput.value) || 1;
    const specialRequests = document.getElementById('special-requests').value;

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Processing...';

    try {
      const result = await bookEvent(eventId, {
        numberOfTickets: ticketCount,
        specialRequests: specialRequests
      });

      if (result.success) {
        showModal('Booking Confirmed!', `Your booking for ${eventTitle} has been confirmed. Booking ID: ${result.bookingId}`, [
          { text: 'View My Bookings', action: () => { closeModal(); scrollToBookings(); } },
          { text: 'Continue Shopping', action: closeModal }
        ]);
        loadAndDisplayEvents(); // Refresh events to show updated spot counts
      } else {
        showModal('Booking Failed', result.error, [
          { text: 'Try Again', action: closeModal }
        ]);
      }
    } catch (error) {
      console.error('Booking error:', error);
      showModal('Error', 'An unexpected error occurred. Please try again.', [
        { text: 'Close', action: closeModal }
      ]);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm Booking';
    }
  });

  cancelBtn.addEventListener('click', closeModal);
}

/**
 * Check authentication and load user bookings
 */
function checkAuthAndLoadBookings() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadUserBookings();
      setupRealtimeBookingUpdates();
    }
  });
}

/**
 * Load and display user's bookings
 */
async function loadUserBookings() {
  try {
    const bookings = await getUserBookings();
    renderUserBookings(bookings);
  } catch (error) {
    console.error('Failed to load bookings:', error);
  }
}

/**
 * Render user's bookings section
 * @param {Array} bookings - Array of booking objects
 */
function renderUserBookings(bookings) {
  const main = document.querySelector('main');
  if (!main) return;

  // Remove existing bookings section if present
  const existingSection = document.getElementById('my-bookings-section');
  if (existingSection) {
    existingSection.remove();
  }

  if (bookings.length === 0) {
    return; // Don't show empty bookings section
  }

  const bookingsSection = document.createElement('section');
  bookingsSection.id = 'my-bookings-section';
  bookingsSection.className = 'mt-16 fade-in';
  
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  let html = `
    <div class="text-center mb-12">
      <h2 class="text-4xl font-bold text-stone-800 mb-2">My Bookings</h2>
      <p class="text-stone-600">Track and manage your event bookings</p>
    </div>
  `;

  if (confirmedBookings.length > 0) {
    html += `
      <div class="mb-12">
        <h3 class="text-2xl font-bold text-stone-800 mb-6">Upcoming & Confirmed</h3>
        <div class="grid lg:grid-cols-2 gap-6">
          ${confirmedBookings.map(booking => createBookingCard(booking)).join('')}
        </div>
      </div>
    `;
  }

  if (cancelledBookings.length > 0) {
    html += `
      <div>
        <h3 class="text-2xl font-bold text-stone-800 mb-6">Cancelled</h3>
        <div class="grid lg:grid-cols-2 gap-6">
          ${cancelledBookings.map(booking => createBookingCard(booking, true)).join('')}
        </div>
      </div>
    `;
  }

  bookingsSection.innerHTML = html;
  main.appendChild(bookingsSection);

  // Attach cancel listeners
  attachCancelListeners();
  initializeIcons();
}

/**
 * Create HTML card for a booking
 * @param {Object} booking - Booking object
 * @param {boolean} isCancelled - Whether booking is cancelled
 * @returns {string} HTML card markup
 */
function createBookingCard(booking, isCancelled = false) {
  const bookingDate = formatBookingDate(booking.bookingDate);

  return `
    <div class="bg-white border-l-4 ${isCancelled ? 'border-stone-400' : 'border-emerald-500'} rounded-lg shadow-md p-6">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h4 class="text-xl font-bold text-stone-800">${booking.eventTitle}</h4>
          <p class="text-sm text-stone-500">Booking ID: ${booking.id}</p>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-semibold ${
          isCancelled 
            ? 'bg-stone-200 text-stone-700' 
            : 'bg-emerald-100 text-emerald-700'
        }">
          ${isCancelled ? 'Cancelled' : 'Confirmed'}
        </span>
      </div>

      <div class="space-y-3 mb-6 text-sm text-stone-600">
        <div class="flex items-center gap-3">
          <i data-lucide="calendar" class="w-4 h-4"></i>
          <span>${booking.eventDate}</span>
        </div>
        <div class="flex items-center gap-3">
          <i data-lucide="map-pin" class="w-4 h-4"></i>
          <span>${booking.eventLocation}</span>
        </div>
        <div class="flex items-center gap-3">
          <i data-lucide="ticket" class="w-4 h-4"></i>
          <span>${booking.numberOfTickets} ticket${booking.numberOfTickets !== 1 ? 's' : ''}</span>
        </div>
        <div class="flex items-center gap-3">
          <i data-lucide="tag" class="w-4 h-4"></i>
          <span class="font-semibold">${booking.totalPrice}</span>
        </div>
        <div class="flex items-center gap-3">
          <i data-lucide="clock" class="w-4 h-4"></i>
          <span class="text-xs">${bookingDate}</span>
        </div>
      </div>

      ${booking.specialRequests ? `
        <div class="mb-4 p-3 bg-stone-50 rounded text-sm text-stone-600">
          <p class="font-semibold text-stone-700 mb-1">Special Requests:</p>
          <p>${booking.specialRequests}</p>
        </div>
      ` : ''}

      ${!isCancelled ? `
        <button class="cancel-booking-btn w-full py-2 border border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold text-sm" data-booking-id="${booking.id}">
          Cancel Booking
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * Attach cancel booking event listeners
 */
function attachCancelListeners() {
  const cancelBtns = document.querySelectorAll('.cancel-booking-btn');
  
  cancelBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const bookingId = btn.dataset.bookingId;
      
      showModal(
        'Cancel Booking?',
        'Are you sure you want to cancel this booking? This action cannot be undone.',
        [
          { 
            text: 'Cancel Booking', 
            action: async () => {
              const result = await cancelBooking(bookingId);
              if (result.success) {
                showModal('Booking Cancelled', 'Your booking has been cancelled successfully.', [
                  { text: 'Close', action: () => { closeModal(); loadUserBookings(); } }
                ]);
              } else {
                showModal('Error', result.error, [
                  { text: 'Close', action: closeModal }
                ]);
              }
            }
          },
          { text: 'Keep Booking', action: closeModal }
        ]
      );
    });
  });
}

/**
 * Setup real-time event updates
 */
function setupRealtimeEventUpdates() {
  listenToEvents((events) => {
    renderEvents(events);
  });
}

/**
 * Setup real-time booking updates
 */
function setupRealtimeBookingUpdates() {
  listenToUserBookings((bookings) => {
    renderUserBookings(bookings);
  });
}

/**
 * Scroll to bookings section
 */
function scrollToBookings() {
  const bookingsSection = document.getElementById('my-bookings-section');
  if (bookingsSection) {
    bookingsSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// =========================
// MODAL FUNCTIONS
// =========================

/**
 * Show simple modal with title, message, and actions
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {Array} actions - Array of action buttons
 */
function showModal(title, message, actions = []) {
  const modalContent = `
    <div class="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
      <h2 class="text-2xl font-bold text-stone-800 mb-4">${title}</h2>
      <p class="text-stone-600 mb-8">${message}</p>
      <div class="flex gap-3 flex-col">
        ${actions.map((action, idx) => `
          <button class="modal-action py-3 px-4 rounded-lg font-semibold transition-colors" data-action="${idx}">
            ${action.text}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  showModalWithContent(modalContent);

  actions.forEach((action, idx) => {
    const btn = document.querySelector(`[data-action="${idx}"]`);
    if (btn) {
      btn.addEventListener('click', () => {
        action.action?.();
      });
    }
  });
}

/**
 * Show modal with custom content
 * @param {string} content - HTML content for modal
 */
function showModalWithContent(content) {
  // Remove existing modal if present
  const existingModal = document.getElementById('modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  overlay.innerHTML = content;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  document.body.appendChild(overlay);
  initializeIcons();
}

/**
 * Close modal
 */
function closeModal() {
  const modal = document.getElementById('modal-overlay');
  if (modal) {
    modal.remove();
  }
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showErrorMessage(message) {
  showModal('Error', message, [{ text: 'Close', action: closeModal }]);
}
