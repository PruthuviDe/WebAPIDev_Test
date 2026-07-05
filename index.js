const express = require('express');
const path    = require('path');

const app = express();

// ── Parse JSON bodies for POST / PUT ─────────────────────────────────────────
app.use(express.json());

// ── Load seed data into memory at startup ────────────────────────────────────
const db = require(path.join(__dirname, 'seed.json'));

// ── Shape helpers ────────────────────────────────────────────────────────────
const fmtProvince    = p => ({ province_id:  p.id, name: p.name });
const fmtDistrict    = d => ({ district_id:  d.id, name: d.name, province_id:  d.province_id });
const fmtStation     = s => ({ station_id:   s.id, name: s.name, district_id:  s.district_id });
const fmtVehicle     = v => ({ vehicle_id:   v.id, reg_number: v.registration_number, device_id: v.device_id, station_id: v.station_id });
const fmtPing        = p => ({ ping_id:      p.id, vehicle_id: p.vehicle_id, timestamp: p.timestamp, lat: p.latitude, lng: p.longitude, speed: p.speed ?? null });
const fmtDriver      = d => ({ driver_id:    d.id, first_name: d.first_name, last_name: d.last_name, license_number: d.license_number, phone: d.phone, vehicle_id: d.vehicle_id, status: d.status });
const fmtDriverEmbed = d => ({ driver_id:    d.id, first_name: d.first_name, last_name: d.last_name, status: d.status });
const fmtPassenger   = p => ({ passenger_id: p.id, name: p.name, phone: p.phone });
const fmtTrip        = t => ({ trip_id: t.id, vehicle_id: t.vehicle_id, driver_id: t.driver_id, passenger_id: t.passenger_id, pickup_lat: t.pickup_lat, pickup_lng: t.pickup_lng, dropoff_lat: t.dropoff_lat, dropoff_lng: t.dropoff_lng, pickup_time: t.pickup_time, dropoff_time: t.dropoff_time, fare: t.fare, status: t.status });

// ── Query helpers ─────────────────────────────────────────────────────────────
const getLatestPing = (vehicleId) =>
  db.pings
    .filter(p => p.vehicle_id === vehicleId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] ?? null;

const nextId = (arr) => (arr.length === 0 ? 1 : Math.max(...arr.map(r => r.id)) + 1);

// ── Root ──────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', session: 'NB6007CEM S2' });
});

// ══════════════════════════════════════════════════════════════════════════════
// PROVINCES
// ══════════════════════════════════════════════════════════════════════════════
app.get('/provinces', (req, res) => {
  res.json(db.provinces.map(fmtProvince));
});

app.get('/provinces/:provinceId', (req, res) => {
  const record = db.provinces.find(p => p.id === Number(req.params.provinceId));
  if (!record) return res.status(404).json({ error: 'Province not found' });
  res.json(fmtProvince(record));
});

// ══════════════════════════════════════════════════════════════════════════════
// DISTRICTS
// ══════════════════════════════════════════════════════════════════════════════
app.get('/districts', (req, res) => {
  res.json(db.districts.map(fmtDistrict));
});

app.get('/districts/:districtId', (req, res) => {
  const record = db.districts.find(d => d.id === Number(req.params.districtId));
  if (!record) return res.status(404).json({ error: 'District not found' });
  res.json(fmtDistrict(record));
});

// ══════════════════════════════════════════════════════════════════════════════
// STATIONS (Depots)
// ══════════════════════════════════════════════════════════════════════════════
app.get('/stations', (req, res) => {
  res.json(db.stations.map(fmtStation));
});

app.get('/stations/:stationId', (req, res) => {
  const record = db.stations.find(s => s.id === Number(req.params.stationId));
  if (!record) return res.status(404).json({ error: 'Station not found' });
  res.json(fmtStation(record));
});

// ══════════════════════════════════════════════════════════════════════════════
// VEHICLES
// ══════════════════════════════════════════════════════════════════════════════
app.get('/vehicles', (req, res) => {
  res.json(db.vehicles.map(fmtVehicle));
});

