const express = require('express');
const { getDB } = require('../data/db');
const { fmtProvince, fmtDistrict, fmtStation } = require('../helpers/formatters');

// ── Provinces ─────────────────────────────────────────────────────────────────
const provinces = express.Router();

provinces.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const list = await db.collection('provinces').find({}).toArray();
    res.json(list.map(fmtProvince));
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
    const list = await db.collection('districts').find({}).toArray();
    res.json(list.map(fmtDistrict));
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
    const list = await db.collection('stations').find({}).toArray();
    res.json(list.map(fmtStation));
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
