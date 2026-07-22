const crypto = require('crypto');

/**
 * Builds a WSO2 §10.3 compliant collection envelope.
 * Envelope shape: { count, next, previous, data }
 *
 * @param {Array} items - Sliced array of items for current page
 * @param {number} totalCount - Total matching count in database before pagination
 * @param {Object} req - Express request object
 * @param {Object} options - { defaultLimit, maxLimit }
 */
function buildEnvelope(items, totalCount, req, options = {}) {
  const defaultLimit = options.defaultLimit || 10;
  const maxLimit = options.maxLimit || 100;

  // Extract offset & limit from query parameters
  let offset = parseInt(req.query.offset, 10);
  if (isNaN(offset) || offset < 0) offset = 0;

  let limit = parseInt(req.query.limit, 10);
  if (isNaN(limit) || limit <= 0) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  // Construct base URL with protocol & host
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  const fullPath = req.baseUrl + req.path;

  // Helper to build URL string for offset/limit preserving active filters and sort
  function buildUrl(targetOffset, targetLimit) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'offset' && key !== 'limit' && value !== undefined && value !== null) {
        searchParams.set(key, value);
      }
    }
    searchParams.set('offset', targetOffset);
    searchParams.set('limit', targetLimit);

    return `${protocol}://${host}${fullPath}?${searchParams.toString()}`;
  }

  // Next URL: if offset + limit < totalCount
  let next = null;
  if (offset + limit < totalCount) {
    next = buildUrl(offset + limit, limit);
  }

  // Previous URL: if offset > 0
  let previous = null;
  if (offset > 0) {
    const prevOffset = Math.max(0, offset - limit);
    previous = buildUrl(prevOffset, limit);
  }

  return {
    count: totalCount,
    next: next,
    previous: previous,
    data: items
  };
}

/**
 * Calculates MD5 hex ETag string for a given payload object.
 */
function calculateETag(data) {
  const str = JSON.stringify(data);
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `"${hash}"`;
}

module.exports = {
  buildEnvelope,
  calculateETag
};