// Composite: vehicle + last_ping + assigned driver
app.get('/vehicles/:vehicleId', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const record    = db.vehicles.find(v => v.id === vehicleId);
  if (!record) return res.status(404).json({ error: 'Vehicle not found' });

  const lastPing = getLatestPing(vehicleId);
  const driver   = db.drivers.find(d => d.vehicle_id === vehicleId) ?? null;

  res.json({
    ...fmtVehicle(record),
    last_ping: lastPing ? fmtPing(lastPing) : null,
    driver:    driver   ? fmtDriverEmbed(driver) : null
  });
});

app.get('/vehicles/:vehicleId/pings', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const vehicle   = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(db.pings.filter(p => p.vehicle_id === vehicleId).map(fmtPing));
});

app.get('/vehicles/:vehicleId/last-position', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const vehicle   = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const latest = getLatestPing(vehicleId);
  if (!latest) return res.status(404).json({ error: 'No pings found for this vehicle' });

  res.json({ vehicle_id: latest.vehicle_id, timestamp: latest.timestamp, lat: latest.latitude, lng: latest.longitude, speed: latest.speed ?? null });
});

// GET /vehicles/:vehicleId/driver — singular: one driver per vehicle
app.get('/vehicles/:vehicleId/driver', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const vehicle   = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const driver = db.drivers.find(d => d.vehicle_id === vehicleId) ?? null;
  if (!driver) return res.status(404).json({ error: 'No driver assigned to this vehicle' });
  res.json(fmtDriver(driver));
});

// GET /vehicles/:vehicleId/trips
app.get('/vehicles/:vehicleId/trips', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const vehicle   = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(db.trips.filter(t => t.vehicle_id === vehicleId).map(fmtTrip));
});

// ══════════════════════════════════════════════════════════════════════════════
// DRIVERS
// ══════════════════════════════════════════════════════════════════════════════
app.get('/drivers', (req, res) => {
  res.json(db.drivers.map(fmtDriver));
});

app.get('/drivers/:driverId', (req, res) => {
  const record = db.drivers.find(d => d.id === Number(req.params.driverId));
  if (!record) return res.status(404).json({ error: 'Driver not found' });
  res.json(fmtDriver(record));
});

app.post('/drivers', (req, res) => {
  const { first_name, last_name, license_number, phone, vehicle_id, status } = req.body;
  for (const field of ['first_name', 'last_name', 'license_number', 'phone', 'vehicle_id', 'status']) {
    if (req.body[field] === undefined) return res.status(400).json({ error: `Missing required field: ${field}` });
  }
  const newDriver = { id: nextId(db.drivers), first_name, last_name, license_number, phone, vehicle_id: Number(vehicle_id), status };
  db.drivers.push(newDriver);
  res.status(201).json(fmtDriver(newDriver));
});

app.put('/drivers/:driverId', (req, res) => {
  const idx = db.drivers.findIndex(d => d.id === Number(req.params.driverId));
  if (idx === -1) return res.status(404).json({ error: 'Driver not found' });
  const { first_name, last_name, license_number, phone, vehicle_id, status } = req.body;
  db.drivers[idx] = { ...db.drivers[idx], first_name, last_name, license_number, phone, vehicle_id: Number(vehicle_id), status };
  res.json(fmtDriver(db.drivers[idx]));
});

app.delete('/drivers/:driverId', (req, res) => {
  const idx = db.drivers.findIndex(d => d.id === Number(req.params.driverId));
  if (idx === -1) return res.status(404).json({ error: 'Driver not found' });
  db.drivers.splice(idx, 1);
  res.status(204).send();
});

// GET /drivers/:driverId/trips
app.get('/drivers/:driverId/trips', (req, res) => {
  const driverId = Number(req.params.driverId);
  const driver   = db.drivers.find(d => d.id === driverId);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  res.json(db.trips.filter(t => t.driver_id === driverId).map(fmtTrip));
});

// ══════════════════════════════════════════════════════════════════════════════
// PASSENGERS
// ══════════════════════════════════════════════════════════════════════════════
app.get('/passengers', (req, res) => {
  res.json(db.passengers.map(fmtPassenger));
});

app.get('/passengers/:passengerId', (req, res) => {
  const record = db.passengers.find(p => p.id === Number(req.params.passengerId));
  if (!record) return res.status(404).json({ error: 'Passenger not found' });
  res.json(fmtPassenger(record));
});

