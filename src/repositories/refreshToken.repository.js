const { query } = require('../config/db');

async function create({ userId, token, expiresAt }) {
  const result = await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3) RETURNING id, user_id, token, expires_at`,
    [userId, token, expiresAt]
  );
  return result.rows[0];
}

async function findValidToken(token) {
  // "Valid" = exists, not revoked, and not expired.
  const result = await query(
    `SELECT * FROM refresh_tokens
     WHERE token = $1 AND revoked = false AND expires_at > now()`,
    [token]
  );
  return result.rows[0] || null;
}

async function revoke(token) {
  await query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [token]);
}

// Powers "logout from all devices" — delete/revoke every refresh token
// belonging to this user in one shot.
async function revokeAllForUser(userId) {
  await query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);
}

module.exports = { create, findValidToken, revoke, revokeAllForUser };
