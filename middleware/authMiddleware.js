const jwt = require('jsonwebtoken');


// 🔐 VERIFY TOKEN
function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Access denied. No Authorization header provided"
      });
    }

    let token;

    // Accept standard Bearer format
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      // Optional fallback (not recommended for production)
      token = authHeader;
    }

    if (!token) {
      return res.status(401).json({
        message: "Token not found in Authorization header"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // attach user data to request

    next();

  } catch (err) {

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired. Please login again."
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(403).json({
        message: "Invalid token signature"
      });
    }

    return res.status(403).json({
      message: "Token verification failed"
    });
  }
}


// 🔐 VERIFY ROLE (ADMIN / VENDOR)
function verifyRole(role) {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        message: "User not authenticated"
      });
    }

    if (req.user.type !== role) {
      return res.status(403).json({
        message: `Access denied. ${role} role required`
      });
    }

    next();
  };
}


module.exports = { verifyToken, verifyRole };