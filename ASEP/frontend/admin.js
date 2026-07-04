// admin.js - Admin panel for managing live alerts
// Handles authentication, CRUD operations for alerts in Firestore

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Admin credentials (client-side check)
const ADMIN_EMAIL = 'admin@hiddenpath.com';
const ADMIN_PASSWORD = 'admin123';

// DOM elements
const addAlertForm = document.getElementById('add-alert-form');
const alertsList = document.getElementById('alerts-list');

// Current editing state
let editingId = null;

// Initialize icons
function initializeIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Check admin access
function checkAdminAccess(user) {
  if (!user || user.email !== ADMIN_EMAIL) {
    alert('Access denied. Admin privileges required.');
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Show logout button
function showLogoutButton() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'logout-btn';
  logoutBtn.innerHTML = '<i data-lucide="log-out" class="w-4 h-4"></i> Logout';
  logoutBtn.className = 'flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors';
  logoutBtn.addEventListener('click', handleLogout);

  const navContainer = nav.querySelector('.flex.items-center.justify-between');
  if (navContainer) {
    navContainer.appendChild(logoutBtn);
  }

  initializeIcons();
}

// Handle logout
async function handleLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Load and display alerts
async function loadAlerts() {
  try {
    const alertsCollection = collection(db, 'alerts');
    const alertsSnapshot = await getDocs(alertsCollection);
    const alerts = alertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    renderAlerts(alerts);
  } catch (error) {
    console.error('Failed to load alerts:', error);
    alertsList.innerHTML = '<p class="text-red-400">Failed to load alerts.</p>';
  }
}

// Render alerts list
function renderAlerts(alerts) {
  if (alerts.length === 0) {
    alertsList.innerHTML = '<p class="text-slate-400">No alerts found.</p>';
    return;
  }

  alertsList.innerHTML = alerts.map(alert => `
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-sm font-semibold text-slate-400 uppercase">${alert.type}</span>
          <span class="px-2 py-1 text-xs rounded ${alert.severity === 'high' ? 'bg-red-500' : alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'} text-white">
            ${alert.severity}
          </span>
          ${alert.location ? `<span class="text-sm font-medium text-slate-300 ml-2"><i data-lucide="map-pin" class="w-3 h-3 inline mr-1"></i>${alert.location}</span>` : ''}
        </div>
        <p class="text-white">${alert.message}</p>
        ${alert.timestamp ? `<p class="text-xs text-slate-500 mt-1">Created: ${new Date(alert.timestamp.toDate()).toLocaleString()}</p>` : ''}
      </div>
      <div class="flex gap-2 ml-4">
        <button class="edit-btn px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors" data-id="${alert.id}">
          <i data-lucide="edit" class="w-4 h-4"></i>
        </button>
        <button class="delete-btn px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors" data-id="${alert.id}">
          <i data-lucide="trash" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');

  // Add event listeners for edit and delete
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => editAlert(e.target.closest('button').dataset.id));
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => deleteAlert(e.target.closest('button').dataset.id));
  });

  initializeIcons();
}

// Add new alert
async function addAlert(type, severity, message, location) {
  try {
    const alertsCollection = collection(db, 'alerts');
    await addDoc(alertsCollection, {
      type,
      severity,
      message,
      location,
      timestamp: new Date()
    });
    alert('Alert added successfully!');
    addAlertForm.reset();
    loadAlerts();
  } catch (error) {
    console.error('Failed to add alert:', error);
    alert('Failed to add alert: ' + error.message);
  }
}

// Edit alert (populate form)
async function editAlert(id) {
  try {
    const alertDoc = await getDocs(collection(db, 'alerts'));
    const alert = alertDoc.docs.find(doc => doc.id === id)?.data();
    if (!alert) return;

    document.getElementById('alert-type').value = alert.type;
    document.getElementById('alert-severity').value = alert.severity;
    document.getElementById('alert-message').value = alert.message;
    document.getElementById('alert-location').value = alert.location || '';

    editingId = id;
    document.querySelector('#add-alert-form button[type="submit"]').textContent = 'Update Alert';
  } catch (error) {
    console.error('Failed to load alert for editing:', error);
  }
}

// Update alert
async function updateAlert(id, type, severity, message, location) {
  try {
    const alertRef = doc(db, 'alerts', id);
    await updateDoc(alertRef, { type, severity, message, location });
    alert('Alert updated successfully!');
    addAlertForm.reset();
    editingId = null;
    document.querySelector('#add-alert-form button[type="submit"]').textContent = 'Add Alert';
    loadAlerts();
  } catch (error) {
    console.error('Failed to update alert:', error);
    alert('Failed to update alert: ' + error.message);
  }
}

// Delete alert
async function deleteAlert(id) {
  if (!confirm('Are you sure you want to delete this alert?')) return;

  try {
    await deleteDoc(doc(db, 'alerts', id));
    alert('Alert deleted successfully!');
    loadAlerts();
  } catch (error) {
    console.error('Failed to delete alert:', error);
    alert('Failed to delete alert: ' + error.message);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  initializeIcons();

  // Auth state listener
  onAuthStateChanged(auth, (user) => {
    if (checkAdminAccess(user)) {
      showLogoutButton();
      loadAlerts();
    }
  });

  // Add/Update form submission
  addAlertForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.getElementById('alert-type').value;
    const severity = document.getElementById('alert-severity').value;
    const message = document.getElementById('alert-message').value.trim();
    const location = document.getElementById('alert-location').value.trim();

    if (!type || !severity || !message || !location) {
      alert('Please fill in all fields.');
      return;
    }

    if (editingId) {
      await updateAlert(editingId, type, severity, message, location);
    } else {
      await addAlert(type, severity, message, location);
    }
  });
});