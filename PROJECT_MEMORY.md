# WebAPIDev_Test — Project Memory

> **Last updated:** 2026-07-05
> **Module:** NB6007CEM · Session: S2
> **Author:** Pruthuvi De Silva · pruthuvidesilva1@gmail.com
> **Repo:** https://github.com/PruthuviDe/WebAPIDev_Test · branch: `prod`
> **Live URL:** https://webapidev-test-8luf.onrender.com

---

## 1. Project Overview

A minimal Express.js REST API (no database, no auth) that serves Sri Lanka police vehicle tracking data from a static `seed.json` file loaded into memory at startup. Built for a coursework submission following WSO2 REST API Design guidelines.

**Stack:**
- Runtime: Node.js ≥ 18
- Framework: Express 4.x
- Data: `seed.json` (in-memory, loaded once at startup via `require()`)
- Deployment: Render (Web Service) — auto-deploys on push to `prod`
- Start command: `node index.js`
- Port: `process.env.PORT || 3000`

---

## 2. File Structure

```
WebAPIDev_Test/
├── index.js          ← sole entry point — all routes live here
├── package.json      ← { "start": "node index.js" }
├── seed.json         ← static data (689 KB, loaded once at startup)
├── render.yaml       ← Render deployment config
├── vercel.json       ← Vercel config (not primary deployment)
├── api/              ← (unused — ignore)
└── .gitignore
```

**Do NOT split routes into separate files unless explicitly asked.**
**Do NOT add a database (MongoDB, Postgres, SQLite, etc.) — seed.json only.**
**Do NOT add authentication or middleware unless explicitly asked.**

---

## 3. seed.json Data Model

Loaded as: `const db = require(path.join(__dirname, 'seed.json'));`

| Key | Count | Fields (raw seed names) |
|-----|-------|------------------------|
| `db.provinces` | 9 | `id`, `name` |
| `db.districts` | 25 | `id`, `name`, `province_id` |
| `db.stations` | 25 | `id`, `name`, `district_id` |
| `db.vehicles` | 200 | `id`, `registration_number`, `device_id`, `station_id` |
| `db.pings` | ~4800 | `id`, `vehicle_id`, `latitude`, `longitude`, `timestamp` |

> ⚠️ `pings` has NO `speed` field in seed data — always output `speed: null`.
> ⚠️ All IDs in seed are **integers** — always coerce with `Number(req.params.id)` before comparison.

---

## 4. API Design Rules (WSO2 §5.1 — NON-NEGOTIABLE)

1. **Lowercase only** — `/vehicles` ✅, `/Vehicles` ❌
2. **Hyphens, not underscores or camelCase** — `/last-position` ✅, `/lastPosition` ❌
3. **Plural nouns for collections** — `/provinces` ✅, `/province` ❌
4. **Singular noun for members** — `/vehicles/:vehicleId` ✅ (collection stays plural)
5. **Nouns not verbs** — `/vehicles` ✅, `/getVehicles` ❌
6. **No envelope wrappers** — return flat `[...]` or `{...}` directly, never `{ "data": [...] }`
7. **snake_case field names** — `vehicle_id` ✅, `vehicleId` ❌
8. **res.json() always** — never `res.send()` for JSON responses
9. **FK fields must be present** — `province_id` on district, `district_id` on station, `station_id` on vehicle

---

## 5. Shape Helpers (index.js lines 9–14)

```js
const fmtProvince = p  => ({ province_id: p.id, name: p.name });
const fmtDistrict = d  => ({ district_id: d.id, name: d.name, province_id: d.province_id });
const fmtStation  = s  => ({ station_id: s.id, name: s.name, district_id: s.district_id });
const fmtVehicle  = v  => ({ vehicle_id: v.id, reg_number: v.registration_number, device_id: v.device_id, station_id: v.station_id });
const fmtPing     = p  => ({ ping_id: p.id, vehicle_id: p.vehicle_id, timestamp: p.timestamp, lat: p.latitude, lng: p.longitude, speed: p.speed ?? null });
```

