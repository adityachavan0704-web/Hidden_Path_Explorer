// admin-events.js - Admin Events Management
// Handles admin operations for events and bookings

import { auth, db } from './firebase-config.js';
import {
  fetchAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getAllBookings,
  getEventStatistics,
  listenToEvents,
  formatBookingDate
} from './events.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// State
let currentTab = 'events';
let currentEditingEventId = null;

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const logoutBtn = document.getElementById('logout-btn');
const addEventBtn = document.getElementById('add-event-btn');
const eventsList = document.getElementById('events-list');
const bookingsTableBody = document.getElementById('bookings-table-body');
const adminEmail = document.getElementById('admin-email');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAccess();
  initializeEventListeners();
  loadDashboard();
});

/**
 * Check if user is admin
 */
function checkAdminAccess() {
  onAuthStateChanged(auth, (user) => {
    if (!user || user.email !== 'admin@hiddenpath.com') {
      window.location.href = 'login.html';
      return;
    }
    adminEmail.textContent = user.email;
  });
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Logout error:', error);
    }
  });

  // Add event button
  addEventBtn.addEventListener('click', showAddEventModal);
}

/**
 * Switch tabs
 */
function switchTab(tab) {
  currentTab = tab;

  // Update button styles
  tabButtons.forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.classList.add('border-blue-500', 'text-white');
      btn.classList.remove('border-transparent', 'text-slate-300');
    } else {
      btn.classList.remove('border-blue-500', 'text-white');
      btn.classList.add('border-transparent', 'text-slate-300');
    }
  });

  // Update content visibility
  tabContents.forEach(content => {
    if (content.id === `tab-${tab}`) {
      content.classList.remove('hidden');
    } else {
      content.classList.add('hidden');
    }
  });

  // Load tab-specific data
  if (tab === 'events') {
    loadEvents();
  } else if (tab === 'bookings') {
    loadBookings();
  }
}

/**
 * Load dashboard statistics
 */
async function loadDashboard() {
  try {
    const stats = await getEventStatistics();

    document.getElementById('stat-total-events').textContent = stats.totalEvents || 0;
    document.getElementById('stat-total-bookings').textContent = stats.totalBookings || 0;
    document.getElementById('stat-confirmed').textContent = stats.bookingsByStatus?.confirmed || 0;
    document.getElementById('stat-revenue').textContent = stats.totalRevenue || '₹0';
  } catch (error) {
    console.error('Failed to load statistics:', error);
  }

  // Setup real-time updates
  listenToEvents(() => {
    loadDashboard();
  });
}

/**
 * Load and display events
 */
async function loadEvents() {
  try {
    const events = await fetchAllEvents();
    renderEventsList(events);

    // Setup real-time updates
    listenToEvents((updatedEvents) => {
      renderEventsList(updatedEvents);
    });
  } catch (error) {
    console.error('Failed to load events:', error);
    eventsList.innerHTML = '<p class="text-red-400">Failed to load events.</p>';
  }
}

/**
 * Render events list
 */
function renderEventsList(events) {
  if (events.length === 0) {
    eventsList.innerHTML = `
      <div class="col-span-full text-center py-12 bg-slate-800 border border-slate-700 rounded-xl">
        <i data-lucide="calendar-x" class="w-12 h-12 mx-auto mb-4 text-slate-500"></i>
        <p class="text-slate-400">No events yet. Click "Add New Event" to create one.</p>
      </div>
    `;
    initializeIcons();
    return;
  }

  eventsList.innerHTML = events.map(event => createEventCard(event)).join('');

  // Attach event handlers
  attachEventHandlers();
  initializeIcons();
}

/**
 * Create event card HTML
 */
