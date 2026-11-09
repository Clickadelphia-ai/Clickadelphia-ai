# ♿ AccessMap

Search a map for **accessible places** — wheelchair access, accessible restrooms, and accessible parking — using real [OpenStreetMap](https://www.openstreetmap.org/) data.

No build step, no API keys. Just open `index.html` in a browser.

## Features

- 🗺️ Interactive map ([Leaflet](https://leafletjs.com/) + OpenStreetMap tiles)
- 🔍 Search any area for accessible places via the [Overpass API](https://overpass-api.de/)
- 🏷️ Reads real OSM accessibility tags (`wheelchair=yes/limited/no`, `toilets:wheelchair`, `capacity:disabled`)
- 🎛️ Filters: wheelchair access · accessible toilets · accessible parking · minimum access level
- 🟢🟠🔴⚫ Color-coded markers (fully accessible / limited / not accessible / unknown)
- 📍 "Use my location" via browser geolocation, or type a place name
- ♿ Accessible UI: keyboard navigation, focus rings, ARIA live regions, high contrast

## Usage

1. Open `index.html` in any modern browser.
2. Type a location (e.g. `London`) and press **Go**, or click **📍 Use my location**.
3. Choose your filters.
4. Press **🔍 Search this area**.
5. Click a marker or a result in the list for details.

## How it works

Accessibility data comes from OpenStreetMap, queried live through the Overpass API.
The app tries several Overpass mirrors for resilience. Place-name lookup uses Nominatim.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure and accessible markup |
| `styles.css` | Dark, high-contrast, responsive styling |
| `app.js` | Map setup, Overpass/Nominatim queries, rendering |

## Credits

Data © OpenStreetMap contributors · Maps © Leaflet · Geocoding via Nominatim · Accessibility data via Overpass API
