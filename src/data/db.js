const { MongoClient } = require('mongodb');
const path = require('path');

let client;
let dbInstance;
let connectPromise;

const seedData = require(path.join(__dirname, '../../seed.json'));

const ATLAS_URI = 'mongodb+srv://pruthuvide_db_user:PgQK5xYiz6pORd0s@cluster0.q8herfx.mongodb.net/police_db?retryWrites=true&w=majority';

async function connectDB() {
  if (dbInstance) return dbInstance;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const uri = process.env.MONGODB_URI || ATLAS_URI;

    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
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
