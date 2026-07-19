const express = require('express');
const { jwtAuth }   = require('./middleware/jwtAuth');
const authRouter    = require('./routes/auth.routes');
const geo           = require('./routes/geography.routes');
const vehicleRouter = require('./routes/vehicle.routes');
const pingRouter    = require('./routes/ping.routes');

const app = express();

// ── Parse JSON bodies ─────────────────────────────────────────────────────────
app.use(express.json());

// ── JWT Authentication Guard ───────────────────────────────────────────────────
app.use(jwtAuth);

// ── Root health check ─────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', session: 'NB6007CEM S2', auth: 'JWT + RBAC' });
});

// ── Auth routes (login + user profile) ─────────────────────────────────────────
app.use('/auth', authRouter);

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
