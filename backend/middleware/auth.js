const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Validates token from HttpOnly cookie — never from headers/localStorage
 */
const authMiddleware = (req, res, next) => {
  const token = req.cookies?.adminToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check session timeout (30 min inactivity)
    const now = Math.floor(Date.now() / 1000);
    const timeoutSeconds = (parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30) * 60;
    
    if (decoded.lastActivity && (now - decoded.lastActivity) > timeoutSeconds) {
      res.clearCookie('adminToken');
      return res.status(401).json({ success: false, message: 'Session expired due to inactivity.' });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    res.clearCookie('adminToken');
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = authMiddleware;
