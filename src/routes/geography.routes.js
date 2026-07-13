const express = require('express');
const db = require('../data/db');
const { fmtProvince, fmtDistrict, fmtStation } = require('../helpers/formatters');

// ── Provinces ─────────────────────────────────────────────────────────────────
const provinces = express.Router();

provinces.get('/', (req, res) => {
  res.json(db.provinces.map(fmtProvince));
});

provinces.get('/:provinceId', (req, res) => {
  const record = db.provinces.find(p => p.id === Number(req.params.provinceId));
  if (!record) return res.status(404).json({ error: 'Province not found' });
  res.json(fmtProvince(record));
});

// ── Districts ─────────────────────────────────────────────────────────────────
const districts = express.Router();

districts.get('/', (req, res) => {
  res.json(db.districts.map(fmtDistrict));
});

districts.get('/:districtId', (req, res) => {
  const record = db.districts.find(d => d.id === Number(req.params.districtId));
  if (!record) return res.status(404).json({ error: 'District not found' });
  res.json(fmtDistrict(record));
});

// ── Stations ──────────────────────────────────────────────────────────────────
const stations = express.Router();

stations.get('/', (req, res) => {
  res.json(db.stations.map(fmtStation));
});

stations.get('/:stationId', (req, res) => {
  const record = db.stations.find(s => s.id === Number(req.params.stationId));
  if (!record) return res.status(404).json({ error: 'Station not found' });
  res.json(fmtStation(record));
});

module.exports = { provinces, districts, stations };
