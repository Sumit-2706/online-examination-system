// middleware/auth.js  —  JWT verification + role guard
const jwt = require('jsonwebtoken');

/**
 * Verifies the Bearer token from Authorization header.
 * Attaches decoded payload to req.user = { id, role, email }
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided. Please log in.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;           // { id, role: 'teacher'|'student', email }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Role guard factory — use after authenticate()
 * Example: router.get('/route', authenticate, requireRole('teacher'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied. Insufficient privileges.' });
  }
  next();
};

module.exports = { authenticate, requireRole };
