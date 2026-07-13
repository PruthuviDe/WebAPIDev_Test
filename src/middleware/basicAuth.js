// ── Basic Auth middleware ────────────────────────────────────────────────────
// Applied only to GET requests (read routes).
// POST /vehicles/:vehicleId/pings uses X-API-Key instead — not guarded here.
const basicAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.set('WWW-Authenticate', 'Basic realm="Police API"');
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'basic') {
    return res.status(400).json({ error: 'Format must be: Authorization: Basic <credentials>' });
  }

  const credentials = Buffer.from(parts[1], 'base64').toString('ascii').split(':');
  if (credentials.length !== 2) {
    return res.status(400).json({ error: 'Invalid credentials format' });
  }

  const [username, password] = credentials;
  if (username !== 'police' || password !== 'nibm2024') {
    return res.status(403).json({ error: 'Access forbidden: invalid credentials' });
  }

  next();
};

// Guard: apply basicAuth to all GET routes and all admin write routes (POST /vehicles, PUT /vehicles/:id, DELETE /vehicles/:id).
// It must NOT be applied to the device ping ingestion route: POST /vehicles/:vehicleId/pings.
const applyBasicAuth = (req, res, next) => {
  if (req.method === 'POST' && req.path.match(/^\/vehicles\/[^\/]+\/pings\/?$/)) {
    return next();
  }
  return basicAuth(req, res, next);
};

module.exports = applyBasicAuth;
