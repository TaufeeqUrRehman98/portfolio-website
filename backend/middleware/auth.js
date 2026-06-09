const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Check cookie first, then Authorization header as fallback
  const token = req.cookies?.adminToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. Please login.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    res.clearCookie('adminToken');
    return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
  }
};

module.exports = authMiddleware;
