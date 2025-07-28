const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');

      return next();
    } catch (error) {
      console.error('Token error:', error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  // Moved outside to cover all missing token cases
  res.status(401);
  throw new Error('Not authorized, no token');
});

module.exports = { protect };