function createEventCard(event) {
  const spotsRemaining = (event.totalSpots || 50) - (event.bookingCount || 0);

  return `
    <div class="bg-slate-800 border border-slate-700 rounded-xl p-6 fade-in">
      <div class="flex justify-between items-start mb-4">
        <div>
          <p class="text-slate-400 text-sm mb-1">${event.category || 'General'}</p>
          <h3 class="text-2xl font-bold text-white">${event.title}</h3>
        </div>
        <div class="flex gap-2">
          <button class="edit-event-btn px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors" data-id="${event.id}">
            <i data-lucide="edit" class="w-4 h-4"></i>
          </button>
          <button class="delete-event-btn px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors" data-id="${event.id}">
            <i data-lucide="trash" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <p class="text-slate-400 text-sm">Date</p>
          <p class="text-white font-semibold">${event.date}</p>
        </div>
        <div>
          <p class="text-slate-400 text-sm">Location</p>
          <p class="text-white font-semibold">${event.location}</p>
        </div>
        <div>
          <p class="text-slate-400 text-sm">Price</p>
          <p class="text-white font-semibold text-lg">${event.price}</p>
        </div>
        <div>
          <p class="text-slate-400 text-sm">Availability</p>
          <p class="text-white font-semibold">${event.bookingCount || 0}/${event.totalSpots || 50} booked</p>
        </div>
      </div>

      <div class="relative bg-slate-700 rounded h-2 mb-4">
        <div class="bg-emerald-500 h-full rounded" style="width: ${((event.bookingCount || 0) / (event.totalSpots || 50)) * 100}%"></div>
      </div>

      <p class="text-slate-400 text-sm">${spotsRemaining} spots remaining</p>
    </div>
  `;
}

/**
 * Attach event handlers to cards
 */
function attachEventHandlers() {
  // Edit buttons
  document.querySelectorAll('.edit-event-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const eventId = btn.dataset.id;
      const events = await fetchAllEvents();
      const event = events.find(e => e.id === eventId);
      if (event) {
        showEditEventModal(event);
      }
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-event-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const eventId = btn.dataset.id;
      showConfirmModal(
        'Delete Event?',
        'This will delete the event and cannot be undone.',
        async () => {
          const result = await deleteEvent(eventId);
          if (result.success) {
            showMessage('Event deleted successfully', 'success');
            loadEvents();
          } else {
            showMessage(`Error: ${result.error}`, 'error');
          }
        }
      );
    });
  });
}

/**
 * Show add event modal
 */
function showAddEventModal() {
  currentEditingEventId = null;
  showEventFormModal('Create New Event');
}

/**
 * Show edit event modal
 */
function showEditEventModal(event) {
  currentEditingEventId = event.id;
  showEventFormModal('Edit Event', event);
}

/**
 * Show event form modal
 */
function showEventFormModal(title, event = null) {
  const modalContent = `
    <div class="bg-slate-800 rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-slate-700">
      <h2 class="text-2xl font-bold text-white mb-6">${title}</h2>

      <form id="event-form" class="space-y-4">
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-slate-300 mb-2">Event Title *</label>
            <input type="text" name="title" class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${event?.title || ''}" required>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-300 mb-2">Category *</label>
            <input type="text" name="category" class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${event?.category || ''}" placeholder="e.g., Cultural, Adventure" required>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-slate-300 mb-2">Date *</label>
            <input type="text" name="date" class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${event?.date || ''}" placeholder="e.g., Dec 1 - Dec 10" required>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-300 mb-2">Location *</label>
            <input type="text" name="location" class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${event?.location || ''}" required>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-slate-300 mb-2">Price *</label>
            <input type="text" name="price" class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${event?.price || ''}" placeholder="e.g., ₹500 or Free" required>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-300 mb-2">Total Spots *</label>
            <input type="number" name="totalSpots" class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${event?.totalSpots || 50}" min="1" required>
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-2">Description</label>
          <textarea name="description" class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3" placeholder="Event description">${event?.description || ''}</textarea>
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-2">Image URL</label>
          <input type="url" name="image" class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" value="${event?.image || ''}" placeholder="https://example.com/image.jpg">
        </div>

        <div class="flex gap-3 mt-8">
          <button type="submit" class="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
            ${event ? 'Update Event' : 'Create Event'}
          </button>
          <button type="button" class="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-semibold" id="close-modal-btn">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;

  showModalWithContent(modalContent);

  const form = document.getElementById('event-form');
  const closeBtn = document.getElementById('close-modal-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleEventFormSubmit(form);
  });

  closeBtn.addEventListener('click', closeModal);
}

/**
 * Handle event form submission
 */
async function handleEventFormSubmit(form) {
  const formData = new FormData(form);
  const eventData = Object.fromEntries(formData);

  try {
    let result;
    if (currentEditingEventId) {
      result = await updateEvent(currentEditingEventId, eventData);
    } else {
      result = await createEvent(eventData);
    }

    if (result.success) {
      showMessage(currentEditingEventId ? 'Event updated successfully' : 'Event created successfully', 'success');
      closeModal();
      loadEvents();
    } else {
      showMessage(`Error: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Form submission error:', error);
    showMessage('An error occurred', 'error');
  }
}

