const redisClient = require('../config/redis');
const expenseRepo = require('../repositories/expense.repository');
const groupRepo = require('../repositories/group.repository');
const groupService = require('../services/group.service');
const logger = require('../utils/logger');
const { simplifyDebts } = require('./debtSimplification.service');
const currencyService = require('./currency.service');

function badRequest(msg) {
  const err = new Error(msg);
  err.statusCode = 400;
  return err;
}

// Rounds to 2 decimal places — money should never carry floating point noise.
function round2(n) {
  return Math.round(n * 100) / 100;
}

// Converts the requested split (equal/percentage/exact) into concrete
// amount_owed values per user.
function calculateSplits({ splitType, amount, participants }) {
  if (!participants || participants.length === 0) {
    throw badRequest('At least one participant is required');
  }

  if (splitType === 'equal') {
    const share = round2(amount / participants.length);
    const splits = participants.map((p) => ({ userId: p.userId, amountOwed: share }));

    // Rounding can leave a few cents unaccounted for (e.g. 100/3 = 33.33 x3 = 99.99).
    // Assign the leftover to the first participant so the total always matches exactly.
    const total = round2(share * participants.length);
    const diff = round2(amount - total);
    if (diff !== 0) splits[0].amountOwed = round2(splits[0].amountOwed + diff);

    return splits;
  }

  if (splitType === 'percentage') {
    const totalPercent = participants.reduce((sum, p) => sum + p.percentage, 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      throw badRequest(`Percentages must add up to 100, got ${totalPercent}`);
    }
    return participants.map((p) => ({
      userId: p.userId,
      amountOwed: round2((amount * p.percentage) / 100),
    }));
  }

  if (splitType === 'exact') {
    const totalExact = round2(participants.reduce((sum, p) => sum + p.amountOwed, 0));
    if (Math.abs(totalExact - amount) > 0.01) {
      throw badRequest(`Exact amounts (${totalExact}) must add up to the total (${amount})`);
    }
    return participants.map((p) => ({ userId: p.userId, amountOwed: round2(p.amountOwed) }));
  }

  throw badRequest(`Unknown split type: ${splitType}`);
}

async function addExpense({ groupId, paidBy, description, amount, currency, splitType, participants }) {
  await groupService.assertMembership(groupId, paidBy);

  if (!description || !amount || amount <= 0) {
    throw badRequest('description and a positive amount are required');
  }

  const expenseCurrency = currency || currencyService.BASE_CURRENCY;

  // Convert to the group's base currency (INR) up front — all split math and
  // balance calculations happen in base currency, so debts stay consistent
  // even when expenses are entered in different currencies.
  const baseAmount = await currencyService.convertToBaseCurrency(amount, expenseCurrency);

  const splits = calculateSplits({ splitType, amount: baseAmount, participants });

  const expense = await expenseRepo.createWithSplits({
    groupId,
    paidBy,
    description,
    amount,
    currency: expenseCurrency,
    baseAmount,
    splitType,
    splits,
  });

  logger.info('Expense added', { expenseId: expense.id, groupId, amount, currency: expenseCurrency });

  await redisClient.del(`group:${groupId}:settlements`);

  return expense;
}

async function getGroupExpenses(groupId, userId) {
  await groupService.assertMembership(groupId, userId);
  const expenses = await expenseRepo.findByGroupId(groupId);

  const withSplits = await Promise.all(
    expenses.map(async (exp) => ({
      ...exp,
      splits: await expenseRepo.getSplitsForExpense(exp.id),
    }))
  );
  return withSplits;
}

// Combines net balances with the debt simplification algorithm to give
// the minimal set of transactions needed to settle the group.
// Combines net balances with the debt simplification algorithm to give
// the minimal set of transactions needed to settle the group.
// Cache-aside pattern: check Redis first, compute + cache on a miss,
// invalidate whenever the underlying expenses change (see addExpense/deleteExpense).
async function getSettlementSuggestions(groupId, userId) {
  await groupService.assertMembership(groupId, userId);

  const cacheKey = `group:${groupId}:settlements`;

  const cached = await redisClient.get(cacheKey);
  if (cached) {
    logger.debug('Settlement cache HIT', { groupId });
    return JSON.parse(cached);
  }

  logger.debug('Settlement cache MISS', { groupId });
  const balances = await expenseRepo.getNetBalancesForGroup(groupId);
  const formatted = balances.map((b) => ({
    userId: b.user_id,
    name: b.name,
    netBalance: parseFloat(b.net_balance),
  }));
  const settlements = simplifyDebts(formatted);

  // Cache for 5 minutes as a safety net; manual invalidation below keeps it fresh in real-time.
  await redisClient.set(cacheKey, JSON.stringify(settlements), 'EX', 300);

  return settlements;
}

async function deleteExpense(expenseId, userId) {
  const expense = await expenseRepo.findById(expenseId);
  if (!expense) {
    const err = new Error('Expense not found');
    err.statusCode = 404;
    throw err;
  }

  await groupService.assertMembership(expense.group_id, userId);

  if (expense.paid_by !== userId) {
    const err = new Error('Only the person who added this expense can delete it');
    err.statusCode = 403;
    throw err;
  }

  await expenseRepo.deleteById(expenseId);

  await redisClient.del(`group:${expense.group_id}:settlements`);

  logger.info('Expense deleted', { expenseId, userId });
}

async function getGroupBalances(groupId, userId) {
  await groupService.assertMembership(groupId, userId);
  return expenseRepo.getNetBalancesForGroup(groupId);
}

module.exports = {
  calculateSplits,
  addExpense,
  getGroupExpenses,
  deleteExpense,
  getGroupBalances,
  getSettlementSuggestions,
};