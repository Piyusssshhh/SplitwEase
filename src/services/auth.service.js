const bcrypt = require('bcrypt');
const userRepo = require('../repositories/user.repository');
const refreshTokenRepo = require('../repositories/refreshToken.repository');
const { signAccessToken, generateRefreshToken, refreshTokenExpiryDate } = require('../utils/jwt');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;

// Issues a fresh access + refresh token pair for a user, and persists
// the refresh token so it can be looked up / revoked later.
async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();

  await refreshTokenRepo.create({
    userId: user.id,
    token: refreshToken,
    expiresAt: refreshTokenExpiryDate(),
  });

  return { accessToken, refreshToken };
}

async function signup({ name, email, password }) {
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    const err = new Error('An account with this email already exists');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userRepo.createLocalUser({ name, email, passwordHash });

  logger.info('New user signed up', { userId: user.id, email: user.email });

  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}

async function login({ email, password }) {
  const user = await userRepo.findByEmail(email);

  // Deliberately generic error message for both "no user" and "wrong password" —
  // revealing which one it was lets attackers enumerate valid emails.
  const invalidCredsError = () => {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    return err;
  };

  if (!user || !user.password_hash) throw invalidCredsError();

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw invalidCredsError();

  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}

// Handles the Google OAuth "verify" callback logic: find-or-create,
// and link accounts if the email already exists via local signup.
async function findOrCreateGoogleUser({ googleId, email, name, avatarUrl }) {
  let user = await userRepo.findByGoogleId(googleId);
  if (user) return user;

  const existingByEmail = await userRepo.findByEmail(email);
  if (existingByEmail) {
    // Same email, different login method — link accounts rather than
    // creating a duplicate user (this was the "account linking" edge case
    // we discussed for Passport strategies).
    return userRepo.linkGoogleAccount(existingByEmail.id, googleId, avatarUrl);
  }

  return userRepo.createGoogleUser({ name, email, googleId, avatarUrl });
}

// Refresh flow: client sends refresh token -> we verify it's still valid in
// the DB -> issue a brand new access token (and rotate the refresh token).
async function refreshAccessToken(oldRefreshToken) {
  const stored = await refreshTokenRepo.findValidToken(oldRefreshToken);
  if (!stored) {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  const user = await userRepo.findById(stored.user_id);
  if (!user) {
    const err = new Error('User no longer exists');
    err.statusCode = 401;
    throw err;
  }

  // Rotate: revoke the old refresh token, issue a new pair.
  // This limits the damage if a refresh token is ever stolen.
  await refreshTokenRepo.revoke(oldRefreshToken);
  return issueTokenPair(user);
}

async function logout(refreshToken) {
  await refreshTokenRepo.revoke(refreshToken);
}

async function logoutAllDevices(userId) {
  await refreshTokenRepo.revokeAllForUser(userId);
}

module.exports = {
  signup,
  login,
  findOrCreateGoogleUser,
  issueTokenPair,
  refreshAccessToken,
  logout,
  logoutAllDevices,
};
