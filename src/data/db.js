const { MongoClient } = require('mongodb');
const path = require('path');

let client;
let dbInstance;
let connectPromise;

const seedData = require(path.join(__dirname, '../../seed.json'));

// Clean SRV URI — used as the default if MONGODB_URI is not set or is a legacy string.
// The legacy direct-shard URI (ssl=true, replicaSet=...) causes TLS alert 80 on cloud hosts
// running OpenSSL 3.x. The SRV URI lets the driver negotiate TLS correctly.
const ATLAS_SRV_URI = 'mongodb+srv://pruthuvide_db_user:PgQK5xYiz6pORd0s@cluster0.q8herfx.mongodb.net/police_db?retryWrites=true&w=majority';

function resolveUri() {
  const raw = process.env.MONGODB_URI || '';
  // If env var is unset, is a localhost URI, or is the legacy direct-shard format, use SRV.
  if (!raw || raw.includes('localhost') || raw.includes('shard-00') || raw.includes('ssl=true')) {
    return ATLAS_SRV_URI;
  }
  return raw;
}

async function connectDB() {
  if (dbInstance) return dbInstance;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const uri = resolveUri();
    console.log('Connecting to MongoDB, URI protocol:', uri.startsWith('mongodb+srv') ? 'SRV' : 'standard');

    client = new MongoClient(uri);
    await client.connect();
    dbInstance = client.db();

    await seedIfEmpty(dbInstance);

    console.log('MongoDB connected successfully.');
    return dbInstance;
  })();

  return connectPromise;
}

async function seedIfEmpty(db) {
  const collections = ['provinces', 'districts', 'stations', 'vehicles', 'pings'];
  for (const name of collections) {
    const col = db.collection(name);
    const count = await col.countDocuments();
    if (count === 0 && seedData[name] && seedData[name].length > 0) {
      await col.insertMany(seedData[name]);
      console.log(`Seeded collection '${name}' with ${seedData[name].length} records.`);
    }
  }
}

async function getDB() {
  if (dbInstance) return dbInstance;
  return await connectDB();
}

module.exports = { connectDB, getDB };
