const { query } = require('../config/db');

// Repository layer: ONLY database queries live here. No password hashing,
// no validation, no decision-making — that belongs in the Service layer.

async function findByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findByGoogleId(googleId) {
  const result = await query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return result.rows[0] || null;
}

async function createLocalUser({ name, email, passwordHash }) {
  const result = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, avatar_url, created_at`,
    [name, email, passwordHash]
  );
  return result.rows[0];
}

async function createGoogleUser({ name, email, googleId, avatarUrl }) {
  const result = await query(
    `INSERT INTO users (name, email, google_id, avatar_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, avatar_url, created_at`,
    [name, email, googleId, avatarUrl]
  );
  return result.rows[0];
}

async function linkGoogleAccount(userId, googleId, avatarUrl) {
  const result = await query(
    `UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2), updated_at = now()
     WHERE id = $3
     RETURNING id, name, email, avatar_url, created_at`,
    [googleId, avatarUrl, userId]
  );
  return result.rows[0];
}

module.exports = {
  findByEmail,
  findById,
  findByGoogleId,
  createLocalUser,
  createGoogleUser,
  linkGoogleAccount,
};
