/**
 * Authentication Middleware for GBK Bridge Server
 * Checks for a valid "x-gbk-token" header matches GBK_BRIDGE_SECRET
 */
module.exports = (req, res, next) => {
  // Allow public health checks
  if (req.method === 'GET' && (req.path === '/api/health' || req.path === '/health')) {
    return next();
  }

  const token = req.headers['x-gbk-token'];
  const secret = process.env.GBK_BRIDGE_SECRET || 'gbk-local-secret-2024';

  if (!token || token !== secret) {
    console.warn(`[Unauthorized Access Attempt] URL: ${req.url}, Method: ${req.method}, IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid x-gbk-token header.' });
  }

  next();
};
