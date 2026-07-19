const express = require('express');
const { getDB } = require('../data/db');
const { fmtVehicle, fmtPing, getLatestPing } = require('../helpers/formatters');

const router = express.Router();

// GET /vehicles
router.get('/', async (req, res) => {
  try {
    const list = await getDB().collection('vehicles').find({}).toArray();
    res.json(list.map(fmtVehicle));
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /vehicles/:vehicleId
router.get('/:vehicleId', async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const record = await getDB().collection('vehicles').findOne({ id: vehicleId });
    if (!record) return res.status(404).json({ error: 'Vehicle not found' });

    const lastPing = await getLatestPing(vehicleId);
    res.json({ ...fmtVehicle(record), last_ping: lastPing ? fmtPing(lastPing) : null });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /vehicles/:vehicleId/pings
router.get('/:vehicleId/pings', async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const vehicle = await getDB().collection('vehicles').findOne({ id: vehicleId });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const pings = await getDB().collection('pings').find({ vehicle_id: vehicleId }).toArray();
    res.json(pings.map(fmtPing));
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /vehicles/:vehicleId/last-position
router.get('/:vehicleId/last-position', async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const vehicle = await getDB().collection('vehicles').findOne({ id: vehicleId });
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
    res.status(500).json({ error: 'Database error' });
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

    await getDB().collection('vehicles').insertOne(newVehicle);

    res
      .status(201)
      .set('Location', `/vehicles/${newVehicle.id}`)
      .json(fmtVehicle(newVehicle));
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT /vehicles/:vehicleId — replaces the entire resource
router.put('/:vehicleId', async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const existing = await getDB().collection('vehicles').findOne({ id: vehicleId });
    if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

    const { plateNumber, stationId, device_id, vehicleType } = req.body ?? {};

    const updatedVehicle = { id: vehicleId };
    if (plateNumber !== undefined) updatedVehicle.registration_number = plateNumber;
    if (stationId   !== undefined) updatedVehicle.station_id          = Number(stationId);
    if (device_id   !== undefined) updatedVehicle.device_id           = device_id;
    if (vehicleType !== undefined) updatedVehicle.vehicle_type        = vehicleType;

    await getDB().collection('vehicles').replaceOne({ id: vehicleId }, updatedVehicle);
    res.json(fmtVehicle(updatedVehicle));
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /vehicles/:vehicleId — pings are kept (immutability rule)
router.delete('/:vehicleId', async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const result = await getDB().collection('vehicles').deleteOne({ id: vehicleId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Vehicle not found' });

    res.status(200).json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
