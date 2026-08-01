const groupService = require('../services/group.service');
const { asyncHandler } = require('../middlewares/error.middleware');

const createGroup = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  const group = await groupService.createGroup({ name: name.trim(), userId: req.user.id });
  res.status(201).json(group);
});

const getMyGroups = asyncHandler(async (req, res) => {
  const groups = await groupService.getUserGroups(req.user.id);
  res.status(200).json(groups);
});

const getGroupDetail = asyncHandler(async (req, res) => {
  const group = await groupService.getGroupDetail(req.params.groupId, req.user.id);
  res.status(200).json(group);
});

const addMember = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const membership = await groupService.addMemberByEmail({
    groupId: req.params.groupId,
    requesterId: req.user.id,
    email,
  });
  res.status(201).json(membership);
});

const removeMember = asyncHandler(async (req, res) => {
  await groupService.removeMember({
    groupId: req.params.groupId,
    requesterId: req.user.id,
    targetUserId: req.params.userId,
  });
  res.status(204).send();
});

module.exports = { createGroup, getMyGroups, getGroupDetail, addMember, removeMember };