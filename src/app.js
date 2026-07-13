const express = require('express');
const applyBasicAuth  = require('./middleware/basicAuth');
const geo             = require('./routes/geography.routes');
const vehicleRouter   = require('./routes/vehicle.routes');
const pingRouter      = require('./routes/ping.routes');

const app = express();

// ── Parse JSON bodies ─────────────────────────────────────────────────────────
app.use(express.json());

// ── Auth guard (GET requests only) ────────────────────────────────────────────
app.use(applyBasicAuth);

// ── Root health check ─────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', session: 'NB6007CEM S2' });
});

// ── Geography routes ──────────────────────────────────────────────────────────
app.use('/provinces', geo.provinces);
app.use('/districts', geo.districts);
app.use('/stations',  geo.stations);

// ── Vehicle routes (CRUD + sub-routes) ───────────────────────────────────────
app.use('/vehicles', vehicleRouter);

// ── Ping routes (POST ingestion + GET single ping) ────────────────────────────
// Mounted on /vehicles so params like :vehicleId are accessible.
app.use('/vehicles', pingRouter);

module.exports = app;
