const groupRepo = require('../repositories/group.repository');
const userRepo = require('../repositories/user.repository');
const logger = require('../utils/logger');

function notFoundError(msg) {
  const err = new Error(msg);
  err.statusCode = 404;
  return err;
}
function forbiddenError(msg) {
  const err = new Error(msg);
  err.statusCode = 403;
  return err;
}

// Creates a group and automatically makes the creator its first member (admin).
async function createGroup({ name, userId }) {
  const group = await groupRepo.create({ name, createdBy: userId });
  await groupRepo.addMember({ groupId: group.id, userId, role: 'admin' });
  logger.info('Group created', { groupId: group.id, createdBy: userId });
  return group;
}

async function getUserGroups(userId) {
  return groupRepo.findByUserId(userId);
}

// Only members can view or act within a group — checked before every action.
async function assertMembership(groupId, userId) {
  const group = await groupRepo.findById(groupId);
  if (!group) throw notFoundError('Group not found');

  const isMember = await groupRepo.isMember({ groupId, userId });
  if (!isMember) throw forbiddenError('You are not a member of this group');

  return group;
}

async function getGroupDetail(groupId, userId) {
  const group = await assertMembership(groupId, userId);
  const members = await groupRepo.getMembers(groupId);
  return { ...group, members };
}

// Invite by email: user must already have a SplitEase account for now.
async function addMemberByEmail({ groupId, requesterId, email }) {
  await assertMembership(groupId, requesterId);

  const userToAdd = await userRepo.findByEmail(email);
  if (!userToAdd) {
    const err = new Error('No user found with this email. They need to sign up first.');
    err.statusCode = 404;
    throw err;
  }

  const alreadyMember = await groupRepo.isMember({ groupId, userId: userToAdd.id });
  if (alreadyMember) {
    const err = new Error('User is already a member of this group');
    err.statusCode = 409;
    throw err;
  }

  const membership = await groupRepo.addMember({ groupId, userId: userToAdd.id });
  logger.info('Member added to group', { groupId, userId: userToAdd.id });
  return membership;
}

async function removeMember({ groupId, requesterId, targetUserId }) {
  const group = await assertMembership(groupId, requesterId);

  // Only the group creator (or the member themself, i.e. "leave group") can remove someone.
  if (requesterId !== targetUserId && group.created_by !== requesterId) {
    throw forbiddenError('Only the group creator can remove other members');
  }

  await groupRepo.removeMember({ groupId, userId: targetUserId });
  logger.info('Member removed from group', { groupId, targetUserId, requesterId });
}

module.exports = {
  createGroup,
  getUserGroups,
  getGroupDetail,
  addMemberByEmail,
  removeMember,
  assertMembership,
};