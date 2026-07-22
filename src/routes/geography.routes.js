const express = require('express');
const { getDB } = require('../data/db');
const { fmtProvince, fmtDistrict, fmtStation } = require('../helpers/formatters');
const { buildEnvelope } = require('../helpers/envelope');

// ── Provinces ─────────────────────────────────────────────────────────────────
const provinces = express.Router();

provinces.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const totalCount = await db.collection('provinces').countDocuments({});
    
    let offset = parseInt(req.query.offset, 10);
    if (isNaN(offset) || offset < 0) offset = 0;
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0) limit = 50;

    const list = await db.collection('provinces').find({}).skip(offset).limit(limit).toArray();
    const formatted = list.map(fmtProvince);

    res.json(buildEnvelope(formatted, totalCount, req, { defaultLimit: 50 }));
  } catch (err) {
    console.error('Provinces GET error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

provinces.get('/:provinceId', async (req, res) => {
  try {
    const db = await getDB();
    const record = await db.collection('provinces').findOne({ id: Number(req.params.provinceId) });
    if (!record) return res.status(404).json({ error: 'Province not found' });
    res.json(fmtProvince(record));
  } catch (err) {
    console.error('Province GET by id error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ── Districts ─────────────────────────────────────────────────────────────────
const districts = express.Router();

districts.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const totalCount = await db.collection('districts').countDocuments({});
    
    let offset = parseInt(req.query.offset, 10);
    if (isNaN(offset) || offset < 0) offset = 0;
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0) limit = 50;

    const list = await db.collection('districts').find({}).skip(offset).limit(limit).toArray();
    const formatted = list.map(fmtDistrict);

    res.json(buildEnvelope(formatted, totalCount, req, { defaultLimit: 50 }));
  } catch (err) {
    console.error('Districts GET error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

districts.get('/:districtId', async (req, res) => {
  try {
    const db = await getDB();
    const record = await db.collection('districts').findOne({ id: Number(req.params.districtId) });
    if (!record) return res.status(404).json({ error: 'District not found' });
    res.json(fmtDistrict(record));
  } catch (err) {
    console.error('District GET by id error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ── Stations ──────────────────────────────────────────────────────────────────
const stations = express.Router();

stations.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const totalCount = await db.collection('stations').countDocuments({});
    
    let offset = parseInt(req.query.offset, 10);
    if (isNaN(offset) || offset < 0) offset = 0;
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0) limit = 50;

    const list = await db.collection('stations').find({}).skip(offset).limit(limit).toArray();
    const formatted = list.map(fmtStation);

    res.json(buildEnvelope(formatted, totalCount, req, { defaultLimit: 50 }));
  } catch (err) {
    console.error('Stations GET error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

stations.get('/:stationId', async (req, res) => {
  try {
    const db = await getDB();
    const record = await db.collection('stations').findOne({ id: Number(req.params.stationId) });
    if (!record) return res.status(404).json({ error: 'Station not found' });
    res.json(fmtStation(record));
  } catch (err) {
    console.error('Station GET by id error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = { provinces, districts, stations };
