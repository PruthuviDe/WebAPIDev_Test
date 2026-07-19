const express = require('express');
const bcrypt = require('bcryptjs');
const { getDB } = require('../data/db');
const { generateToken } = require('../helpers/jwt');

const router = express.Router();

// POST /auth/login — Credential exchange for JWT Bearer token
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password in request body' });
    }

    const db = await getDB();
    const user = await db.collection('users').findOne({ username: String(username).toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);

    res.json({
      token_type: 'Bearer',
      access_token: token,
      expires_in: 3600,
      user: {
        user_id:    user.id,
        username:   user.username,
        role:       user.role,
        station_id: user.station_id || null
      }
    });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /auth/me — Return current authenticated user profile
router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  res.json({
    user: req.user
  });
});

module.exports = router;
