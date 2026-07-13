// ── Shape formatters ─────────────────────────────────────────────────────────
// Each function maps a raw seed record to the API response shape.
const fmtProvince = p => ({ province_id: p.id, name: p.name });

const fmtDistrict = d => ({ district_id: d.id, name: d.name, province_id: d.province_id });

const fmtStation = s => ({ station_id: s.id, name: s.name, district_id: s.district_id });

const fmtVehicle = v => ({
  vehicle_id: v.id,
  reg_number: v.registration_number !== undefined ? v.registration_number : null,
  device_id:  v.device_id           !== undefined ? v.device_id           : null,
  station_id: v.station_id          !== undefined ? v.station_id          : null
});

const fmtPing = p => ({
  ping_id:    p.id,
  vehicle_id: p.vehicle_id,
  timestamp:  p.timestamp,
  lat:        p.latitude,
  lng:        p.longitude,
  speed:      p.speed ?? null
});

// ── Query helpers ─────────────────────────────────────────────────────────────
const db = require('../data/db');

// Returns the single most-recent ping for a vehicle, or null if none exist.
const getLatestPing = (vehicleId) =>
  db.pings
    .filter(p => p.vehicle_id === vehicleId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] ?? null;

// Next integer ID for a given in-memory array.
const nextId = (arr) => (arr.length === 0 ? 1 : Math.max(...arr.map(r => r.id)) + 1);

// ── Device API keys ───────────────────────────────────────────────────────────
// Deterministic key per vehicle derived from its numeric id:
//   vehicle 1  → 'key_v001'
//   vehicle 12 → 'key_v012'
// Built once at startup so any authorised device can compute its own key.
const deviceKeys = Object.fromEntries(
  db.vehicles.map(v => [String(v.id), 'key_v' + String(v.id).padStart(3, '0')])
);

module.exports = { fmtProvince, fmtDistrict, fmtStation, fmtVehicle, fmtPing, getLatestPing, nextId, deviceKeys };
