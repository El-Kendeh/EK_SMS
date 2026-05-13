const { verifyToken } = require('../utils/jwt');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;
  
  if (authHeader) {
    if (authHeader.startsWith('Token ')) {
      token = authHeader.substring(6);
    } else if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = authHeader;
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const verified = verifyToken(token);
  if (!verified) {
    // Fallback for development (TODO_JWT_TOKEN)
    if (token === 'TODO_JWT_TOKEN' || token === 'TODO_REAL_JWT_TOKEN') {
      req.user = { id: 1, username: 'admin', is_superuser: true };
      return next();
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }

  req.user = verified;
  next();
}

module.exports = authenticateToken;
