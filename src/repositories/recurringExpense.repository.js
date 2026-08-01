const { query } = require('../config/db');

async function create({ groupId, paidBy, description, amount, splitType, participants, frequency, nextRunAt }) {
  const result = await query(
    `INSERT INTO recurring_expenses
        (group_id, paid_by, description, amount, split_type, participants, frequency, next_run_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [groupId, paidBy, description, amount, splitType, JSON.stringify(participants), frequency, nextRunAt]
  );
  return result.rows[0];
}

async function findByGroupId(groupId) {
  const result = await query(
    'SELECT * FROM recurring_expenses WHERE group_id = $1 ORDER BY created_at DESC',
    [groupId]
  );
  return result.rows;
}

// Finds every recurring expense that's due to run right now — this is
// what the cron job queries each time it ticks.
async function findDue() {
  const result = await query(
    'SELECT * FROM recurring_expenses WHERE active = true AND next_run_at <= now()'
  );
  return result.rows;
}

async function updateNextRun(id, nextRunAt) {
  await query('UPDATE recurring_expenses SET next_run_at = $1 WHERE id = $2', [nextRunAt, id]);
}

async function setActive(id, active) {
  await query('UPDATE recurring_expenses SET active = $1 WHERE id = $2', [active, id]);
}

module.exports = { create, findByGroupId, findDue, updateNextRun, setActive };