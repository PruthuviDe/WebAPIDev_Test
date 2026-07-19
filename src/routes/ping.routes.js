const express = require('express');
const { getDB } = require('../data/db');
const { fmtPing, nextId, getDeviceKey } = require('../helpers/formatters');

const router = express.Router();

// POST /vehicles/:vehicleId/pings
// Auth: X-API-Key header must match getDeviceKey(vehicleIdStr)
// Body: { latitude, longitude, speed }
// Server sets timestamp — device-supplied timestamp is ignored.
router.post('/:vehicleId/pings', async (req, res) => {
  try {
    const vehicleIdStr = req.params.vehicleId;
    const vehicleId    = Number(vehicleIdStr);

    // 401 — header absent
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'Missing X-API-Key header' });

    // 404 — vehicle not found (checked before key match to avoid leaking key info)
    const vehicle = await getDB().collection('vehicles').findOne({ id: vehicleId });
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
      timestamp:  new Date().toISOString()  // server-authoritative timestamp
    };
    await getDB().collection('pings').insertOne(newPing);

    const location     = `/vehicles/${vehicleIdStr}/pings/${newPing.id}`;
    const lastModified = new Date(newPing.timestamp).toUTCString();

    res
      .status(201)
      .set('Location',      location)
      .set('ETag',          `"${newPing.id}"`)
      .set('Last-Modified', lastModified)
      .json(fmtPing(newPing));
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /vehicles/:vehicleId/pings/:pingId
router.get('/:vehicleId/pings/:pingId', async (req, res) => {
  try {
    const vehicleId = Number(req.params.vehicleId);
    const pingId    = Number(req.params.pingId);

    const vehicle = await getDB().collection('vehicles').findOne({ id: vehicleId });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const ping = await getDB().collection('pings').findOne({ id: pingId, vehicle_id: vehicleId });
    if (!ping) return res.status(404).json({ error: 'Ping not found' });

    res.json(fmtPing(ping));
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