app.post('/passengers', (req, res) => {
  const { name, phone } = req.body;
  for (const field of ['name', 'phone']) {
    if (req.body[field] === undefined) return res.status(400).json({ error: `Missing required field: ${field}` });
  }
  const newPassenger = { id: nextId(db.passengers), name, phone };
  db.passengers.push(newPassenger);
  res.status(201).json(fmtPassenger(newPassenger));
});

app.put('/passengers/:passengerId', (req, res) => {
  const idx = db.passengers.findIndex(p => p.id === Number(req.params.passengerId));
  if (idx === -1) return res.status(404).json({ error: 'Passenger not found' });
  const { name, phone } = req.body;
  db.passengers[idx] = { ...db.passengers[idx], name, phone };
  res.json(fmtPassenger(db.passengers[idx]));
});

app.delete('/passengers/:passengerId', (req, res) => {
  const idx = db.passengers.findIndex(p => p.id === Number(req.params.passengerId));
  if (idx === -1) return res.status(404).json({ error: 'Passenger not found' });
  db.passengers.splice(idx, 1);
  res.status(204).send();
});

// GET /passengers/:passengerId/trips
app.get('/passengers/:passengerId/trips', (req, res) => {
  const passengerId = Number(req.params.passengerId);
  const passenger   = db.passengers.find(p => p.id === passengerId);
  if (!passenger) return res.status(404).json({ error: 'Passenger not found' });
  res.json(db.trips.filter(t => t.passenger_id === passengerId).map(fmtTrip));
});

// ══════════════════════════════════════════════════════════════════════════════
// TRIPS
// ══════════════════════════════════════════════════════════════════════════════
app.get('/trips', (req, res) => {
  res.json(db.trips.map(fmtTrip));
});

app.get('/trips/:tripId', (req, res) => {
  const record = db.trips.find(t => t.id === Number(req.params.tripId));
  if (!record) return res.status(404).json({ error: 'Trip not found' });
  res.json(fmtTrip(record));
});

app.post('/trips', (req, res) => {
  const required = ['vehicle_id', 'driver_id', 'passenger_id', 'pickup_lat', 'pickup_lng', 'pickup_time'];
  for (const field of required) {
    if (req.body[field] === undefined) return res.status(400).json({ error: `Missing required field: ${field}` });
  }
  const { vehicle_id, driver_id, passenger_id, pickup_lat, pickup_lng, pickup_time } = req.body;
  const newTrip = {
    id: nextId(db.trips),
    vehicle_id:   Number(vehicle_id),
    driver_id:    Number(driver_id),
    passenger_id: Number(passenger_id),
    pickup_lat:   Number(pickup_lat),
    pickup_lng:   Number(pickup_lng),
    dropoff_lat:  null,
    dropoff_lng:  null,
    pickup_time,
    dropoff_time: null,
    fare:         null,
    status:       'requested'
  };
  db.trips.push(newTrip);
  res.status(201).json(fmtTrip(newTrip));
});

app.put('/trips/:tripId', (req, res) => {
  const idx = db.trips.findIndex(t => t.id === Number(req.params.tripId));
  if (idx === -1) return res.status(404).json({ error: 'Trip not found' });
  const { vehicle_id, driver_id, passenger_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, pickup_time, dropoff_time, fare, status } = req.body;
  db.trips[idx] = {
    ...db.trips[idx],
    vehicle_id:   Number(vehicle_id)   ?? db.trips[idx].vehicle_id,
    driver_id:    Number(driver_id)    ?? db.trips[idx].driver_id,
    passenger_id: Number(passenger_id) ?? db.trips[idx].passenger_id,
    pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
    pickup_time, dropoff_time,
    fare:   fare !== undefined ? Number(fare) : db.trips[idx].fare,
    status: status ?? db.trips[idx].status
  };
  res.json(fmtTrip(db.trips[idx]));
});

app.delete('/trips/:tripId', (req, res) => {
  const idx = db.trips.findIndex(t => t.id === Number(req.params.tripId));
  if (idx === -1) return res.status(404).json({ error: 'Trip not found' });
  db.trips.splice(idx, 1);
  res.status(204).send();
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
