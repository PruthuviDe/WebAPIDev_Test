const { MongoClient } = require('mongodb');
const path = require('path');
const bcrypt = require('bcryptjs');

let client;
let dbInstance;
let connectPromise;

const seedData = require(path.join(__dirname, '../../seed.json'));

// Clean SRV URI — used as the default if MONGODB_URI is not set in environment.
const ATLAS_SRV_URI = 'mongodb+srv://pruthuvide_db_user:PgQK5xYiz6pORd0s@cluster0.q8herfx.mongodb.net/police_db?retryWrites=true&w=majority';

function resolveUri() {
  return process.env.MONGODB_URI || ATLAS_SRV_URI;
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
    await seedUsersIfEmpty(dbInstance);

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

async function seedUsersIfEmpty(db) {
  const col = db.collection('users');
  const count = await col.countDocuments();
  if (count === 0) {
    const adminPassword      = await bcrypt.hash('Admin@123', 10);
    const dispatcherPassword = await bcrypt.hash('Dispatch@123', 10);
    const officerPassword    = await bcrypt.hash('Officer@123', 10);

    const initialUsers = [
      {
        id: 1,
        username: 'admin_user',
        password_hash: adminPassword,
        role: 'ADMIN',
        station_id: null,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        username: 'dispatcher_colombo',
        password_hash: dispatcherPassword,
        role: 'DISPATCHER',
        station_id: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        username: 'officer_patrol',
        password_hash: officerPassword,
        role: 'OFFICER',
        station_id: 1,
        created_at: new Date().toISOString()
      }
    ];

    await col.insertMany(initialUsers);
    console.log('Seeded collection \'users\' with 3 default accounts.');
  }
}

async function getDB() {
  if (dbInstance) return dbInstance;
  return await connectDB();
}

module.exports = { connectDB, getDB };
