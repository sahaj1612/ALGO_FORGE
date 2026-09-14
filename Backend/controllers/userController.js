const jwt = require('jsonwebtoken');
const User = require('../models/User');
const statsService = require('../services/statsService');
const config = require('../config/env');
const { NotFoundError, BadRequestError } = require('../utils/errors');

async function getStats(req, res, next) {
  try {
    let userId = null;
    let token = req.header('Authorization');
    if (token) {
      if (token.startsWith('Bearer ')) token = token.replace('Bearer ', '');
      try {
        const verified = jwt.verify(token, config.jwtSecret);
        userId = verified.id;
      } catch {}
    }

    const tzOffset = Number.isInteger(Number(req.query.tzOffset)) ? Number(req.query.tzOffset) : 0;
    const stats = await statsService.getUserStats(userId, tzOffset);
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) throw new NotFoundError('User not found.');
    res.json(user);
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, bio, preferredLanguage, handle } = req.body;
    const updates = {};
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof bio === 'string') updates.bio = bio.trim();
    if (typeof preferredLanguage === 'string') updates.preferredLanguage = preferredLanguage.trim();
    if (typeof handle === 'string') updates.handle = handle.trim().replace(/^@/, '');

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-passwordHash');
    if (!user) throw new NotFoundError('User not found.');
    res.json(user);
  } catch (error) {
    next(error);
  }
}

async function updatePicture(req, res, next) {
  try {
    const { picture } = req.body;
    const isImageDataUrl = typeof picture === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(picture);
    if (!isImageDataUrl || picture.length > 2_800_000) {
      throw new BadRequestError('Choose a PNG, JPEG, WebP, or GIF image smaller than 2 MB.');
    }
    const user = await User.findByIdAndUpdate(req.user.id, { picture }, { new: true }).select('-passwordHash');
    if (!user) throw new NotFoundError('User not found.');
    res.json(user);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStats,
  getProfile,
  updateProfile,
  updatePicture
};
