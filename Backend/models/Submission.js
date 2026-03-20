// const mongoose = require("mongoose");

// const submissionSchema = new mongoose.Schema({

//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User"
//   },

//   problemId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Problem"
//   },

//   code: String,

//   language: {
//     type: String,
//     default: "javascript"
//   },

//   status: String,

//   runtime: Number,
//   memory: Number

// }, { timestamps: true });

// module.exports = mongoose.model("Submission", submissionSchema);

const mongoose = require("mongoose");

const testcaseResultSchema = new mongoose.Schema({
  input: String,
  expected: String,
  got: String,
  status: String
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

  code: {
    type: String,
    required: true
  },

  language: {
    type: String,
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
      "tle",
      "re",
      "server_error"
    ]
  },

  results: [testcaseResultSchema],   // ⭐ VERY IMPORTANT

  output: String,

  error: String,

  time: Number,

  memory: Number

}, { timestamps: true });

module.exports = mongoose.model("Submission", submissionSchema);