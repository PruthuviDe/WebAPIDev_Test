// ── Shape formatters ─────────────────────────────────────────────────────────
// Each function maps a raw database record to the API response shape.
const fmtProvince = p => ({ province_id: p.id, name: p.name });

const fmtDistrict = d => ({ district_id: d.id, name: d.name, province_id: d.province_id });

const fmtStation = s => ({ station_id: s.id, name: s.name, district_id: s.district_id });

const fmtVehicle = v => ({
  vehicle_id: v.id,
  reg_number: v.registration_number !== undefined ? v.registration_number : (v.reg_number !== undefined ? v.reg_number : null),
  device_id:  v.device_id           !== undefined ? v.device_id           : null,
  station_id: v.station_id          !== undefined ? v.station_id          : null
});

const fmtPing = p => ({
  ping_id:    p.id,
  vehicle_id: p.vehicle_id,
  timestamp:  p.timestamp,
  lat:        p.latitude !== undefined ? p.latitude : (p.lat !== undefined ? p.lat : null),
  lng:        p.longitude !== undefined ? p.longitude : (p.lng !== undefined ? p.lng : null),
  speed:      p.speed ?? null
});

// ── Query helpers ─────────────────────────────────────────────────────────────
const { getDB } = require('../data/db');

// Returns the single most-recent ping for a vehicle, or null if none exist.
const getLatestPing = async (vehicleId) => {
  const db = getDB();
  return await db.collection('pings')
    .find({ vehicle_id: Number(vehicleId) })
    .sort({ timestamp: -1, id: -1 })
    .limit(1)
    .next();
};

// Next integer ID for a given collection name.
const nextId = async (collectionName) => {
  const db = getDB();
  const latestDoc = await db.collection(collectionName)
    .find({})
    .sort({ id: -1 })
    .limit(1)
    .next();
  return latestDoc && latestDoc.id ? latestDoc.id + 1 : 1;
};

// Deterministic key per vehicle derived from its numeric id:
//   vehicle 1  → 'key_v001'
//   vehicle 12 → 'key_v012'
const getDeviceKey = (vehicleId) => {
  return 'key_v' + String(vehicleId).padStart(3, '0');
};

module.exports = {
  fmtProvince,
  fmtDistrict,
  fmtStation,
  fmtVehicle,
  fmtPing,
  getLatestPing,
  nextId,
  getDeviceKey
};
