import os
import requests
import folium
from folium import MacroElement
from jinja2 import Template
from flask import Flask, jsonify

app = Flask(__name__)

OPENSKY_URL = "https://opensky-network.org/api/states/all"
EMERGENCY_SQUAWKS = {"7700", "7600", "7500"}

FLIGHT_JS = Template("""
{% macro script(this, kwargs) %}
(function() {
  // ── Find the Folium/Leaflet map object ───────────────────────────────────
  var mapObj = null;
  for (var key in window) {
    try {
      if (window[key] && window[key]._leaflet_id !== undefined && typeof window[key].addLayer === 'function') {
        mapObj = window[key];
        break;
      }
    } catch(e) { /* skip cross-origin objects */ }
  }
  if (!mapObj) return;

  var markerLayer = L.layerGroup().addTo(mapObj);

  // ── All live flight data (used by filter/search) ─────────────────────────
  var allFlights = [];

  // ── Altitude colour tiers ────────────────────────────────────────────────
  function altColor(alt, isEmergency, onGround) {
    if (isEmergency) return '#ff1744';
    if (onGround)    return '#78909c';
    if (alt === null || alt === undefined) return '#78909c';
    if (alt < 1500)  return '#66bb6a';   // low   < 1 500 m  — green
    if (alt < 6000)  return '#ffd740';   // mid   < 6 000 m  — yellow
    if (alt < 10000) return '#ff9800';   // high  < 10 000 m — orange
    return '#00e5ff';                    // cruise ≥ 10 000 m — cyan
  }

  // ── SVG plane icon, rotated by heading ───────────────────────────────────
  function planeIcon(color, heading) {
    var deg = (heading !== null && heading !== undefined) ? heading : 0;
    var size = 22;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"'
      + ' width="' + size + '" height="' + size + '"'
      + ' style="transform:rotate(' + deg + 'deg);display:block;">'
      + '<path fill="' + color + '" stroke="' + color + '" stroke-width="0.3"'
      + ' style="filter:drop-shadow(0 0 3px ' + color + ')"'
      + ' d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>'
      + '</svg>';
    return L.divIcon({ html: svg, iconSize: [size, size], iconAnchor: [size/2, size/2], className: '' });
  }

  // ── Popup content ─────────────────────────────────────────────────────────
  function formatAlt(m) {
    if (m === null || m === undefined) return 'N/A';
    return Math.round(m).toLocaleString() + ' m  (' + Math.round(m * 3.28084).toLocaleString() + ' ft)';
  }
  function formatSpeed(ms) {
    if (ms === null || ms === undefined) return 'N/A';
    return Math.round(ms * 3.6) + ' km/h  (' + Math.round(ms * 1.94384) + ' kts)';
  }
  function formatHeading(h) {
    if (h === null || h === undefined) return 'N/A';
    var dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return Math.round(h) + '°  (' + dirs[Math.round(h / 45) % 8] + ')';
  }

  function buildPopup(f) {
    var color = altColor(f.altitude, f.emergency, f.on_ground);
    var badge = f.emergency
      ? '<div style="background:#ff1744;color:#fff;padding:4px 10px;border-radius:4px;margin-bottom:8px;font-weight:bold;text-align:center;">⚠ EMERGENCY · Squawk ' + f.squawk + '</div>'
      : '';
    var groundTag = f.on_ground ? ' <span style="background:#546e7a;color:#fff;border-radius:3px;padding:1px 5px;font-size:10px;">ON GROUND</span>' : '';
    return '<div style="font-family:\'Courier New\',monospace;min-width:240px;background:#0d1117;color:#e0e0e0;padding:6px 2px;line-height:1.7;">'
      + badge
      + '<b style="font-size:16px;color:' + color + ';">' + (f.callsign || f.icao24 || '—') + '</b>' + groundTag + '<br>'
      + '<span style="color:#546e7a;">ICAO24 </span><span style="color:#90a4ae;">' + (f.icao24 || '—') + '</span><br>'
      + '<span style="color:#546e7a;">Country </span>' + (f.origin_country || '—') + '<br>'
      + '<span style="color:#546e7a;">Altitude </span>' + formatAlt(f.altitude) + '<br>'
      + '<span style="color:#546e7a;">Speed </span>' + formatSpeed(f.velocity) + '<br>'
      + '<span style="color:#546e7a;">Heading </span>' + formatHeading(f.heading) + '<br>'
      + (f.squawk && !f.emergency ? '<span style="color:#546e7a;">Squawk </span><b style="color:#ffd740;">' + f.squawk + '</b>' : '')
      + '</div>';
  }

  // ── Marker pool for flicker-free updates ─────────────────────────────────
  var markerPool = {};   // icao24 → L.Marker

  function renderFlights(flights) {
    var seen = {};
    var emergencyCount = 0;

    flights.forEach(function(f) {
      if (f.latitude === null || f.longitude === null) return;
      if (f.emergency) emergencyCount++;
      seen[f.icao24] = true;
      var color = altColor(f.altitude, f.emergency, f.on_ground);
      var icon = planeIcon(color, f.heading);

      if (markerPool[f.icao24]) {
        // reuse existing marker — just move + update icon
        markerPool[f.icao24].setLatLng([f.latitude, f.longitude]);
        markerPool[f.icao24].setIcon(icon);
        markerPool[f.icao24]._flightData = f;
      } else {
        var m = L.marker([f.latitude, f.longitude], { icon: icon, title: f.callsign || f.icao24 || '' });
        m._flightData = f;
        m.bindPopup(function() { return buildPopup(m._flightData); }, { maxWidth: 300 });
        m.addTo(markerLayer);
        markerPool[f.icao24] = m;
      }
    });

    // Remove markers for planes no longer in the data
    Object.keys(markerPool).forEach(function(id) {
      if (!seen[id]) {
        markerLayer.removeLayer(markerPool[id]);
        delete markerPool[id];
      }
    });

    return emergencyCount;
  }

  // ── Filter & search logic ─────────────────────────────────────────────────
  var activeCountry = '';
  var activeSearch  = '';

  function applyFilters() {
    var filtered = allFlights.filter(function(f) {
      var matchCountry = !activeCountry || f.origin_country === activeCountry;
      var matchSearch  = !activeSearch  ||
        (f.callsign  && f.callsign.toLowerCase().includes(activeSearch))  ||
        (f.icao24    && f.icao24.toLowerCase().includes(activeSearch));
      return matchCountry && matchSearch;
    });
    renderFlights(filtered);
    updateStats(filtered, allFlights.length);
  }

  // ── Status bar & stats ────────────────────────────────────────────────────
  var statusEl  = document.getElementById('ft-status');
  var countEl   = document.getElementById('ft-count');
  var timeEl    = document.getElementById('ft-time');
  var topEl     = document.getElementById('ft-top-countries');
  var countryEl = document.getElementById('ft-country-filter');

  function updateStats(filtered, total) {
    var emergencyCount = filtered.filter(function(f){ return f.emergency; }).length;
    countEl.textContent = filtered.length.toLocaleString()
      + (filtered.length !== total ? ' / ' + total.toLocaleString() : '')
      + ' flights'
      + (emergencyCount ? '  ⚠ ' + emergencyCount + ' EMERGENCY' : '');

    // Top countries
    var counts = {};
    allFlights.forEach(function(f) {
      var c = f.origin_country || 'Unknown';
      counts[c] = (counts[c] || 0) + 1;
    });
    var sorted = Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a]; });
    topEl.innerHTML = sorted.slice(0,7).map(function(c) {
      var pct = Math.round(counts[c] / allFlights.length * 100);
      var active = c === activeCountry;
      return '<div class="ft-country' + (active ? ' ft-active' : '') + '" data-c="' + c + '">'
        + '<span class="ft-cname">' + c + '</span>'
        + '<span class="ft-cbar"><span style="width:' + pct + '%;background:' + (active ? '#00e5ff' : '#1e88e5') + '"></span></span>'
        + '<span class="ft-cnum">' + counts[c] + '</span>'
        + '</div>';
    }).join('');

    // Country filter dropdown — rebuild only when countries change
    var countries = sorted;
    countryEl.innerHTML = '<option value="">All countries</option>'
      + countries.slice(0,60).map(function(c){ return '<option value="' + c + '"' + (c===activeCountry?' selected':'') + '>' + c + '</option>'; }).join('');
  }

  // Delegate click on top-country rows
  topEl.addEventListener('click', function(e) {
    var row = e.target.closest('.ft-country');
    if (!row) return;
    var c = row.dataset.c;
    activeCountry = (activeCountry === c) ? '' : c;
    countryEl.value = activeCountry;
    applyFilters();
  });

  countryEl.addEventListener('change', function() {
    activeCountry = this.value;
    applyFilters();
  });

  document.getElementById('ft-search').addEventListener('input', function() {
    activeSearch = this.value.trim().toLowerCase();
    applyFilters();
  });

  document.getElementById('ft-clear').addEventListener('click', function() {
    activeCountry = '';
    activeSearch  = '';
    document.getElementById('ft-search').value = '';
    countryEl.value = '';
    applyFilters();
  });

  // ── Legend toggle ─────────────────────────────────────────────────────────
  document.getElementById('ft-legend-toggle').addEventListener('click', function() {
    var leg = document.getElementById('ft-legend');
    leg.style.display = leg.style.display === 'none' ? 'block' : 'none';
  });

  // ── Fetch & refresh ───────────────────────────────────────────────────────
  function updateFlights() {
    fetch('/flights')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        allFlights = data.flights || [];
        applyFilters();
        timeEl.textContent = new Date().toLocaleTimeString();
        statusEl.style.background = 'rgba(10,10,20,0.85)';
      })
      .catch(function() {
        statusEl.style.background = 'rgba(150,0,0,0.8)';
        countEl.textContent = 'Connection error — retrying in 10s';
      });
  }

  updateFlights();
  setInterval(updateFlights, 10000);
})();
{% endmacro %}
""")


