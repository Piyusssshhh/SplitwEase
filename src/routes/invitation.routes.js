const express = require('express');
const { requireAuth } = require('../middlewares/auth.middleware');
const invitationController = require('../controllers/invitation.controller');

const router = express.Router();

// Public: anyone with the link can preview it, even before logging in.
router.get('/:token', invitationController.previewInvitation);

// Requires login: accepting actually adds you as a group member.
router.post('/:token/accept', requireAuth, invitationController.acceptInvitation);

module.exports = router;