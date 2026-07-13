const express = require('express');
const db = require('../data/db');
const { fmtVehicle, fmtPing, getLatestPing, nextId } = require('../helpers/formatters');

const router = express.Router();

// GET /vehicles
router.get('/', (req, res) => {
  res.json(db.vehicles.map(fmtVehicle));
});

// GET /vehicles/:vehicleId
router.get('/:vehicleId', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const record = db.vehicles.find(v => v.id === vehicleId);
  if (!record) return res.status(404).json({ error: 'Vehicle not found' });

  const lastPing = getLatestPing(vehicleId);
  res.json({ ...fmtVehicle(record), last_ping: lastPing ? fmtPing(lastPing) : null });
});

// GET /vehicles/:vehicleId/pings
router.get('/:vehicleId/pings', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(db.pings.filter(p => p.vehicle_id === vehicleId).map(fmtPing));
});

// GET /vehicles/:vehicleId/last-position
router.get('/:vehicleId/last-position', (req, res) => {
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

// POST /vehicles
router.post('/', (req, res) => {
  const { vehicle_id, plateNumber, vehicleType, stationId } = req.body ?? {};

  if (vehicle_id === undefined) return res.status(400).json({ error: 'Missing required field: vehicle_id' });
  if (plateNumber === undefined) return res.status(400).json({ error: 'Missing required field: plateNumber' });
  if (vehicleType === undefined) return res.status(400).json({ error: 'Missing required field: vehicleType' });
  if (stationId   === undefined) return res.status(400).json({ error: 'Missing required field: stationId' });

  const newVehicle = {
    id:                  Number(vehicle_id),
    registration_number: plateNumber,
    station_id:          Number(stationId),
    vehicle_type:        vehicleType
  };

  db.vehicles.push(newVehicle);

  res
    .status(201)
    .set('Location', `/vehicles/${newVehicle.id}`)
    .json(fmtVehicle(newVehicle));
});

// PUT /vehicles/:vehicleId  — replaces the entire resource
router.put('/:vehicleId', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const idx = db.vehicles.findIndex(v => v.id === vehicleId);
  if (idx === -1) return res.status(404).json({ error: 'Vehicle not found' });

  const { plateNumber, stationId, device_id, vehicleType } = req.body ?? {};

  const updatedVehicle = { id: vehicleId };
  if (plateNumber !== undefined) updatedVehicle.registration_number = plateNumber;
  if (stationId   !== undefined) updatedVehicle.station_id          = Number(stationId);
  if (device_id   !== undefined) updatedVehicle.device_id           = device_id;
  if (vehicleType !== undefined) updatedVehicle.vehicle_type        = vehicleType;

  db.vehicles[idx] = updatedVehicle;
  res.json(fmtVehicle(updatedVehicle));
});

// DELETE /vehicles/:vehicleId — pings are kept (immutability rule)
router.delete('/:vehicleId', (req, res) => {
  const vehicleId = Number(req.params.vehicleId);
  const idx = db.vehicles.findIndex(v => v.id === vehicleId);
  if (idx === -1) return res.status(404).json({ error: 'Vehicle not found' });

  db.vehicles.splice(idx, 1);
  res.status(200).json({ message: 'Vehicle deleted successfully' });
});

module.exports = router;
