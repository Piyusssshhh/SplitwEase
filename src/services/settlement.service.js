const settlementRepo = require('../repositories/settlement.repository');
const groupService = require('./group.service');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');

function badRequest(msg) {
  const err = new Error(msg);
  err.statusCode = 400;
  return err;
}

// Records a real-world payment (e.g. "Rahul paid Piyush 1300 via UPI").
// This is an immutable ledger entry — settlements are never edited/deleted,
// only ever added, so the history stays trustworthy.
async function recordSettlement({ groupId, requesterId, fromUser, toUser, amount, note }) {
  await groupService.assertMembership(groupId, requesterId);

  if (fromUser === toUser) {
    throw badRequest('fromUser and toUser cannot be the same person');
  }
  if (!amount || amount <= 0) {
    throw badRequest('amount must be a positive number');
  }

  // Both parties must be group members — settling a debt outside the group makes no sense.
  await groupService.assertMembership(groupId, fromUser);
  await groupService.assertMembership(groupId, toUser);

  const settlement = await settlementRepo.create({ groupId, fromUser, toUser, amount, note });

  // Balances just changed — invalidate the cached settlement suggestions,
  // same pattern as when an expense is added.
  await redisClient.del(`group:${groupId}:settlements`);

  logger.info('Settlement recorded', { groupId, fromUser, toUser, amount });
  return settlement;
}

async function getSettlementHistory(groupId, userId) {
  await groupService.assertMembership(groupId, userId);
  return settlementRepo.findByGroupId(groupId);
}

module.exports = { recordSettlement, getSettlementHistory };