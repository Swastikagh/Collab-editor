const jwt = require('jsonwebtoken');

// This middleware runs BEFORE protected route handlers
// It checks if the request has a valid JWT token
const authMiddleware = (req, res, next) => {
  try {
    // Token arrives in header as: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // jwt.verify throws an error if token is invalid or expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request object so controllers can use it
    req.userId = decoded.userId;
    req.userEmail = decoded.email;

    // next() passes control to the actual route handler
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
