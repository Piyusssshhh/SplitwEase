const { query, pool } = require('../config/db');

// Creating an expense involves TWO inserts: the expense row itself, and
// one split row per member. These must succeed or fail TOGETHER — if the
// splits fail halfway through, we don't want an orphaned expense with no
// splits (or partial splits). This is exactly what a DB transaction is for.
async function createWithSplits({ groupId, paidBy, description, amount, currency, baseAmount, splitType, splits }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const expenseResult = await client.query(
      `INSERT INTO expenses (group_id, paid_by, description, amount, currency, base_amount, split_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, group_id, paid_by, description, amount, currency, base_amount, split_type, created_at`,
      [groupId, paidBy, description, amount, currency, baseAmount, splitType]
    );
    const expense = expenseResult.rows[0];

    const insertedSplits = [];
    for (const split of splits) {
      const splitResult = await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_owed)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, amount_owed`,
        [expense.id, split.userId, split.amountOwed]
      );
      insertedSplits.push(splitResult.rows[0]);
    }

    await client.query('COMMIT');
    return { ...expense, splits: insertedSplits };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function findById(expenseId) {
  const result = await query('SELECT * FROM expenses WHERE id = $1', [expenseId]);
  return result.rows[0] || null;
}

async function findByGroupId(groupId) {
  const result = await query(
    'SELECT * FROM expenses WHERE group_id = $1 ORDER BY created_at DESC',
    [groupId]
  );
  return result.rows;
}

async function getSplitsForExpense(expenseId) {
  const result = await query(
    `SELECT es.*, u.name, u.email FROM expense_splits es
     JOIN users u ON u.id = es.user_id
     WHERE es.expense_id = $1`,
    [expenseId]
  );
  return result.rows;
}

async function deleteById(expenseId) {
  await query('DELETE FROM expenses WHERE id = $1', [expenseId]);
}

// Sum up, per user, how much they've PAID across all expenses in a group,
// and how much they OWE (from splits). net_balance = total_paid - total_owed.
async function getNetBalancesForGroup(groupId) {
  const result = await query(
    `SELECT
        u.id AS user_id,
        u.name,
        COALESCE(paid.total_paid, 0) AS total_paid,
        COALESCE(owed.total_owed, 0) AS total_owed,
        COALESCE(settled.adjustment, 0) AS settled_adjustment,
        COALESCE(paid.total_paid, 0) - COALESCE(owed.total_owed, 0) + COALESCE(settled.adjustment, 0) AS net_balance
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     LEFT JOIN (
        SELECT paid_by AS user_id, SUM(base_amount) AS total_paid
        FROM expenses WHERE group_id = $1
        GROUP BY paid_by
     ) paid ON paid.user_id = u.id
     LEFT JOIN (
        SELECT es.user_id, SUM(es.amount_owed) AS total_owed
        FROM expense_splits es
        JOIN expenses e ON e.id = es.expense_id
        WHERE e.group_id = $1
        GROUP BY es.user_id
     ) owed ON owed.user_id = u.id
     LEFT JOIN (
        SELECT user_id, SUM(delta) AS adjustment FROM (
            SELECT from_user AS user_id, amount AS delta FROM settlements WHERE group_id = $1
            UNION ALL
            SELECT to_user AS user_id, -amount AS delta FROM settlements WHERE group_id = $1
        ) t
        GROUP BY user_id
     ) settled ON settled.user_id = u.id
     WHERE gm.group_id = $1`,
    [groupId]
  );
  return result.rows;
}

module.exports = {
  createWithSplits,
  findById,
  findByGroupId,
  getSplitsForExpense,
  deleteById,
  getNetBalancesForGroup,
};