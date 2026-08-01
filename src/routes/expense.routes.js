const express = require('express');
const { requireAuth } = require('../middlewares/auth.middleware');
const expenseController = require('../controllers/expense.controller');

const router = express.Router();

router.use(requireAuth);

// Deleting doesn't need the groupId in the URL since expenseId is already unique.
router.delete('/:expenseId', expenseController.deleteExpense);

module.exports = router;