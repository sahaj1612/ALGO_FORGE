const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '7d' } // Automatic Mongo TTL cleanup after 7 days
  },
  revokedAt: {
    type: Date,
    default: null
  },
  replacedByTokenHash: {
    type: String,
    default: null
  },
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

refreshTokenSchema.methods.isValid = function() {
  return !this.revokedAt && Date.now() < this.expiresAt.getTime();
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
