const settlementService = require('../services/settlement.service');
const { asyncHandler } = require('../middlewares/error.middleware');

const recordSettlement = asyncHandler(async (req, res) => {
  const { fromUser, toUser, amount, note } = req.body;

  if (!fromUser || !toUser || !amount) {
    return res.status(400).json({ error: 'fromUser, toUser, and amount are required' });
  }

  const settlement = await settlementService.recordSettlement({
    groupId: req.params.groupId,
    requesterId: req.user.id,
    fromUser,
    toUser,
    amount,
    note,
  });

  res.status(201).json(settlement);
});

const getSettlementHistory = asyncHandler(async (req, res) => {
  const history = await settlementService.getSettlementHistory(req.params.groupId, req.user.id);
  res.status(200).json(history);
});

module.exports = { recordSettlement, getSettlementHistory };