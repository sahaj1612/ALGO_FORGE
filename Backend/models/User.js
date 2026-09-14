const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const viewedSchema = new mongoose.Schema({
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  picture: String,
  passwordHash: { type: String, select: false },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  bio: {
    type: String,
    default: "Algorithm enthusiast & competitive programmer on AlgoForge."
  },
  preferredLanguage: {
    type: String,
    default: "javascript"
  },
  handle: {
    type: String,
    default: ""
  },

  // Learning features
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem'
  }],

  notes: [noteSchema],

  recentlyViewed: [viewedSchema]

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
