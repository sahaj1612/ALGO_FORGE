const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { BadRequestError, UnauthorizedError, ConflictError } = require('../utils/errors');
const config = require('../config/env');

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, savedHash) {
  if (!savedHash || !savedHash.includes(':')) return false;
  const [salt, digest] = savedHash.split(':');
  const derivedKey = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(digest, 'hex'), derivedKey);
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate short-lived access token (15 minutes)
 */
function generateToken(userId, expiresIn = '15m') {
  return jwt.sign({ id: String(userId) }, config.jwtSecret, { expiresIn });
}

/**
 * Issue and persist a cryptographically secure refresh token (7 days)
 */
async function issueRefreshToken(userId, req = null) {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const ipAddress = req
    ? (req.ip || req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown')
    : 'unknown';
  const userAgent = req?.headers?.['user-agent'] || 'unknown';

  await RefreshToken.create({
    tokenHash,
    userId,
    expiresAt,
    ipAddress,
    userAgent
  });

  return rawToken;
}

/**
 * Rotate refresh token with automatic reuse detection
 */
async function rotateRefreshToken(rawToken, req = null) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new UnauthorizedError('Refresh token is required.');
  }

  const tokenHash = hashToken(rawToken);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing) {
    throw new UnauthorizedError('Invalid or expired refresh token.');
  }

  // Reuse Detection: If token is already revoked, an attacker or compromise may have replayed it!
  // Invalidate ALL active refresh tokens for this user immediately
  if (existing.revokedAt) {
    await RefreshToken.updateMany(
      { userId: existing.userId, revokedAt: null },
      { revokedAt: new Date() }
    );
    throw new UnauthorizedError('Token reuse detected. All active sessions have been terminated.');
  }

  // Check expiration
  if (Date.now() > existing.expiresAt.getTime()) {
    throw new UnauthorizedError('Refresh token expired. Please log in again.');
  }

  // Generate new token pair
  const newRawToken = crypto.randomBytes(40).toString('hex');
  const newTokenHash = hashToken(newRawToken);
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const ipAddress = req
    ? (req.ip || req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown')
    : existing.ipAddress;
  const userAgent = req?.headers?.['user-agent'] || existing.userAgent;

  // Revoke old token and record lineage
  existing.revokedAt = new Date();
  existing.replacedByTokenHash = newTokenHash;
  await existing.save();

  // Create new active token
  await RefreshToken.create({
    tokenHash: newTokenHash,
    userId: existing.userId,
    expiresAt: newExpiresAt,
    ipAddress,
    userAgent
  });

  const newAccessToken = generateToken(existing.userId);

  return {
    token: newAccessToken,
    accessToken: newAccessToken,
    refreshToken: newRawToken
  };
}

/**
 * Revoke a refresh token on logout
 */
async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    { revokedAt: new Date() }
  );
}

async function formatAuthResponse(user, req = null) {
  const accessToken = generateToken(user._id);
  const refreshToken = await issueRefreshToken(user._id, req);

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      role: user.role || 'user'
    }
  };
}

async function register({ name, email, password }, req = null) {
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    throw new BadRequestError('Name, email, and an 8-character password are required.');
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = await User.exists({ email: cleanEmail });
  if (existing) {
    throw new ConflictError('An account with that email already exists.');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name: name.trim(),
    email: cleanEmail,
    passwordHash
  });

  return formatAuthResponse(user, req);
}

async function login({ email, password }, req = null) {
  if (!email || !password) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  return formatAuthResponse(user, req);
}

module.exports = {
  hashPassword,
  verifyPassword,
  hashToken,
  generateToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  formatAuthResponse,
  register,
  login
};
