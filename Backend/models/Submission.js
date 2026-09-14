const mongoose = require("mongoose");

const testcaseResultSchema = new mongoose.Schema({
  ordinal: { type: Number, required: true },
  status: {
    type: String,
    enum: ["passed", "wrong_answer", "time_limit", "runtime_error", "compilation_error", "error"],
    required: true
  },
  time: { type: Number, default: 0 }, // in ms
  memory: { type: Number, default: null },
  error: { type: String, default: null },
  // input/expected/got are present ONLY when safe (public run cases)
  input: { type: String, default: undefined },
  expected: { type: String, default: undefined },
  got: { type: String, default: undefined }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true
  },

  problemVersion: {
    type: Number,
    default: 1
  },

  code: {
    type: String,
    required: true
  },

  language: {
    type: String,
    enum: ["javascript", "python", "java", "cpp", "c"],
    default: "javascript"
  },

  status: {
    type: String,
    default: "pending",
    enum: [
      "pending",
      "running",
      "accepted",
      "wrong_answer",
      "time_limit",
      "runtime_error",
      "compilation_error",
      "server_error"
    ]
  },

  results: [testcaseResultSchema],

  output: String,
  error: String,
  time: Number,
  memory: Number

}, { timestamps: true });

// Required compound indexes
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ problemId: 1, createdAt: -1 });
submissionSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model("Submission", submissionSchema);
