const { query } = require('../config/db');

async function create({ name, createdBy }) {
  const result = await query(
    `INSERT INTO groups (name, created_by) VALUES ($1, $2)
     RETURNING id, name, created_by, created_at`,
    [name, createdBy]
  );
  return result.rows[0];
}

async function findById(groupId) {
  const result = await query('SELECT * FROM groups WHERE id = $1', [groupId]);
  return result.rows[0] || null;
}

async function findByUserId(userId) {
  const result = await query(
    `SELECT g.* FROM groups g
     JOIN group_members gm ON gm.group_id = g.id
     WHERE gm.user_id = $1
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function addMember({ groupId, userId, role = 'member' }) {
  const result = await query(
    `INSERT INTO group_members (group_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id, user_id) DO NOTHING
     RETURNING id, group_id, user_id, role, joined_at`,
    [groupId, userId, role]
  );
  return result.rows[0] || null;
}

async function removeMember({ groupId, userId }) {
  await query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [
    groupId,
    userId,
  ]);
}

async function isMember({ groupId, userId }) {
  const result = await query(
    'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
    [groupId, userId]
  );
  return result.rowCount > 0;
}

async function getMembers(groupId) {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.avatar_url, gm.role, gm.joined_at
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at ASC`,
    [groupId]
  );
  return result.rows;
}

module.exports = {
  create,
  findById,
  findByUserId,
  addMember,
  removeMember,
  isMember,
  getMembers,
};