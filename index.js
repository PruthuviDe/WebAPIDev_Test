const express = require('express');
const path = require('path');

const app = express();

// ── Parse JSON bodies for POST ───────────────────────────────────────────────
app.use(express.json());

// ── Basic Auth Middleware ────────────────────────────────────────────────────
const basicAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.set('WWW-Authenticate', 'Basic realm="Police API"');
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'basic') {
    return res.status(400).json({ error: 'Format must be: Authorization: Basic <credentials>' });
  }

  const credentials = Buffer.from(parts[1], 'base64').toString('ascii').split(':');
  if (credentials.length !== 2) {
    return res.status(400).json({ error: 'Invalid credentials format' });
  }

  const [username, password] = credentials;
  if (username !== 'police' || password !== 'nibm2024') {
    return res.status(403).json({ error: 'Access forbidden: invalid credentials' });
  }

  next();
};

// Apply Basic Auth only to GET requests
app.use((req, res, next) => {
  if (req.method === 'GET') {
    return basicAuth(req, res, next);
  }
  next();
});

// ── Load seed data into memory at startup ────────────────────────────────────
const db = require(path.join(__dirname, 'seed.json'));

// ── Shape helpers ────────────────────────────────────────────────────────────
const fmtProvince = p  => ({ province_id: p.id, name: p.name });
const fmtDistrict = d  => ({ district_id: d.id, name: d.name, province_id: d.province_id });
const fmtStation  = s  => ({ station_id: s.id, name: s.name, district_id: s.district_id });
const fmtVehicle  = v  => ({
  vehicle_id: v.id,
  reg_number: v.registration_number !== undefined ? v.registration_number : null,
  device_id: v.device_id !== undefined ? v.device_id : null,
  station_id: v.station_id !== undefined ? v.station_id : null
});
const fmtPing     = p  => ({ ping_id: p.id, vehicle_id: p.vehicle_id, timestamp: p.timestamp, lat: p.latitude, lng: p.longitude, speed: p.speed ?? null });

// ── Query helpers ─────────────────────────────────────────────────────────────
// Returns the single most-recent ping for a vehicle, or null if none exist.
const getLatestPing = (vehicleId) =>
  db.pings
    .filter(p => p.vehicle_id === vehicleId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] ?? null;

// Next integer ID for a given in-memory array.
const nextId = (arr) => (arr.length === 0 ? 1 : Math.max(...arr.map(r => r.id)) + 1);

// ── Device API keys ───────────────────────────────────────────────────────────
// Deterministic key per vehicle derived from its numeric id:
//   vehicle 1  → key 'key_v001'
//   vehicle 12 → key 'key_v012'
// Built once at startup so any authorised device can compute its own key.
const deviceKeys = Object.fromEntries(
  db.vehicles.map(v => [String(v.id), 'key_v' + String(v.id).padStart(3, '0')])
);

// ── Root ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', session: 'NB6007CEM S2' });
});

// ── Provinces ───────────────────────────────────────────────────────────────
app.get('/provinces', (req, res) => {
  res.json(db.provinces.map(fmtProvince));
});

app.get('/provinces/:provinceId', (req, res) => {
  const record = db.provinces.find(p => p.id === Number(req.params.provinceId));
  if (!record) return res.status(404).json({ error: 'Province not found' });
  res.json(fmtProvince(record));
});

// ── Districts ────────────────────────────────────────────────────────────────
app.get('/districts', (req, res) => {
  res.json(db.districts.map(fmtDistrict));
});

app.get('/districts/:districtId', (req, res) => {
  const record = db.districts.find(d => d.id === Number(req.params.districtId));
  if (!record) return res.status(404).json({ error: 'District not found' });
  res.json(fmtDistrict(record));
});

// ── Stations ─────────────────────────────────────────────────────────────────
app.get('/stations', (req, res) => {
  res.json(db.stations.map(fmtStation));
});

app.get('/stations/:stationId', (req, res) => {
  const record = db.stations.find(s => s.id === Number(req.params.stationId));
  if (!record) return res.status(404).json({ error: 'Station not found' });
  res.json(fmtStation(record));
});

// ── Vehicles ─────────────────────────────────────────────────────────────────
app.get('/vehicles', (req, res) => {
  res.json(db.vehicles.map(fmtVehicle));
});

app.get('/vehicles/:vehicleId', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const record = db.vehicles.find(v => v.id === vehicleId);
  if (!record) return res.status(404).json({ error: 'Vehicle not found' });

  const lastPing = getLatestPing(vehicleId);
  res.json({ ...fmtVehicle(record), last_ping: lastPing ? fmtPing(lastPing) : null });
});

app.get('/vehicles/:vehicleId/pings', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(db.pings.filter(p => p.vehicle_id === vehicleId).map(fmtPing));
});

