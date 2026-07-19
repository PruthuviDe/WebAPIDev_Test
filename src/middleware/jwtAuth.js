const { verifyToken } = require('../helpers/jwt');

// Global JWT Authentication Middleware
const jwtAuth = (req, res, next) => {
  // Public bypass routes: Root health check & Authentication endpoint
  if (req.path === '/' || req.path === '/auth/login') {
    return next();
  }

  // Device ingestion bypass: POST /vehicles/:vehicleId/pings uses X-API-Key header
  if (req.method === 'POST' && req.path.match(/^\/vehicles\/[^\/]+\/pings\/?$/)) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(400).json({ error: 'Format must be: Authorization: Bearer <token>' });
  }

  const token = parts[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded; // Attach user claims { user_id, username, role, station_id } to request
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Authentication token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid or corrupted authentication token' });
  }
};

// Role-Based Access Control (RBAC) Guard Factory
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access forbidden: requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = {
  jwtAuth,
  requireRole
};
