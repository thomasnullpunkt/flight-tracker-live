import { Router } from "express";
import type { IRouter } from "express";

const router: IRouter = Router();

const OPENSKY_URL = "https://opensky-network.org/api/states/all";
const EMERGENCY_SQUAWKS = new Set(["7700", "7600", "7500"]);

interface Flight {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  longitude: number;
  latitude: number;
  altitude: number | null;
  on_ground: boolean;
  velocity: number | null;
  heading: number | null;
  squawk: string | null;
  emergency: boolean;
}

let cache: { data: Flight[]; ts: number } | null = null;
const CACHE_TTL = 8_000;

async function fetchFlights(): Promise<Flight[]> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) return cache.data;

  const response = await fetch(OPENSKY_URL, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`OpenSky returned ${response.status}`);

  const body = (await response.json()) as { states?: unknown[][] | null };
  const states = body.states ?? [];

  const flights: Flight[] = [];
  for (const s of states) {
    const lon = s[5] as number | null;
    const lat = s[6] as number | null;
    if (lon == null || lat == null) continue;
    const squawk = (s[14] as string | null) ?? null;
    flights.push({
      icao24: s[0] as string,
      callsign: ((s[1] as string) ?? "").trim() || null,
      origin_country: s[2] as string,
      longitude: lon,
      latitude: lat,
      altitude: (s[7] as number | null) ?? null,
      on_ground: Boolean(s[8]),
      velocity: (s[9] as number | null) ?? null,
      heading: (s[10] as number | null) ?? null,
      squawk,
      emergency: squawk != null && EMERGENCY_SQUAWKS.has(squawk),
    });
  }

  cache = { data: flights, ts: now };
  return flights;
}

router.get("/flights", async (req, res) => {
  try {
    const flights = await fetchFlights();
    const cached = cache != null && Date.now() - cache.ts < CACHE_TTL;
    return res.json({ flights, count: flights.length, cached });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.warn({ err: msg }, "OpenSky fetch failed");
    if (cache) return res.json({ flights: cache.data, count: cache.data.length, cached: true, stale: true });
    return res.status(502).json({ error: msg, flights: [] });
  }
});

router.get("/flights/stats", async (req, res) => {
  try {
    const flights = await fetchFlights();
    const cached = cache != null && Date.now() - cache.ts < CACHE_TTL;

    // Country counts
    const countryCounts: Record<string, number> = {};
    for (const f of flights) {
      countryCounts[f.origin_country] = (countryCounts[f.origin_country] ?? 0) + 1;
    }
    const topCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([country, count]) => ({ country, count }));

    // Altitude buckets
    const buckets = [
      { label: "Ground", min: null,  max: 0,     color: "#78909c" },
      { label: "Low (<1.5k m)",   min: 0,    max: 1500,  color: "#66bb6a" },
      { label: "Mid (1.5–6k m)",  min: 1500, max: 6000,  color: "#ffd740" },
      { label: "High (6–10k m)",  min: 6000, max: 10000, color: "#ff9800" },
      { label: "Cruise (>10k m)", min: 10000,max: null,  color: "#00e5ff" },
    ];
    const altitudeBuckets = buckets.map((b) => ({
      label: b.label,
      color: b.color,
      count: flights.filter((f) => {
        if (b.min === null) return f.on_ground;
        if (f.on_ground || f.altitude == null) return false;
        const above = f.altitude >= b.min;
        const below = b.max == null || f.altitude < b.max;
        return above && below;
      }).length,
    }));

    const emergencies = flights
      .filter((f) => f.emergency)
      .map((f) => ({
        icao24: f.icao24,
        callsign: f.callsign,
        squawk: f.squawk!,
        origin_country: f.origin_country,
        latitude: f.latitude,
        longitude: f.longitude,
        altitude: f.altitude,
        velocity: f.velocity,
        emergency: f.emergency,
      }));

    return res.json({
      total: flights.length,
      airborne: flights.filter((f) => !f.on_ground).length,
      on_ground: flights.filter((f) => f.on_ground).length,
      emergency_count: emergencies.length,
      top_countries: topCountries,
      altitude_buckets: altitudeBuckets,
      emergencies,
      cached,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    req.log.warn({ err: msg }, "OpenSky stats failed");
    return res.status(502).json({ error: msg, flights: [] });
  }
});

export default router;
