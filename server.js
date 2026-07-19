// Entry point — binds the app to a port and connects to MongoDB.
const app = require('./src/app');
const { connectDB } = require('./src/data/db');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB()
    .then(() => console.log('MongoDB initialization complete.'))
    .catch(err => console.error('MongoDB connection error on startup:', err.message));
});
