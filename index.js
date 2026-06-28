const express = require('express');
const path = require('path');

const app = express();

// Load seed data into memory at startup
const db = require(path.join(__dirname, 'seed.json'));

// ── Root ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', session: 'NB6007CEM S2' });
});

// ── Provinces ───────────────────────────────────────────────────────────────
app.get('/provinces', (req, res) => {
  res.json(db.provinces);
});

app.get('/provinces/:provinceId', (req, res) => {
  const record = db.provinces.find(p => p.id === Number(req.params.provinceId));
  if (!record) return res.status(404).json({ error: 'Province not found' });
  res.json(record);
});

// ── Districts ────────────────────────────────────────────────────────────────
app.get('/districts', (req, res) => {
  res.json(db.districts);
});

app.get('/districts/:districtId', (req, res) => {
  const record = db.districts.find(d => d.id === Number(req.params.districtId));
  if (!record) return res.status(404).json({ error: 'District not found' });
  res.json(record);
});

// ── Stations ─────────────────────────────────────────────────────────────────
app.get('/stations', (req, res) => {
  res.json(db.stations);
});

app.get('/stations/:stationId', (req, res) => {
  const record = db.stations.find(s => s.id === Number(req.params.stationId));
  if (!record) return res.status(404).json({ error: 'Station not found' });
  res.json(record);
});

// ── Vehicles ─────────────────────────────────────────────────────────────────
app.get('/vehicles', (req, res) => {
  res.json(db.vehicles);
});

app.get('/vehicles/:vehicleId', (req, res) => {
  const record = db.vehicles.find(v => v.id === Number(req.params.vehicleId));
  if (!record) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(record);
});

app.get('/vehicles/:vehicleId/pings', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  const pings = db.pings.filter(p => p.vehicle_id === vehicleId);
  res.json(pings);
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
