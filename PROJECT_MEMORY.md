# WebAPIDev_Test — Project Memory

> **Last updated:** 2026-07-19 (post-MongoDB Atlas fix)
> **Module:** NB6007CEM · Session: S2
> **Author:** Pruthuvi De Silva · pruthuvidesilva1@gmail.com
> **Repo:** https://github.com/PruthuviDe/WebAPIDev_Test · branch: `main`
> **Live URL:** https://webapidev-test-8luf.onrender.com

---

## 1. Project Overview

A minimal Express.js REST API that serves Sri Lanka police vehicle tracking data backed by a persistent MongoDB database (auto-seeded from `seed.json` on initial connection). Built for a coursework submission following WSO2 REST API Design guidelines. All read (GET) routes are secured with HTTP Basic Authentication.

**Stack:**
- Runtime: Node.js ≥ 18
- Framework: Express 4.x
- Data: MongoDB (via `mongodb` native driver, connected via `MONGODB_URI`)
- Deployment: Render (Web Service) — auto-deploys on push to `main`
- Start command: `node server.js`
- Port: `process.env.PORT || 3000`

---

## 2. File Structure

```
WebAPIDev_Test/
├── server.js                      ← entry point (connects to MongoDB, listens on port)
├── src/
│   ├── app.js                     ← Express setup, middleware, router mounting
│   ├── data/
│   │   └── db.js                  ← connects to MongoDB, auto-seeds from seed.json if empty
│   ├── middleware/
│   │   └── basicAuth.js           ← Basic Auth guard (GET requests & admin write routes)
│   ├── helpers/
│   │   └── formatters.js          ← fmtProvince/District/Station/Vehicle/Ping,
│   │                                 getLatestPing, nextId, getDeviceKey
│   └── routes/
│       ├── geography.routes.js    ← /provinces, /districts, /stations
│       ├── vehicle.routes.js      ← /vehicles CRUD + sub-routes
│       └── ping.routes.js         ← POST + GET /vehicles/:id/pings
├── package.json                   ← { "start": "node server.js" }
├── seed.json                      ← static seed data for initial MongoDB auto-seeding
├── render.yaml                    ← Render deployment config
└── .gitignore
```

**Database persistence enabled with MongoDB native driver.**
**Do NOT add authentication or middleware unless explicitly asked.**
**Branch `feature/layered-arch` holds the refactored code. Merge to `main` when approved.**

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

## 5. Shape Helpers (src/helpers/formatters.js)

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
| POST | `/vehicles` | `{ vehicle_id, reg_number, device_id, station_id }` | Create a new vehicle. Body: `{ vehicle_id, plateNumber, vehicleType, stationId }` |
| GET | `/vehicles/:vehicleId` | `{ vehicle_id, reg_number, device_id, station_id, last_ping }` | **Composite** — `last_ping` is nested `fmtPing()` object or `null` |
| PUT | `/vehicles/:vehicleId` | `{ vehicle_id, reg_number, device_id, station_id }` | Replace entire vehicle resource. Fields omitted from body are removed |
| DELETE | `/vehicles/:vehicleId` | `{ message }` | Delete vehicle resource. Returns 200. Subsequent calls return 404. Pings remain |
| GET | `/vehicles/:vehicleId/pings` | `[{ ping_id, vehicle_id, timestamp, lat, lng, speed }]` | All pings for vehicle, scoped |
| POST | `/vehicles/:vehicleId/pings` | `{ ping_id, vehicle_id, timestamp, lat, lng, speed }` | Ingest new GPS ping. Requires valid `X-API-Key` |
| GET | `/vehicles/:vehicleId/pings/:pingId` | `{ ping_id, vehicle_id, timestamp, lat, lng, speed }` | Get specific ping |
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
{ "error": "Ping not found" }
{ "error": "Missing X-API-Key header" }
{ "error": "Invalid API key for this vehicle" }
{ "error": "Missing required field: latitude" }
```

---

## 8. Deployment

### Render
- **Service:** `WebAPIDev_Test` (`srv-d8n3jnmrnols73d8ro6g`)
- **Branch:** `main` — auto-deploys on every push
- **URL:** https://webapidev-test-8luf.onrender.com
- **Region:** Virginia
- **Plan:** Free
- **Build:** `npm install` · **Start:** `npm start`

### GitHub
- **Repo:** `PruthuviDe/WebAPIDev_Test`
- **Active branch:** `main`
- **Push command:** `git push origin main`
- **CI/CD Workflow:** `.github/workflows/deploy.yml` triggers Render deployment via Deploy Hook secret (`RENDER_DEPLOY_HOOK`) on push to `main`

### MongoDB Atlas
- **Cluster:** `Cluster0` (Project: `Project 0`, Provider: AWS AP_SOUTH_1)
- **Database:** `police_db`
- **User:** `pruthuvide_db_user`
- **SRV URI (Render env var):** `mongodb+srv://pruthuvide_db_user:<password>@cluster0.q8herfx.mongodb.net/police_db?retryWrites=true&w=majority`
- **Network Access:** `0.0.0.0/0` (allow all IPs — required for Render's dynamic IPs)

> **IMPORTANT:** Always use the `mongodb+srv://` SRV URI in the `MONGODB_URI` Render environment variable. The legacy direct-shard URI (`mongodb://...shard-00...ssl=true`) triggers **TLS alert 80** on Render's OpenSSL 3.x containers and will cause all DB routes to fail with `{ "error": "Database error" }`. The code in `src/data/db.js` has a `resolveUri()` guard that automatically falls back to the hardcoded SRV URI if the env var contains a legacy shard string, but the env var should always be the clean SRV URI.

---

## 9. Commit History

| Hash | Message | Date |
|------|---------|------|
| `41a0d62` | chore: trigger redeploy after Atlas IP access list update | 2026-07-19 |
| `b133d57` | fix: resolveUri detects legacy shard URIs and falls back to clean SRV URI | 2026-07-19 |
| `d39740d` | fix: update MongoClient with explicit tls and tlsAllowInvalidCertificates options | 2026-07-19 |
| `fa6c8ba` | fix: flexible number/string ID matching and null-safe ping formatting | 2026-07-19 |
| `4bbe0d6` | fix: add SRV fallback for MongoDB Atlas cloud connection | 2026-07-19 |
| `d88b7e1` | fix: make MONGODB_URI dynamic inside connectDB | 2026-07-19 |
| `92b1718` | chore: switch deploy branch configuration from prod to main | 2026-07-13 |
| `7222b9c` | Layer 3 - Secure admin write routes with Basic Auth | 2026-07-13 |
| `9ca92e5` | Refactor: split single-file index.js into layered architecture | 2026-07-13 |
| `d0fc2d3` | Layer 4 - Add POST /vehicles/:vehicleId/pings with X-API-Key auth and GET /vehicles/:vehicleId/pings/:pingId | 2026-07-05 |

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
