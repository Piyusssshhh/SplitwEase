const { query } = require('../config/db');

async function create({ groupId, email, invitedBy, token, expiresAt }) {
  const result = await query(
    `INSERT INTO invitations (group_id, email, invited_by, token, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, group_id, email, invited_by, token, status, expires_at, created_at`,
    [groupId, email, invitedBy, token, expiresAt]
  );
  return result.rows[0];
}

async function findByToken(token) {
  const result = await query('SELECT * FROM invitations WHERE token = $1', [token]);
  return result.rows[0] || null;
}

async function markAccepted(token) {
  await query("UPDATE invitations SET status = 'accepted' WHERE token = $1", [token]);
}

module.exports = { create, findByToken, markAccepted };