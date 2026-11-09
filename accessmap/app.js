/* ============================================================
   AccessMap — search a map for accessible places
   Data source: OpenStreetMap via the Overpass API.
   OSM tags used:
     wheelchair = yes | limited | no
     toilets:wheelchair = yes
     amenity = parking + capacity:disabled / wheelchair=yes
   ============================================================ */

const DEFAULT_CENTER = [51.5074, -0.1278]; // London
const DEFAULT_ZOOM = 14;

// Overpass has several mirrors; we try them in order if one fails.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

let map;
let markerLayer;

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  map = L.map("map", { zoomControl: true }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  // Wire up controls
  document.getElementById("search-form").addEventListener("submit", onPlaceSearch);
  document.getElementById("locate-btn").addEventListener("click", onLocate);
  document.getElementById("search-area-btn").addEventListener("click", searchVisibleArea);

  setStatus("Pan/zoom to an area, then press “Search this area”.");
});

/* ---------- Status helper ---------- */
function setStatus(msg, type = "") {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = "status" + (type ? " " + type : "");
}

/* ---------- Geocode a typed place (Nominatim) ---------- */
async function onPlaceSearch(e) {
  e.preventDefault();
  const q = document.getElementById("place-search").value.trim();
  if (!q) return;

  setStatus(`Looking up “${q}”…`, "loading");
  try {
    const url = `${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (!data.length) {
      setStatus(`Couldn't find “${q}”. Try another search.`, "error");
      return;
    }
    const { lat, lon } = data[0];
    map.setView([parseFloat(lat), parseFloat(lon)], 15);
    setStatus("Location found. Press “Search this area” to load accessible places.");
    searchVisibleArea();
  } catch (err) {
    setStatus("Location lookup failed. Check your connection.", "error");
  }
}

/* ---------- Use browser geolocation ---------- */
function onLocate() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported by this browser.", "error");
    return;
  }
  setStatus("Getting your location…", "loading");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 15);
      searchVisibleArea();
    },
    () => setStatus("Could not get your location (permission denied?).", "error"),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/* ---------- Build the Overpass query from active filters ---------- */
function buildQuery(bbox) {
  const wantWheelchair = document.getElementById("f-wheelchair").checked;
  const wantToilets = document.getElementById("f-toilets").checked;
  const wantParking = document.getElementById("f-parking").checked;

  const clauses = [];

  if (wantWheelchair) {
    // Any node/way tagged with a wheelchair value
    clauses.push(`nwr["wheelchair"](${bbox});`);
  }
  if (wantToilets) {
    clauses.push(`nwr["toilets:wheelchair"="yes"](${bbox});`);
    clauses.push(`nwr["amenity"="toilets"]["wheelchair"](${bbox});`);
  }
  if (wantParking) {
    clauses.push(`nwr["amenity"="parking"]["capacity:disabled"](${bbox});`);
    clauses.push(`nwr["amenity"="parking"]["wheelchair"="yes"](${bbox});`);
  }

  // Fallback: if nothing selected, default to wheelchair
  if (clauses.length === 0) clauses.push(`nwr["wheelchair"](${bbox});`);

  return `[out:json][timeout:25];(${clauses.join("")});out center 200;`;
}

/* ---------- Query Overpass for the current map view ---------- */
async function searchVisibleArea() {
  const b = map.getBounds();
  const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
  const query = buildQuery(bbox);

  setStatus("Searching for accessible places…", "loading");

  let data = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
      });
      if (!res.ok) continue;
      data = await res.json();
      break;
    } catch (err) {
      // try next mirror
    }
  }

  if (!data) {
    setStatus("All map data servers are busy. Please try again in a moment.", "error");
    return;
  }

  renderResults(data.elements || []);
}

/* ---------- Classify an element by accessibility ---------- */
function classify(tags) {
  const w = tags.wheelchair;
  if (w === "yes") return "yes";
  if (w === "limited") return "limited";
  if (w === "no") return "no";
  if (tags["toilets:wheelchair"] === "yes" || tags["capacity:disabled"]) return "yes";
  return "unknown";
}

function levelAllowed(cls) {
  const level = document.getElementById("f-level").value;
  if (level === "yes") return cls === "yes";
  return cls !== "no"; // "all" → hide the explicitly inaccessible
}

/* ---------- Render markers + results list ---------- */
function renderResults(elements) {
  markerLayer.clearLayers();
  const list = document.getElementById("results-list");
  list.innerHTML = "";

  const seen = new Set();
  let count = 0;

  elements.forEach((el) => {
    const tags = el.tags || {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) return;

    const cls = classify(tags);
    if (!levelAllowed(cls)) return;

    const name = tags.name || prettyType(tags) || "Unnamed place";
    const key = `${name}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
    if (seen.has(key)) return;
    seen.add(key);

    count++;

    // Marker
    const icon = L.divIcon({
      className: "",
      html: `<div class="pin pin-${cls}"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 22],
      popupAnchor: [0, -20],
    });
    const marker = L.marker([lat, lon], { icon, title: name }).addTo(markerLayer);
    marker.bindPopup(popupHtml(name, cls, tags));

    // Results list entry
    const li = document.createElement("li");
    li.tabIndex = 0;
    li.innerHTML = `
      <div class="r-name">${escapeHtml(name)}</div>
      <div class="r-meta">${labelFor(cls)}${tags.amenity ? " · " + escapeHtml(tags.amenity) : ""}</div>`;
    const focusMarker = () => {
      map.setView([lat, lon], Math.max(map.getZoom(), 17));
      marker.openPopup();
    };
    li.addEventListener("click", focusMarker);
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focusMarker(); }
    });
    list.appendChild(li);
  });

  if (count === 0) {
    setStatus("No matching accessible places found here. Try zooming out or changing filters.");
  } else {
    setStatus(`Found ${count} place${count === 1 ? "" : "s"}. Click a marker or list item for details.`);
  }
}

/* ---------- Popup + helpers ---------- */
function popupHtml(name, cls, tags) {
  const rows = [];
  if (tags.wheelchair) rows.push(`Wheelchair: <strong>${escapeHtml(tags.wheelchair)}</strong>`);
  if (tags["toilets:wheelchair"]) rows.push(`Accessible toilet: <strong>${escapeHtml(tags["toilets:wheelchair"])}</strong>`);
  if (tags["capacity:disabled"]) rows.push(`Disabled parking spaces: <strong>${escapeHtml(tags["capacity:disabled"])}</strong>`);
  if (tags["addr:street"]) rows.push(`${escapeHtml(tags["addr:housenumber"] || "")} ${escapeHtml(tags["addr:street"])}`.trim());

  return `
    <div>
      <p class="popup-title">${escapeHtml(name)}</p>
      <span class="popup-badge badge-${cls}">${labelFor(cls)}</span>
      ${rows.map((r) => `<div class="popup-row">${r}</div>`).join("")}
    </div>`;
}

function labelFor(cls) {
  return {
    yes: "Fully accessible",
    limited: "Limited access",
    no: "Not accessible",
    unknown: "Accessibility unknown",
  }[cls];
}

function prettyType(tags) {
  const t = tags.amenity || tags.shop || tags.tourism || tags.leisure;
  return t ? t.replace(/_/g, " ") : "";
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
