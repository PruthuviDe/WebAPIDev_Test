const path = require('path');

// Load seed.json into memory once at startup.
// All routes share this single reference — mutations (push, splice) are visible everywhere.
const db = require(path.join(__dirname, '../../seed.json'));

module.exports = db;
