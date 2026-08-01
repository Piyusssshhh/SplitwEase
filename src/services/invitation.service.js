const crypto = require('crypto');
const invitationRepo = require('../repositories/invitation.repository');
const groupRepo = require('../repositories/group.repository');
const userRepo = require('../repositories/user.repository');
const groupService = require('./group.service');
const { sendEmail } = require('../utils/email');
const env = require('../config/env');
const logger = require('../utils/logger');

const INVITE_EXPIRY_DAYS = 7;

function notFoundError(msg) {
  const err = new Error(msg);
  err.statusCode = 404;
  return err;
}
function badRequest(msg) {
  const err = new Error(msg);
  err.statusCode = 400;
  return err;
}

async function inviteToGroup({ groupId, invitedBy, email }) {
  const group = await groupService.assertMembership(groupId, invitedBy);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await invitationRepo.create({ groupId, email, invitedBy, token, expiresAt });

  const inviteLink = `${env.clientUrl}/invite/${token}`;
  await sendEmail({
    to: email,
    subject: `You've been invited to join "${group.name}" on SplitEase`,
    html: `
      <p>You've been invited to join the group <strong>${group.name}</strong> on SplitEase.</p>
      <p><a href="${inviteLink}">Click here to accept the invitation</a></p>
      <p>This invite expires in ${INVITE_EXPIRY_DAYS} days.</p>
    `,
  });

  logger.info('Invitation sent', { groupId, email });
  return invitation;
}

// Public preview — lets a not-yet-logged-in user see what they're being
// invited to before signing up/logging in.
async function previewInvitation(token) {
  const invitation = await invitationRepo.findByToken(token);
  if (!invitation) throw notFoundError('Invitation not found');
  if (invitation.status !== 'pending') throw badRequest('This invitation is no longer valid');
  if (new Date(invitation.expires_at) < new Date()) throw badRequest('This invitation has expired');

  const group = await groupRepo.findById(invitation.group_id);
  return { groupName: group.name, email: invitation.email, expiresAt: invitation.expires_at };
}

async function acceptInvitation({ token, userId }) {
  const invitation = await invitationRepo.findByToken(token);
  if (!invitation) throw notFoundError('Invitation not found');
  if (invitation.status !== 'pending') throw badRequest('This invitation is no longer valid');
  if (new Date(invitation.expires_at) < new Date()) throw badRequest('This invitation has expired');

  const user = await userRepo.findById(userId);

  // Security check: only the invited email can accept — prevents anyone
  // with the link guessing/forwarding it to join as a different account.
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    const err = new Error('This invitation was sent to a different email address');
    err.statusCode = 403;
    throw err;
  }

  await groupRepo.addMember({ groupId: invitation.group_id, userId });
  await invitationRepo.markAccepted(token);

  logger.info('Invitation accepted', { groupId: invitation.group_id, userId });
  return groupRepo.findById(invitation.group_id);
}

module.exports = { inviteToGroup, previewInvitation, acceptInvitation };