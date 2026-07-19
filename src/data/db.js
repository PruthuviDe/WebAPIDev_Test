const { MongoClient } = require('mongodb');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/police_db';
let client;
let dbInstance;

const seedData = require(path.join(__dirname, '../../seed.json'));

async function connectDB() {
  if (dbInstance) return dbInstance;

  client = new MongoClient(MONGODB_URI);
  await client.connect();
  dbInstance = client.db();

  await seedIfEmpty(dbInstance);

  console.log('MongoDB connected successfully.');
  return dbInstance;
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

function getDB() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return dbInstance;
}

module.exports = { connectDB, getDB };
