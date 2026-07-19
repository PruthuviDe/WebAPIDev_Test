const { MongoClient } = require('mongodb');
const path = require('path');

let client;
let dbInstance;
let connectPromise;

const seedData = require(path.join(__dirname, '../../seed.json'));

const DEFAULT_ATLAS_URI = 'mongodb://pruthuvide_db_user:PgQK5xYiz6pORd0s@ac-0je3era-shard-00-00.q8herfx.mongodb.net:27017,ac-0je3era-shard-00-01.q8herfx.mongodb.net:27017,ac-0je3era-shard-00-02.q8herfx.mongodb.net:27017/police_db?ssl=true&authSource=admin&replicaSet=atlas-b4evjl-shard-0';

async function connectDB() {
  if (dbInstance) return dbInstance;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    let uri = process.env.MONGODB_URI || DEFAULT_ATLAS_URI;
    
    // Convert SRV URI to direct shard URI if SRV DNS resolution is limited on cloud host
    if (uri.startsWith('mongodb+srv://') && uri.includes('q8herfx.mongodb.net')) {
      uri = DEFAULT_ATLAS_URI;
    }

    try {
      client = new MongoClient(uri);
      await client.connect();
      dbInstance = client.db();
    } catch (err) {
      console.warn('Primary MongoDB URI failed, attempting fallback to direct Atlas replica set URI:', err.message);
      client = new MongoClient(DEFAULT_ATLAS_URI);
      await client.connect();
      dbInstance = client.db();
    }

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
