const express = require('express');
const { getDB } = require('../data/db');
const { fmtPing, nextId, getDeviceKey } = require('../helpers/formatters');
const { buildEnvelope } = require('../helpers/envelope');

const router = express.Router();

// GET /vehicles/:vehicleId/pings — Accessible by ADMIN, DISPATCHER, OFFICER
// Supports: filtering (?from=, ?to=), sorting (?sort=timestamp,asc|desc — defaults to newest first), pagination (?offset=, ?limit=)
router.get('/:vehicleId/pings', async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const db = await getDB();

    const vehicle = await db.collection('vehicles').findOne({
      $or: [{ id: vehicleId }, { id: String(req.params.vehicleId) }]
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    // Construct filter object
    const filter = {
      $or: [{ vehicle_id: vehicleId }, { vehicle_id: String(req.params.vehicleId) }]
    };

    const fromDate = req.query.from;
    const toDate = req.query.to;

    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = fromDate;
      if (toDate)   filter.timestamp.$lte = toDate;
    }

    // Pipeline Step 1: Count total matching documents in DB (Count Gate)
    const totalCount = await db.collection('pings').countDocuments(filter);

    // Pipeline Step 2: Determine sort order (Default: newest first / timestamp descending)
    let sortOrder = { timestamp: -1, id: -1 };
    const sortParam = req.query.sort;
    if (sortParam === 'timestamp,asc' || sortParam === 'asc') {
      sortOrder = { timestamp: 1, id: 1 };
    }

    // Pipeline Step 3: Paginate (offset & limit)
    let offset = parseInt(req.query.offset, 10);
    if (isNaN(offset) || offset < 0) offset = 0;
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0) limit = 10;
    if (limit > 100) limit = 100;

    const pings = await db.collection('pings')
      .find(filter)
      .sort(sortOrder)
      .skip(offset)
      .limit(limit)
      .toArray();

    const formatted = pings.map(fmtPing).filter(Boolean);
    res.json(buildEnvelope(formatted, totalCount, req, { defaultLimit: 10, maxLimit: 100 }));
  } catch (err) {
    console.error('Vehicle pings GET error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// POST /vehicles/:vehicleId/pings
// Auth: X-API-Key header must match getDeviceKey(vehicleIdStr)
// Body: { latitude, longitude, speed }
router.post('/:vehicleId/pings', async (req, res) => {
  try {
    const vehicleIdStr = req.params.vehicleId;
    const vehicleId    = Number(vehicleIdStr);

    // 401 — header absent
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'Missing X-API-Key header' });

    const db = await getDB();

    // 404 — vehicle not found
    const vehicle = await db.collection('vehicles').findOne({
      $or: [{ id: vehicleId }, { id: String(vehicleIdStr) }]
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    // 403 — key does not match this vehicle's expected key
    if (apiKey !== getDeviceKey(vehicleIdStr))
      return res.status(403).json({ error: 'Invalid API key for this vehicle' });

    // 400 — missing required body fields
    const { latitude, longitude, speed } = req.body ?? {};
    if (latitude  === undefined) return res.status(400).json({ error: 'Missing required field: latitude' });
    if (longitude === undefined) return res.status(400).json({ error: 'Missing required field: longitude' });
    if (speed     === undefined) return res.status(400).json({ error: 'Missing required field: speed' });

    // Build and store the new ping
    const newPingId = await nextId('pings');
    const newPing = {
      id:         newPingId,
      vehicle_id: vehicleId,
      latitude:   Number(latitude),
      longitude:  Number(longitude),
      speed:      Number(speed),
      timestamp:  new Date().toISOString() // server-authoritative timestamp
    };
    await db.collection('pings').insertOne(newPing);

    const location     = `/vehicles/${vehicleIdStr}/pings/${newPing.id}`;
    const lastModified = new Date(newPing.timestamp).toUTCString();

    res
      .status(201)
      .set('Location',      location)
      .set('ETag',          `"${newPing.id}"`)
      .set('Last-Modified', lastModified)
      .json(fmtPing(newPing));
  } catch (err) {
    console.error('Ping POST error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// GET /vehicles/:vehicleId/pings/:pingId — Member lookup returns BARE object
router.get('/:vehicleId/pings/:pingId', async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const pingId    = Number(req.params.pingId);

    const db = await getDB();
    const vehicle = await db.collection('vehicles').findOne({
      $or: [{ id: vehicleId }, { id: String(req.params.vehicleId) }]
    });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const ping = await db.collection('pings').findOne({
      id: pingId,
      $or: [{ vehicle_id: vehicleId }, { vehicle_id: String(req.params.vehicleId) }]
    });
    if (!ping) return res.status(404).json({ error: 'Ping not found' });

    res.json(fmtPing(ping));
  } catch (err) {
    console.error('Ping GET by id error:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

module.exports = router;
