const express = require('express');
const { getDB } = require('../data/db');
const { fmtVehicle, fmtPing, getLatestPing } = require('../helpers/formatters');

const router = express.Router();

// GET /vehicles
router.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const list = await db.collection('vehicles').find({}).toArray();
    res.json(list.map(fmtVehicle));
  } catch (err) {
    console.error('Vehicles GET error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// GET /vehicles/:vehicleId
router.get('/:vehicleId', async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const db = await getDB();
    const record = await db.collection('vehicles').findOne({
      $or: [{ id: vehicleId }, { id: String(req.params.vehicleId) }]
    });
    if (!record) return res.status(404).json({ error: 'Vehicle not found' });

    const lastPing = await getLatestPing(vehicleId);
    res.json({ ...fmtVehicle(record), last_ping: lastPing ? fmtPing(lastPing) : null });
  } catch (err) {
    console.error('Vehicle GET by id error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// GET /vehicles/:vehicleId/pings
router.get('/:vehicleId/pings', async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const db = await getDB();
    const vehicle = await db.collection('vehicles').findOne({
      $or: [{ id: vehicleId }, { id: String(req.params.vehicleId) }]
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const pings = await db.collection('pings').find({
      $or: [{ vehicle_id: vehicleId }, { vehicle_id: String(req.params.vehicleId) }]
    }).toArray();
    res.json(pings.map(fmtPing).filter(Boolean));
  } catch (err) {
    console.error('Vehicle pings GET error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// GET /vehicles/:vehicleId/last-position
router.get('/:vehicleId/last-position', async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const db = await getDB();
    const vehicle = await db.collection('vehicles').findOne({
      $or: [{ id: vehicleId }, { id: String(req.params.vehicleId) }]
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const latest = await getLatestPing(vehicleId);
    if (!latest) return res.status(404).json({ error: 'No pings found for this vehicle' });

    res.json({
      vehicle_id: latest.vehicle_id,
      timestamp:  latest.timestamp,
      lat:        latest.latitude !== undefined ? latest.latitude : (latest.lat !== undefined ? latest.lat : null),
      lng:        latest.longitude !== undefined ? latest.longitude : (latest.lng !== undefined ? latest.lng : null),
      speed:      latest.speed ?? null
    });
  } catch (err) {
    console.error('Vehicle last-position GET error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// POST /vehicles
router.post('/', async (req, res) => {
  try {
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

    const db = await getDB();
    await db.collection('vehicles').insertOne(newVehicle);

    res
      .status(201)
      .set('Location', `/vehicles/${newVehicle.id}`)
      .json(fmtVehicle(newVehicle));
  } catch (err) {
    console.error('Vehicle POST error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// PUT /vehicles/:vehicleId — replaces the entire resource
router.put('/:vehicleId', async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const db = await getDB();
    const existing = await db.collection('vehicles').findOne({
      $or: [{ id: vehicleId }, { id: String(req.params.vehicleId) }]
    });
    if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

    const { plateNumber, stationId, device_id, vehicleType } = req.body ?? {};

    const updatedVehicle = { id: vehicleId };
    if (plateNumber !== undefined) updatedVehicle.registration_number = plateNumber;
    if (stationId   !== undefined) updatedVehicle.station_id          = Number(stationId);
    if (device_id   !== undefined) updatedVehicle.device_id           = device_id;
    if (vehicleType !== undefined) updatedVehicle.vehicle_type        = vehicleType;

    await db.collection('vehicles').replaceOne({
      $or: [{ id: vehicleId }, { id: String(req.params.vehicleId) }]
    }, updatedVehicle);
    res.json(fmtVehicle(updatedVehicle));
  } catch (err) {
    console.error('Vehicle PUT error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// DELETE /vehicles/:vehicleId — pings are kept (immutability rule)
router.delete('/:vehicleId', async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const db = await getDB();
    const result = await db.collection('vehicles').deleteOne({
      $or: [{ id: vehicleId }, { id: String(req.params.vehicleId) }]
    });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Vehicle not found' });

    res.status(200).json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error('Vehicle DELETE error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

module.exports = router;
