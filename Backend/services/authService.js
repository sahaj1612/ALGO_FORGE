const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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

function generateToken(userId) {
  return jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: '7d' });
}

function formatAuthResponse(user) {
  return {
    token: generateToken(user._id),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      role: user.role || 'user'
    }
  };
}

async function register({ name, email, password }) {
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

  return formatAuthResponse(user);
}

async function login({ email, password }) {
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

  return formatAuthResponse(user);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  formatAuthResponse,
  register,
  login
};