/**
 * Load and display bookings
 */
async function loadBookings() {
  try {
    const bookings = await getAllBookings();
    renderBookingsTable(bookings);
  } catch (error) {
    console.error('Failed to load bookings:', error);
    bookingsTableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-red-400">Failed to load bookings.</td></tr>';
  }
}

/**
 * Render bookings table
 */
function renderBookingsTable(bookings) {
  if (bookings.length === 0) {
    bookingsTableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center text-slate-400">No bookings yet.</td></tr>';
    return;
  }

  bookingsTableBody.innerHTML = bookings.map(booking => `
    <tr class="hover:bg-slate-700 transition-colors">
      <td class="px-6 py-4 text-slate-300 text-sm">${booking.id.substring(0, 12)}...</td>
      <td class="px-6 py-4 text-slate-300 text-sm">${booking.userEmail}</td>
      <td class="px-6 py-4 text-slate-300 text-sm">${booking.eventTitle}</td>
      <td class="px-6 py-4 text-slate-300 text-sm">${booking.numberOfTickets}</td>
      <td class="px-6 py-4 text-white font-semibold">${booking.totalPrice}</td>
      <td class="px-6 py-4">
        <span class="px-3 py-1 rounded-full text-xs font-semibold ${
          booking.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600 text-slate-300'
        }">
          ${booking.status}
        </span>
      </td>
      <td class="px-6 py-4 text-slate-400 text-sm">${formatBookingDate(booking.bookingDate)}</td>
    </tr>
  `).join('');
}

// =========================
// MODAL AND MESSAGE FUNCTIONS
// =========================

function showModalWithContent(content) {
  const existingModal = document.getElementById('modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50';
  overlay.innerHTML = content;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  document.body.appendChild(overlay);
  initializeIcons();
}

function closeModal() {
  const modal = document.getElementById('modal-overlay');
  if (modal) {
    modal.remove();
  }
}

function showConfirmModal(title, message, onConfirm) {
  const modalContent = `
    <div class="bg-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-700">
      <h2 class="text-2xl font-bold text-white mb-4">${title}</h2>
      <p class="text-slate-400 mb-8">${message}</p>
      <div class="flex gap-3">
        <button id="confirm-btn" class="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold">
          Confirm
        </button>
        <button id="cancel-btn" class="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-semibold">
          Cancel
        </button>
      </div>
    </div>
  `;

  showModalWithContent(modalContent);

  document.getElementById('confirm-btn').addEventListener('click', () => {
    onConfirm?.();
    closeModal();
  });

  document.getElementById('cancel-btn').addEventListener('click', closeModal);
}

function showMessage(message, type = 'success') {
  const messageEl = document.createElement('div');
  messageEl.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white font-semibold z-50 ${
    type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
  }`;
  messageEl.textContent = message;

  document.body.appendChild(messageEl);

  setTimeout(() => {
    messageEl.remove();
  }, 3000);
}

function initializeIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}
