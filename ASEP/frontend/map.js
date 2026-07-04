// map.js - Map functionality using Leaflet.js and OpenStreetMap
// Handles map initialization, markers, and popups

// Import destinations from script.js (assuming it's loaded first)
import { DESTINATIONS } from './script.js';

// Initialize map when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('map')) {
    initMap();
  }
});

// Initialize Leaflet map
// Initialize Leaflet map
function initMap() {
  // Center on Northeast India
  const centerLat = 26.0;
  const centerLng = 92.0;
  const zoomLevel = 7;

  // Create map
  const map = L.map('map').setView([centerLat, centerLng], zoomLevel);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);

  // Marker storage
  let allMarkers = [];
  let currentDestinations = [...DESTINATIONS]; // State for current list

  // Function to render markers based on data
  function renderMarkers(destinations) {
    // Clear existing markers
    allMarkers.forEach(m => map.removeLayer(m));
    allMarkers = [];

    const markersObj = {}; // For sidebar linking

    destinations.forEach(destination => {
      const marker = L.marker([destination.lat, destination.lng]).addTo(map);

      const popupContent = `
        <div class="max-w-xs">
          <img src="${destination.image}" alt="${destination.name}" class="w-full h-32 object-cover rounded-lg mb-2" />
          <h3 class="font-bold text-lg text-gray-800">${destination.name}</h3>
          <p class="text-sm text-gray-600">${destination.description}</p>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.bindTooltip(destination.name, {
        permanent: false,
        direction: 'top'
      });

      marker.on('mouseover', function () { this.openPopup(); });
      // marker.on('mouseout', function () { this.closePopup(); }); // Optional: keep open to read

      markersObj[destination.id] = marker;
      allMarkers.push(marker);
    });

    // Fit bounds if markers exist
    if (destinations.length > 0) {
      const group = new L.featureGroup(allMarkers);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    return markersObj;
  }

  // Initial Render
  let markers = renderMarkers(DESTINATIONS);
  populateSidebar(DESTINATIONS, map, markers);

  // --- Filtering Logic ---
  const btnAll = document.getElementById('btn-map-all');
  const btnHidden = document.getElementById('btn-map-hidden');
  const searchInput = document.getElementById('map-search-input');

  function updateFilterUI(type) {
    if (type === 'all') {
      btnAll.className = 'bg-emerald-600 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors';
      btnHidden.className = 'bg-white border border-stone-200 text-stone-500 px-4 py-1.5 rounded-full text-sm font-medium hover:bg-stone-50 transition-colors';
    } else {
      btnHidden.className = 'bg-emerald-600 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors';
      btnAll.className = 'bg-white border border-stone-200 text-stone-500 px-4 py-1.5 rounded-full text-sm font-medium hover:bg-stone-50 transition-colors';
    }
  }

  // Filter Buttons
  if (btnAll && btnHidden) {
    btnAll.addEventListener('click', () => {
      currentDestinations = DESTINATIONS; // Reset to all
      updateFilterUI('all');
      markers = renderMarkers(currentDestinations);
      populateSidebar(currentDestinations, map, markers);
      // Reset search if any
      if (searchInput) searchInput.value = '';
    });

    btnHidden.addEventListener('click', () => {
      // Filter for hidden gems
      currentDestinations = DESTINATIONS.filter(d => d.type === 'Hidden Gem');
      updateFilterUI('hidden');
      markers = renderMarkers(currentDestinations);
      populateSidebar(currentDestinations, map, markers);
      // Reset search if any
      if (searchInput) searchInput.value = '';
    });
  }

  // Search Logic
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();

      if (!query) {
        // Restore current filter state (All or Hidden) logic could be complex, 
        // simpler to just search within the full set for now or current set.
        // Let's search within the *current filtered set* or reset to all? 
        // UX usually implies search overrides filter. Let's filter GLOBAL list for search.
        markers = renderMarkers(currentDestinations); // Show current list
        populateSidebar(currentDestinations, map, markers);
        return;
      }

      const filtered = DESTINATIONS.filter(d =>
        d.name.toLowerCase().includes(query) ||
        d.location.toLowerCase().includes(query)
      );

      markers = renderMarkers(filtered);
      populateSidebar(filtered, map, markers);

      // If one match, zoom to it
      if (filtered.length === 1) {
        map.setView([filtered[0].lat, filtered[0].lng], 13);
        markers[filtered[0].id].openPopup();
      }
    });
  }
}

// Populate sidebar with filtered destinations
function populateSidebar(destinationsList, map, markers) {
  const sidebar = document.getElementById('destinations-sidebar');
  if (!sidebar) return;

  if (destinationsList.length === 0) {
    sidebar.innerHTML = '<div class="text-stone-400 text-center py-4">No places found.</div>';
    return;
  }

  sidebar.innerHTML = destinationsList.map(destination => `
    <div class="bg-white border border-stone-200 p-4 rounded-xl hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer destination-item" data-id="${destination.id}">
      <div class="flex gap-4">
        <img src="${destination.image}" class="w-20 h-20 rounded-lg object-cover" />
        <div class="flex-1">
          <h3 class="text-stone-800 font-semibold line-clamp-1">${destination.name}</h3>
          <p class="text-stone-500 text-sm mb-2">${destination.location}</p>
          <div class="flex items-center gap-3">
            <span class="text-xs text-stone-500 flex items-center gap-1">
              <i data-lucide="users" class="w-3 h-3"></i> ${destination.crowd}
            </span>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.destination-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id);
      const destination = destinationsList.find(d => d.id === id);
      if (destination) {
        map.setView([destination.lat, destination.lng], 12); // Focus and zoom
        const marker = markers[id];
        if (marker) {
          marker.openPopup(); // Open popup on click
        }
      }
    });
  });

  // Re-initialize icons
  if (window.lucide) {
    lucide.createIcons();
  }
}