class FlightTrackerElement(MacroElement):
    def __init__(self):
        super().__init__()
        self._template = FLIGHT_JS


UI_HTML = Template("""
{% macro header(this, kwargs) %}
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #0d1117; font-family: 'Inter', 'Segoe UI', sans-serif; }

  /* ── Top bar ── */
  #ft-status {
    position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    display: flex; align-items: center; gap: 12px;
    background: rgba(10,10,20,0.85);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid #00e5ff22;
    padding: 7px 14px;
    height: 44px;
  }
  #ft-status .ft-title {
    font-size: 15px; font-weight: 700; color: #00e5ff;
    letter-spacing: .5px; white-space: nowrap; flex-shrink: 0;
  }
  #ft-count { color: #cfd8dc; font-size: 13px; white-space: nowrap; }
  #ft-time  { color: #546e7a; font-size: 12px; margin-left: auto; white-space: nowrap; }
  #ft-refresh-badge {
    color: #37474f; font-size: 11px; white-space: nowrap;
  }

  /* ── Sidebar ── */
  #ft-sidebar {
    position: fixed; top: 44px; left: 0; bottom: 0; z-index: 9990;
    width: 240px;
    background: rgba(10,10,20,0.88);
    backdrop-filter: blur(10px);
    border-right: 1px solid #ffffff0d;
    display: flex; flex-direction: column;
    padding: 12px 10px; gap: 10px;
    overflow-y: auto;
  }
  #ft-sidebar label { font-size: 10px; color: #546e7a; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 2px; display: block; }

  #ft-search {
    width: 100%; background: #111827; border: 1px solid #1e293b;
    color: #e0e0e0; border-radius: 6px; padding: 6px 9px; font-size: 13px;
    outline: none;
  }
  #ft-search:focus { border-color: #00e5ff55; }

  #ft-country-filter {
    width: 100%; background: #111827; border: 1px solid #1e293b;
    color: #e0e0e0; border-radius: 6px; padding: 5px 8px; font-size: 12px;
    outline: none;
  }

  #ft-clear {
    width: 100%; background: #1e293b; border: none; color: #90a4ae;
    border-radius: 6px; padding: 5px 0; font-size: 12px; cursor: pointer;
  }
  #ft-clear:hover { background: #263548; color: #e0e0e0; }

  .ft-section-title { font-size: 10px; color: #546e7a; text-transform: uppercase; letter-spacing: .8px; }

  /* Country rows */
  #ft-top-countries { display: flex; flex-direction: column; gap: 3px; }
  .ft-country {
    display: flex; align-items: center; gap: 5px;
    cursor: pointer; padding: 3px 4px; border-radius: 4px;
    transition: background .15s;
  }
  .ft-country:hover { background: #1e293b; }
  .ft-country.ft-active { background: #0e2a3a; }
  .ft-cname { font-size: 11px; color: #cfd8dc; flex: 0 0 90px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ft-cbar  { flex: 1; height: 5px; background: #1e293b; border-radius: 3px; overflow: hidden; }
  .ft-cbar span { display: block; height: 100%; border-radius: 3px; transition: width .4s; }
  .ft-cnum  { font-size: 11px; color: #546e7a; flex: 0 0 36px; text-align: right; }

  /* ── Legend ── */
  #ft-legend-toggle {
    position: fixed; bottom: 16px; left: 252px; z-index: 9990;
    background: rgba(10,10,20,0.85); border: 1px solid #ffffff11;
    color: #90a4ae; font-size: 11px; border-radius: 6px;
    padding: 4px 9px; cursor: pointer; backdrop-filter: blur(6px);
  }
  #ft-legend {
    display: none;
    position: fixed; bottom: 44px; left: 252px; z-index: 9990;
    background: rgba(10,10,20,0.9); border: 1px solid #ffffff11;
    border-radius: 8px; padding: 10px 12px;
    backdrop-filter: blur(8px);
  }
  .ft-leg-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #cfd8dc; margin: 3px 0; }
  .ft-leg-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }

  /* Push map content below top bar and left of sidebar */
  .leaflet-container { padding-top: 44px !important; padding-left: 240px !important; }

  /* Popup styling */
  .leaflet-popup-content-wrapper {
    background: #0d1117 !important;
    border: 1px solid #00e5ff33 !important;
    box-shadow: 0 4px 24px #00000088 !important;
    border-radius: 8px !important;
  }
  .leaflet-popup-tip { background: #0d1117 !important; }
  .leaflet-popup-close-button { color: #546e7a !important; font-size: 16px !important; top: 6px !important; right: 8px !important; }
  .leaflet-popup-content { margin: 10px 14px !important; }
</style>

<!-- Top bar -->
<div id="ft-status">
  <span class="ft-title">✈ Live Flight Tracker</span>
  <span id="ft-count">Loading…</span>
  <span id="ft-time"></span>
  <span id="ft-refresh-badge">↻ 10s</span>
</div>

<!-- Sidebar -->
<div id="ft-sidebar">
  <div>
    <label>Search callsign / ICAO</label>
    <input id="ft-search" type="text" placeholder="e.g. DLH123…" autocomplete="off" />
  </div>
  <div>
    <label>Filter by country</label>
    <select id="ft-country-filter"><option value="">All countries</option></select>
  </div>
  <button id="ft-clear">Clear filters</button>

  <div class="ft-section-title">Top countries</div>
  <div id="ft-top-countries"></div>
</div>

<!-- Legend toggle -->
<button id="ft-legend-toggle">▲ Legend</button>
<div id="ft-legend">
  <div class="ft-leg-row"><span class="ft-leg-dot" style="background:#ff1744"></span> Emergency (7500/7600/7700)</div>
  <div class="ft-leg-row"><span class="ft-leg-dot" style="background:#00e5ff"></span> Cruise (≥ 10 000 m)</div>
  <div class="ft-leg-row"><span class="ft-leg-dot" style="background:#ff9800"></span> High (6 000–10 000 m)</div>
  <div class="ft-leg-row"><span class="ft-leg-dot" style="background:#ffd740"></span> Mid (1 500–6 000 m)</div>
  <div class="ft-leg-row"><span class="ft-leg-dot" style="background:#66bb6a"></span> Low (< 1 500 m)</div>
  <div class="ft-leg-row"><span class="ft-leg-dot" style="background:#78909c"></span> Ground / unknown</div>
</div>
{% endmacro %}
""")


