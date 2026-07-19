const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'police_jwt_secret_key_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Sign a new JWT token containing user identity and role claims
const generateToken = (user) => {
  const payload = {
    user_id:    user.id,
    username:   user.username,
    role:       user.role,
    station_id: user.station_id || null
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify and decode a JWT token string
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken,
  JWT_SECRET
};
