const express = require('express');
const invitationController = require('../controllers/invitation.controller');
const settlementController = require('../controllers/settlement.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const groupController = require('../controllers/group.controller');
const expenseController = require('../controllers/expense.controller');
const recurringExpenseController = require('../controllers/recurringExpense.controller');

const router = express.Router();

// Every route here requires a logged-in user.
router.use(requireAuth);

router.post('/', groupController.createGroup);
router.get('/', groupController.getMyGroups);
router.get('/:groupId', groupController.getGroupDetail);
router.post('/:groupId/members', groupController.addMember);
router.delete('/:groupId/members/:userId', groupController.removeMember);

// Expenses are nested under a group, since an expense always belongs to one.
router.post('/:groupId/expenses', expenseController.addExpense);
router.get('/:groupId/expenses', expenseController.getGroupExpenses);
router.get('/:groupId/balances', expenseController.getGroupBalances);
router.get('/:groupId/settlements', expenseController.getSettlements);
router.post('/:groupId/settlements', settlementController.recordSettlement);
router.get('/:groupId/settlements/history', settlementController.getSettlementHistory);
router.post('/:groupId/invite', invitationController.inviteToGroup);
router.post('/:groupId/recurring-expenses', recurringExpenseController.createRecurringExpense);
router.get('/:groupId/recurring-expenses', recurringExpenseController.getGroupRecurringExpenses);
router.delete('/:groupId/recurring-expenses/:recurringId', recurringExpenseController.pauseRecurringExpense);
router.post('/recurring-expenses/run-now', recurringExpenseController.runNow);

module.exports = router;