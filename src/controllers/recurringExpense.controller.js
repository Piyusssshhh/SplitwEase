const recurringExpenseService = require('../services/recurringExpense.service');
const { asyncHandler } = require('../middlewares/error.middleware');

const createRecurringExpense = asyncHandler(async (req, res) => {
  const { description, amount, splitType, participants, frequency } = req.body;

  const recurring = await recurringExpenseService.createRecurringExpense({
    groupId: req.params.groupId,
    paidBy: req.user.id,
    description,
    amount,
    splitType: splitType || 'equal',
    participants,
    frequency,
  });

  res.status(201).json(recurring);
});

const getGroupRecurringExpenses = asyncHandler(async (req, res) => {
  const list = await recurringExpenseService.getGroupRecurringExpenses(
    req.params.groupId,
    req.user.id
  );
  res.status(200).json(list);
});

const pauseRecurringExpense = asyncHandler(async (req, res) => {
  await recurringExpenseService.pauseRecurringExpense(
    req.params.recurringId,
    req.user.id,
    req.params.groupId
  );
  res.status(204).send();
});

// Manual trigger — useful for demoing/testing without waiting for the
// midnight cron tick.
const runNow = asyncHandler(async (req, res) => {
  const result = await recurringExpenseService.processDueRecurringExpenses();
  res.status(200).json(result);
});

module.exports = {
  createRecurringExpense,
  getGroupRecurringExpenses,
  pauseRecurringExpense,
  runNow,
};