**Query helper (line 18–21) — single source of truth for "most recent ping":**
```js
const getLatestPing = (vehicleId) =>
  db.pings
    .filter(p => p.vehicle_id === vehicleId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] ?? null;
```
> Use `getLatestPing()` in ALL routes that need the most recent ping. Do NOT duplicate the sort logic.

---

## 6. Complete Route Table

| Method | Path | Response shape | Notes |
|--------|------|---------------|-------|
| GET | `/` | `{ status, session }` | Health check · `session: "NB6007CEM S2"` |
| GET | `/provinces` | `[{ province_id, name }]` | |
| GET | `/provinces/:provinceId` | `{ province_id, name }` | 404 if not found |
| GET | `/districts` | `[{ district_id, name, province_id }]` | |
| GET | `/districts/:districtId` | `{ district_id, name, province_id }` | 404 if not found |
| GET | `/stations` | `[{ station_id, name, district_id }]` | |
| GET | `/stations/:stationId` | `{ station_id, name, district_id }` | 404 if not found |
| GET | `/vehicles` | `[{ vehicle_id, reg_number, device_id, station_id }]` | |
| GET | `/vehicles/:vehicleId` | `{ vehicle_id, reg_number, device_id, station_id, last_ping }` | **Composite** — `last_ping` is nested `fmtPing()` object or `null` |
| GET | `/vehicles/:vehicleId/pings` | `[{ ping_id, vehicle_id, timestamp, lat, lng, speed }]` | All pings for vehicle, scoped |
| GET | `/vehicles/:vehicleId/last-position` | `{ vehicle_id, timestamp, lat, lng, speed }` | **No** `ping_id`, **no** vehicle metadata |

> ⚠️ There is NO bare `GET /pings` route — pings are always scoped to a vehicle.

---

## 7. Error Responses

All 404s return JSON (never HTML):
```json
{ "error": "Province not found" }
{ "error": "District not found" }
{ "error": "Station not found" }
{ "error": "Vehicle not found" }
{ "error": "No pings found for this vehicle" }
```

---

## 8. Deployment

### Render
- **Service:** `WebAPIDev_Test` (`srv-d8n3jnmrnols73d8ro6g`)
- **Branch:** `prod` — auto-deploys on every push
- **URL:** https://webapidev-test-8luf.onrender.com
- **Region:** Virginia
- **Plan:** Free
- **Build:** `npm install` · **Start:** `npm start`

### GitHub
- **Repo:** `PruthuviDe/WebAPIDev_Test`
- **Active branch:** `prod`
- **Push command:** `git push origin prod`

---

## 9. Commit History

| Hash | Message | Date |
|------|---------|------|
| `2f985ac` | Layer 3 - Add /last-position | 2026-06-28 |
| `6358f95` | Layer 2 - Upgrade the vehicle composite | 2026-06-28 |
| `0fc6ef6` | Layer 1 - Fix all atomic routes | 2026-06-28 |
| `a3b2228` | S4: REST routes | 2026-06-28 |
| `e5f33d3` | S2: hello-world app | 2026-06-28 |
| `1783bdf` | S2: seed data | 2026-06-21 |

**Commit message convention:** `Layer N - <description>` or `S<num>: <description>`

---

## 10. Known Issues / Constraints

- `speed` is always `null` — seed.json pings have no speed field. Do not fabricate values.
- All vehicles in the current seed have at least one ping — the `last_ping: null` path exists in code but is not reachable with current data.
- Free Render tier spins down after inactivity — first request after idle may be slow (~30s).
- Do NOT rename `registration_number` back to `reg_number` in seed — `fmtVehicle` does the mapping.

---

## 11. How to Update This File

Whenever a new route, shape change, deployment, or commit is made:
1. Update **Section 6** (Route Table) with the new route and shape.
2. Update **Section 9** (Commit History) with the new commit hash and message.
3. Update **Section 7** if new error messages are added.
4. Update the `Last updated` date at the top.
5. Commit this file alongside the code change.
