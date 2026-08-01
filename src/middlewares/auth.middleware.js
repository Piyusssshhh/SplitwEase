const { verifyAccessToken } = require('../utils/jwt');

// Protects routes by requiring a valid access token in the Authorization header.
// This is the "stateless verify" step — no DB call, just signature verification.
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch (err) {
    // Covers both expired and invalid/tampered tokens with the same response —
    // client-side logic is the same either way: refresh or re-login.
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

module.exports = { requireAuth };
