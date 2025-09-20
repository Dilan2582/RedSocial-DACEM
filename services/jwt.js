// services/jwt.js
const jwt = require('jwt-simple');
const moment = require('moment');

const JWT_SECRET = process.env.JWT_SECRET;

const createToken = (user) => {
  const payload = {
    sub: user._id,
    role: user.role || 'user',
    iat: moment().unix(),
    exp: moment().add(30, 'days').unix()  // opcional
  };
  return jwt.encode(payload, JWT_SECRET);
};

module.exports = { createToken };
