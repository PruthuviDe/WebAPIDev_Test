// Entry point — connects to MongoDB then binds the app to a port.
const app = require('./src/app');
const { connectDB } = require('./src/data/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  }
}

startServer();
