const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Submission = require('../models/Submission');
const RefreshToken = require('../models/RefreshToken');
const statsService = require('../services/statsService');
const auditService = require('../services/auditService');
const config = require('../config/env');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { verifyImageMagicBytes } = require('../utils/sanitizer');

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
    if (!picture || typeof picture !== 'string') {
      throw new BadRequestError('Profile picture data or URL is required.');
    }

    // 1. Allow trusted external storage references (e.g. HTTPS storage object / OAuth avatar)
    if (picture.startsWith('https://')) {
      try {
        const url = new URL(picture);
        // Ensure valid URL
        if (!url.hostname) throw new Error();
      } catch {
        throw new BadRequestError('Invalid profile picture URL.');
      }
    } else {
      // 2. Binary Magic Number verification for base64 uploaded blobs
      const verifiedMime = verifyImageMagicBytes(picture);
      if (!verifiedMime) {
        throw new BadRequestError('Invalid or unsupported image file. Must be a verified JPEG, PNG, WebP, or GIF image under 2MB. Executable, SVG, or script payloads are strictly forbidden.');
      }
    }

    const user = await User.findByIdAndUpdate(req.user.id, { picture }, { new: true }).select('-passwordHash');
    if (!user) throw new NotFoundError('User not found.');
    res.json(user);
  } catch (error) {
    next(error);
  }
}

/**
 * GDPR / Privacy Data Portability: Export full account history & submissions
 */
async function exportAccountData(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash').lean();
    if (!user) throw new NotFoundError('User not found.');

    const submissions = await Submission.find({ userId: req.user.id })
      .select('-__v')
      .sort({ createdAt: -1 })
      .lean();

    const exportPayload = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        platform: 'AlgoForge'
      },
      user,
      submissions,
      totalSubmissions: submissions.length
    };

    await auditService.recordAuditLog({
      actor: req.user,
      action: 'ACCOUNT_EXPORT',
      targetType: 'User',
      targetId: req.user.id,
      details: { exportSize: submissions.length },
      req
    });

    res.setHeader('Content-Disposition', `attachment; filename="algoforge-account-${req.user.id}.json"`);
    res.json(exportPayload);
  } catch (error) {
    next(error);
  }
}

/**
 * GDPR Right to Erasure: Permanent account and personal data deletion
 */
async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found.');

    // Remove active refresh tokens
    await RefreshToken.deleteMany({ userId });

    // Clean up or anonymize user submissions
    await Submission.deleteMany({ userId });

    // Record audit log before deleting record
    await auditService.recordAuditLog({
      actor: req.user,
      action: 'ACCOUNT_DELETE',
      targetType: 'User',
      targetId: userId,
      details: { email: user.email },
      req
    });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      message: 'Account and associated personal data deleted permanently.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStats,
  getProfile,
  updateProfile,
  updatePicture,
  exportAccountData,
  deleteAccount
};