app.get('/vehicles/:vehicleId/last-position', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const latest = getLatestPing(vehicleId);
  if (!latest) return res.status(404).json({ error: 'No pings found for this vehicle' });

  res.json({
    vehicle_id: latest.vehicle_id,
    timestamp:  latest.timestamp,
    lat:        latest.latitude,
    lng:        latest.longitude,
    speed:      latest.speed ?? null
  });
});

// ── Vehicle CRUD ──────────────────────────────────────────────────────────────
// POST /vehicles
// Body: { vehicle_id, plateNumber, vehicleType, stationId }
app.post('/vehicles', (req, res) => {
  const { vehicle_id, plateNumber, vehicleType, stationId } = req.body ?? {};

  if (vehicle_id === undefined) return res.status(400).json({ error: 'Missing required field: vehicle_id' });
  if (plateNumber === undefined) return res.status(400).json({ error: 'Missing required field: plateNumber' });
  if (vehicleType === undefined) return res.status(400).json({ error: 'Missing required field: vehicleType' });
  if (stationId === undefined) return res.status(400).json({ error: 'Missing required field: stationId' });

  // Map to database object schema
  const newVehicle = {
    id: Number(vehicle_id),
    registration_number: plateNumber,
    station_id: Number(stationId),
    vehicle_type: vehicleType
  };

  db.vehicles.push(newVehicle);

  res
    .status(201)
    .set('Location', `/vehicles/${newVehicle.id}`)
    .json(fmtVehicle(newVehicle));
});

// PUT /vehicles/:vehicleId
// Replaces the entire resource. Fields not in body are removed.
app.put('/vehicles/:vehicleId', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const idx = db.vehicles.findIndex(v => v.id === vehicleId);
  if (idx === -1) return res.status(404).json({ error: 'Vehicle not found' });

  const { plateNumber, stationId, device_id, vehicleType } = req.body ?? {};

  const updatedVehicle = {
    id: vehicleId
  };

  if (plateNumber !== undefined) updatedVehicle.registration_number = plateNumber;
  if (stationId !== undefined) updatedVehicle.station_id = Number(stationId);
  if (device_id !== undefined) updatedVehicle.device_id = device_id;
  if (vehicleType !== undefined) updatedVehicle.vehicle_type = vehicleType;

  db.vehicles[idx] = updatedVehicle;

  res.json(fmtVehicle(updatedVehicle));
});

// DELETE /vehicles/:vehicleId
// Returns 200 on success. Second call returns 404. Pings remain in db.pings.
app.delete('/vehicles/:vehicleId', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const idx = db.vehicles.findIndex(v => v.id === vehicleId);
  if (idx === -1) return res.status(404).json({ error: 'Vehicle not found' });

  db.vehicles.splice(idx, 1);
  res.status(200).json({ message: 'Vehicle deleted successfully' });
});

// ── Ping ingestion ────────────────────────────────────────────────────────────
// POST /vehicles/:vehicleId/pings
// Auth:   X-API-Key header must match deviceKeys[vehicleId]
// Body:   { latitude, longitude, speed }
// Server sets timestamp.
app.post('/vehicles/:vehicleId/pings', (req, res) => {
  const vehicleIdStr = req.params.vehicleId;
  const vehicleId    = Number(vehicleIdStr);

  // 401 — header absent
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'Missing X-API-Key header' });

  // 404 — vehicle not found (checked before key match to avoid leaking key info)
  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  // 403 — key does not match this vehicle's expected key
  if (apiKey !== deviceKeys[vehicleIdStr])
    return res.status(403).json({ error: 'Invalid API key for this vehicle' });

  // 400 — missing required body fields
  const { latitude, longitude, speed } = req.body ?? {};
  if (latitude  === undefined) return res.status(400).json({ error: 'Missing required field: latitude' });
  if (longitude === undefined) return res.status(400).json({ error: 'Missing required field: longitude' });
  if (speed     === undefined) return res.status(400).json({ error: 'Missing required field: speed' });

  // Build and store the new ping
  const newPing = {
    id:         nextId(db.pings),
    vehicle_id: vehicleId,
    latitude:   Number(latitude),
    longitude:  Number(longitude),
    speed:      Number(speed),
    timestamp:  new Date().toISOString()   // server-authoritative timestamp
  };
  db.pings.push(newPing);

  const location     = `/vehicles/${vehicleIdStr}/pings/${newPing.id}`;
  const lastModified = new Date(newPing.timestamp).toUTCString();

  res
    .status(201)
    .set('Location',      location)
    .set('ETag',          `"${newPing.id}"`)
    .set('Last-Modified', lastModified)
    .json(fmtPing(newPing));
});

// GET /vehicles/:vehicleId/pings/:pingId
app.get('/vehicles/:vehicleId/pings/:pingId', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const pingId    = Number(req.params.pingId);

  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const ping = db.pings.find(p => p.id === pingId && p.vehicle_id === vehicleId);
  if (!ping) return res.status(404).json({ error: 'Ping not found' });

  res.json(fmtPing(ping));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
