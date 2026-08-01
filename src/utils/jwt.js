const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

// Short-lived access token — carries user identity, verified on every request
// without touching the DB. This is the "stateless" part of the auth strategy.
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiry }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

// Refresh tokens are NOT JWTs — just random opaque strings stored in the DB.
// This is deliberate: since we check the DB on refresh anyway, there's no
// benefit to making it a signed JWT, and a random string is simpler to revoke.
function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function refreshTokenExpiryDate() {
  const days = env.jwt.refreshExpiryDays;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  refreshTokenExpiryDate,
};
