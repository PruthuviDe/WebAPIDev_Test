const express = require('express');
const path = require('path');

const app = express();

// Load seed data into memory at startup
const db = require(path.join(__dirname, 'seed.json'));

// ── Shape helpers ────────────────────────────────────────────────────────────
const fmtProvince = p  => ({ province_id: p.id, name: p.name });
const fmtDistrict = d  => ({ district_id: d.id, name: d.name, province_id: d.province_id });
const fmtStation  = s  => ({ station_id: s.id, name: s.name, district_id: s.district_id });
const fmtVehicle  = v  => ({ vehicle_id: v.id, reg_number: v.registration_number, device_id: v.device_id, station_id: v.station_id });
const fmtPing     = p  => ({ ping_id: p.id, vehicle_id: p.vehicle_id, timestamp: p.timestamp, lat: p.latitude, lng: p.longitude, speed: p.speed ?? null });

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

  const lastPing = db.pings
    .filter(p => p.vehicle_id === vehicleId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] ?? null;

  res.json({ ...fmtVehicle(record), last_ping: lastPing ? fmtPing(lastPing) : null });
});

app.get('/vehicles/:vehicleId/pings', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(db.pings.filter(p => p.vehicle_id === vehicleId).map(fmtPing));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
