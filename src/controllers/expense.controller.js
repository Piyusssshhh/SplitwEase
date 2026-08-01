const expenseService = require('../services/expense.service');
const { asyncHandler } = require('../middlewares/error.middleware');

const addExpense = asyncHandler(async (req, res) => {
  const { description, amount, currency, splitType, participants } = req.body;

  const expense = await expenseService.addExpense({
    groupId: req.params.groupId,
    paidBy: req.user.id,
    description,
    amount,
    currency,
    splitType: splitType || 'equal',
    participants,
  });

  res.status(201).json(expense);
});

const getGroupExpenses = asyncHandler(async (req, res) => {
  const expenses = await expenseService.getGroupExpenses(req.params.groupId, req.user.id);
  res.status(200).json(expenses);
});

const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(req.params.expenseId, req.user.id);
  res.status(204).send();
});

const getGroupBalances = asyncHandler(async (req, res) => {
  const balances = await expenseService.getGroupBalances(req.params.groupId, req.user.id);
  res.status(200).json(balances);
});

const getSettlements = asyncHandler(async (req, res) => {
  const settlements = await expenseService.getSettlementSuggestions(req.params.groupId, req.user.id);
  res.status(200).json(settlements);
});

module.exports = { addExpense, getGroupExpenses, deleteExpense, getGroupBalances, getSettlements };