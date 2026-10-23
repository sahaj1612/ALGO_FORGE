const mongoose = require("mongoose");

const testcaseSnapshotSchema = new mongoose.Schema({
  input: { type: mongoose.Schema.Types.Mixed, required: true },
  output: { type: String, required: true }
}, { _id: false });

const testcaseResultSchema = new mongoose.Schema({
  ordinal: { type: Number, required: true },
  status: {
    type: String,
    enum: ["passed", "wrong_answer", "time_limit", "runtime_error", "compilation_error", "server_error"],
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

// This is intentionally private persistence data.  It is the exact contract the
// judge used when the submission was accepted, so later edits to a problem do
// not change the meaning of an older result.  Public serializers must never
// expose hiddenTestcases from this snapshot.
const problemSnapshotSchema = new mongoose.Schema({
  version: { type: Number, required: true },
  signature: { type: mongoose.Schema.Types.Mixed, required: true },
  adapter: { type: mongoose.Schema.Types.Mixed, required: true },
  hiddenTestcases: { type: [testcaseSnapshotSchema], required: true },
  timeLimit: { type: Number, required: true },
  memoryLimit: { type: Number, required: true }
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

  problemSnapshot: {
    type: problemSnapshotSchema,
    required: false,
    select: false
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
  memory: Number,
  correlationId: { type: String, default: null },
  heartbeatAt: { type: Date, default: Date.now },
  reconciliationRetries: { type: Number, default: 0 }

}, { timestamps: true });

// Required compound indexes
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ problemId: 1, createdAt: -1 });
submissionSchema.index({ status: 1, createdAt: 1 });
submissionSchema.index({ status: 1, heartbeatAt: 1 });

module.exports = mongoose.model("Submission", submissionSchema);
