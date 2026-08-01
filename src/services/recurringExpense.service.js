const recurringRepo = require('../repositories/recurringExpense.repository');
const groupService = require('./group.service');
const expenseService = require('./expense.service');
const logger = require('../utils/logger');

function badRequest(msg) {
  const err = new Error(msg);
  err.statusCode = 400;
  return err;
}

const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly'];

// Computes the next run date given a frequency and a starting point.
// Kept as a pure function so it's easy to unit test independent of the DB.
function computeNextRun(frequency, from = new Date()) {
  const next = new Date(from);
  if (frequency === 'daily') next.setDate(next.getDate() + 1);
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  else throw badRequest(`Unknown frequency: ${frequency}`);
  return next;
}

async function createRecurringExpense({
  groupId,
  paidBy,
  description,
  amount,
  splitType,
  participants,
  frequency,
}) {
  await groupService.assertMembership(groupId, paidBy);

  if (!VALID_FREQUENCIES.includes(frequency)) {
    throw badRequest(`frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`);
  }
  if (!description || !amount || amount <= 0) {
    throw badRequest('description and a positive amount are required');
  }

  // Validate the split config up-front using the same logic as regular
  // expenses, so a bad recurring template doesn't silently fail every
  // cycle when the cron job tries to run it later.
  expenseService.calculateSplits({ splitType, amount, participants });

  const nextRunAt = computeNextRun(frequency, new Date());

  const recurring = await recurringRepo.create({
    groupId,
    paidBy,
    description,
    amount,
    splitType,
    participants,
    frequency,
    nextRunAt,
  });

  logger.info('Recurring expense created', { groupId, description, frequency });
  return recurring;
}

async function getGroupRecurringExpenses(groupId, userId) {
  await groupService.assertMembership(groupId, userId);
  return recurringRepo.findByGroupId(groupId);
}

async function pauseRecurringExpense(id, userId, groupId) {
  await groupService.assertMembership(groupId, userId);
  await recurringRepo.setActive(id, false);
}

// The core job: find everything due, create a real expense for each,
// and schedule its next run.
async function processDueRecurringExpenses() {
  const due = await recurringRepo.findDue();

  if (due.length === 0) {
    logger.debug('No recurring expenses due');
    return { processed: 0 };
  }

  let processed = 0;
  for (const item of due) {
    try {
      await expenseService.addExpense({
        groupId: item.group_id,
        paidBy: item.paid_by,
        description: item.description,
        amount: parseFloat(item.amount),
        splitType: item.split_type,
        participants: item.participants,
      });

      const nextRunAt = computeNextRun(item.frequency, new Date(item.next_run_at));
      await recurringRepo.updateNextRun(item.id, nextRunAt);

      logger.info('Recurring expense processed', { id: item.id, description: item.description });
      processed++;
    } catch (err) {
      // One failing recurring expense shouldn't stop the others from processing.
      logger.error('Failed to process recurring expense', { id: item.id, error: err.message });
    }
  }

  return { processed };
}

module.exports = {
  computeNextRun,
  createRecurringExpense,
  getGroupRecurringExpenses,
  pauseRecurringExpense,
  processDueRecurringExpenses,
};