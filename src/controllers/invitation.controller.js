const invitationService = require('../services/invitation.service');
const { asyncHandler } = require('../middlewares/error.middleware');

const inviteToGroup = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const invitation = await invitationService.inviteToGroup({
    groupId: req.params.groupId,
    invitedBy: req.user.id,
    email,
  });

  res.status(201).json(invitation);
});

// Public — no auth required, so a non-logged-in user can preview the invite.
const previewInvitation = asyncHandler(async (req, res) => {
  const preview = await invitationService.previewInvitation(req.params.token);
  res.status(200).json(preview);
});

const acceptInvitation = asyncHandler(async (req, res) => {
  const group = await invitationService.acceptInvitation({
    token: req.params.token,
    userId: req.user.id,
  });
  res.status(200).json(group);
});

module.exports = { inviteToGroup, previewInvitation, acceptInvitation };