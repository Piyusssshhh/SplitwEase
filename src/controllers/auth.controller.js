const authService = require('../services/auth.service');
const { asyncHandler } = require('../middlewares/error.middleware');

// Controller layer: parse request, call service, shape response.
// No business logic, no DB queries — just translation between HTTP and Service.

function sanitizeUser(user) {
  // Never send password_hash or google_id back to the client.
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url,
  };
}

const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const { user, accessToken, refreshToken } = await authService.signup({ name, email, password });

  res.status(201).json({ user: sanitizeUser(user), accessToken, refreshToken });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { user, accessToken, refreshToken } = await authService.login({ email, password });

  res.status(200).json({ user: sanitizeUser(user), accessToken, refreshToken });
});

// Called after Passport's Google strategy has already run and attached req.user.
const googleCallback = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken } = await authService.issueTokenPair(req.user);

  // Redirect back to frontend with tokens (in practice, consider a more
  // secure handoff like a one-time code, but this is the simple version).
  const redirectUrl = `${require('../config/env').clientUrl}/oauth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
  res.redirect(redirectUrl);
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  const tokens = await authService.refreshAccessToken(refreshToken);
  res.status(200).json(tokens);
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await authService.logout(refreshToken);
  }
  res.status(204).send();
});

const logoutAllDevices = asyncHandler(async (req, res) => {
  await authService.logoutAllDevices(req.user.id);
  res.status(204).send();
});

module.exports = { signup, login, googleCallback, refresh, logout, logoutAllDevices };
