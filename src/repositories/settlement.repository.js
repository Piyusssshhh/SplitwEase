const { query } = require('../config/db');

async function create({ groupId, fromUser, toUser, amount, note }) {
  const result = await query(
    `INSERT INTO settlements (group_id, from_user, to_user, amount, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, group_id, from_user, to_user, amount, note, created_at`,
    [groupId, fromUser, toUser, amount, note || null]
  );
  return result.rows[0];
}

async function findByGroupId(groupId) {
  const result = await query(
    `SELECT s.*, fu.name AS from_name, tu.name AS to_name
     FROM settlements s
     JOIN users fu ON fu.id = s.from_user
     JOIN users tu ON tu.id = s.to_user
     WHERE s.group_id = $1
     ORDER BY s.created_at DESC`,
    [groupId]
  );
  return result.rows;
}

// Net effect of settlements per user in a group: money PAID reduces what
// you owe (increases your net balance), money RECEIVED reduces what you're
// owed (decreases your net balance).
async function getSettlementAdjustments(groupId) {
  const result = await query(
    `SELECT user_id, SUM(delta) AS adjustment FROM (
        SELECT from_user AS user_id, amount AS delta FROM settlements WHERE group_id = $1
        UNION ALL
        SELECT to_user AS user_id, -amount AS delta FROM settlements WHERE group_id = $1
     ) t
     GROUP BY user_id`,
    [groupId]
  );
  return result.rows;
}

module.exports = { create, findByGroupId, getSettlementAdjustments };