class UIElement(MacroElement):
    def __init__(self):
        super().__init__()
        self._template = UI_HTML


@app.route("/")
def index():
    m = folium.Map(
        location=[20, 0],
        zoom_start=3,
        tiles="CartoDB dark_matter",
        prefer_canvas=True,
    )
    m.get_root().add_child(UIElement())
    m.get_root().add_child(FlightTrackerElement())
    return m.get_root().render()


@app.route("/flights")
def flights():
    try:
        resp = requests.get(OPENSKY_URL, timeout=12)
        resp.raise_for_status()
        data = resp.json()
        states = data.get("states") or []
        result = []
        for s in states:
            lon = s[5]
            lat = s[6]
            if lon is None or lat is None:
                continue
            squawk = s[14]
            is_emergency = squawk in EMERGENCY_SQUAWKS if squawk else False
            result.append({
                "icao24":         s[0],
                "callsign":       (s[1] or "").strip() or None,
                "origin_country": s[2],
                "longitude":      lon,
                "latitude":       lat,
                "altitude":       s[7],
                "on_ground":      s[8],
                "velocity":       s[9],
                "heading":        s[10],
                "squawk":         squawk,
                "emergency":      is_emergency,
            })
        return jsonify({"flights": result, "count": len(result)})
    except requests.Timeout:
        return jsonify({"error": "OpenSky API timeout", "flights": []}), 200
    except Exception as exc:
        return jsonify({"error": str(exc), "flights": []}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
