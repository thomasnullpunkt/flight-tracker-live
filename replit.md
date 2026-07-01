# Live Flight Tracker

A real-time flight tracking web app with a dark, mission-control aesthetic. Built on React + Vite (frontend) and Express (API), showing live aircraft positions from the OpenSky Network API.

## Run & Operate

- `artifacts/api-server: API Server` workflow — Express server on port 8080, serves `/api`
- `artifacts/flight-web: web` workflow — Vite dev server on port 24588, serves `/`
- Both must be running for the app to work

## Stack

- **Frontend**: React 19, Vite, Tailwind CSS, wouter (routing), TanStack Query, Leaflet + react-leaflet (map), Recharts (charts), Lucide icons
- **Backend**: Node.js, Express 5, TypeScript (esbuild build), pino logging
- **Data**: OpenSky Network free API (no auth required), 8s server-side cache
- **Monorepo**: pnpm workspaces — OpenAPI spec → Orval codegen → typed React Query hooks

## Pages

- `/` — **Live Map**: Leaflet world map, planes colour-coded by altitude, click popup with full details, sidebar callsign/country filter, auto-refresh every 10 s
- `/dashboard` — **Dashboard**: Live stats (total, airborne, on-ground, emergencies), top-country bar chart, altitude-bucket pie chart, 15 s refresh
- `/flights` — **Flights Table**: Sortable, searchable, paginated (100/page) live flight list, 15 s refresh
- `/emergencies` — **Emergencies**: Pulsing-red cards for squawk 7500/7600/7700 aircraft; "All Clear" state when none active, 10 s refresh

## Where things live

```
artifacts/
  api-server/src/routes/flights.ts    # OpenSky proxy + /flights + /flights/stats
  api-server/src/routes/index.ts      # Registers health + flights routers
  flight-web/src/App.tsx              # Wouter router + QueryClient setup
  flight-web/src/pages/map.tsx        # Leaflet map page
  flight-web/src/pages/dashboard.tsx  # Stats + charts page
  flight-web/src/pages/flights.tsx    # Table page
  flight-web/src/pages/emergencies.tsx# Emergency alerts page
  flight-web/src/components/layout.tsx# Sidebar nav with live emergency badge
lib/
  api-spec/openapi.yaml               # OpenAPI contract (source of truth)
  api-client-react/src/generated/     # Orval-generated React Query hooks
  api-zod/src/generated/              # Orval-generated Zod schemas
```

## API Endpoints

- `GET /api/flights` → `{ flights: Flight[], count, cached, stale? }`
- `GET /api/flights/stats` → `{ total, airborne, on_ground, emergency_count, top_countries, altitude_buckets, emergencies, cached }`
- `GET /api/healthz` → `{ status }`

## Architecture decisions

- OpenAPI-first: spec in `lib/api-spec/openapi.yaml`, codegen via `pnpm --filter @workspace/api-spec run codegen`
- Altitude colour tiers: cruise ≥10 000 m → cyan, high 6–10k → orange, mid 1.5–6k → yellow, low <1.5k → green, ground/unknown → grey, emergency → red
- Emergency squawk codes: 7700 (general), 7600 (radio failure), 7500 (hijack)
- Plane icons: Leaflet `L.divIcon` with inline SVG rotated by heading degrees
- 8 s server-side cache in memory; stale data returned on OpenSky timeout
- Proxy routing: `/api` → Express (port 8080), `/` → Vite (port 24588)

## Gotchas

- If `react-leaflet` peer-dep warnings appear (React 19 vs expected 18), they are harmless — the library works fine
- OpenSky free API occasionally rate-limits; server returns stale cached data gracefully
- The old Flask workflow (`artifacts/api-server: Flight Tracker`) is no longer used — only the Express api-server and flight-web Vite workflows are needed

## User preferences

(none set yet)
