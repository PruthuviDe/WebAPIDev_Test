const express = require('express');
const { getDB } = require('../data/db');
const { fmtVehicle, fmtPing, getLatestPing } = require('../helpers/formatters');
const { requireRole } = require('../middleware/jwtAuth');
const { buildEnvelope, calculateETag } = require('../helpers/envelope');

const router = express.Router();

// GET /vehicles — Accessible by ADMIN, DISPATCHER, OFFICER
// Supports: filtering (?district=, ?province=, ?station_id=), pagination (?offset=, ?limit=)
router.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const filter = {};

    const stationParam = req.query.station_id || req.query.station;
    const districtParam = req.query.district_id || req.query.district;
    const provinceParam = req.query.province_id || req.query.province;

    if (stationParam) {
      const stationIdNum = Number(stationParam);
      filter.station_id = isNaN(stationIdNum) ? stationParam : stationIdNum;
    } else if (districtParam) {
      const districtIdNum = Number(districtParam);
      const distQuery = isNaN(districtIdNum) ? districtParam : districtIdNum;
      const stations = await db.collection('stations').find({
        $or: [{ district_id: distQuery }, { district_id: String(distQuery) }]
      }).toArray();
      const stationIds = stations.map(s => s.id);
      filter.station_id = { $in: stationIds };
    } else if (provinceParam) {
      const provinceIdNum = Number(provinceParam);
      const provQuery = isNaN(provinceIdNum) ? provinceParam : provinceIdNum;
      const districts = await db.collection('districts').find({
        $or: [{ province_id: provQuery }, { province_id: String(provQuery) }]
      }).toArray();
      const districtIds = districts.map(d => d.id);
      const stations = await db.collection('stations').find({
        $or: [{ district_id: { $in: districtIds } }, { district_id: { $in: districtIds.map(String) } }]
      }).toArray();
      const stationIds = stations.map(s => s.id);
      filter.station_id = { $in: stationIds };
    }

    const totalCount = await db.collection('vehicles').countDocuments(filter);

    let offset = parseInt(req.query.offset, 10);
    if (isNaN(offset) || offset < 0) offset = 0;
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0) limit = 10;
    if (limit > 100) limit = 100;

    const list = await db.collection('vehicles')
      .find(filter)
      .sort({ id: 1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const formatted = list.map(fmtVehicle);
    res.json(buildEnvelope(formatted, totalCount, req, { defaultLimit: 10, maxLimit: 100 }));
  } catch (err) {
    console.error('Vehicles GET error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// GET /vehicles/:vehicleId — Accessible by ADMIN, DISPATCHER, OFFICER
// Member route returns BARE composite vehicle object with nested last_ping
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

// GET /vehicles/:vehicleId/last-position — Accessible by ADMIN, DISPATCHER, OFFICER
// Processing function resource with ETag / 304 Not Modified conditional GET
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

    const payload = {
      vehicle_id: latest.vehicle_id,
      timestamp:  latest.timestamp,
      lat:        latest.latitude !== undefined ? latest.latitude : (latest.lat !== undefined ? latest.lat : null),
      lng:        latest.longitude !== undefined ? latest.longitude : (latest.lng !== undefined ? latest.lng : null),
      speed:      latest.speed ?? null
    };

    const etag = calculateETag(payload);
    const ifNoneMatch = req.headers['if-none-match'];

    res.setHeader('ETag', etag);

    if (ifNoneMatch && ifNoneMatch === etag) {
      return res.status(304).end(); // 304 Not Modified with empty body
    }

    res.json(payload);
  } catch (err) {
    console.error('Vehicle last-position GET error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// POST /vehicles — Restricted to ADMIN role
router.post('/', requireRole(['ADMIN']), async (req, res) => {
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

// PUT /vehicles/:vehicleId — Restricted to ADMIN role
router.put('/:vehicleId', requireRole(['ADMIN']), async (req, res) => {
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

// DELETE /vehicles/:vehicleId — Restricted to ADMIN role
router.delete('/:vehicleId', requireRole(['ADMIN']), async (req, res) => {
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
