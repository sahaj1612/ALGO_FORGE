const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem"
  },

  code: String,

  language: {
    type: String,
    default: "javascript"
  },

  status: String,

  runtime: Number,
  memory: Number

}, { timestamps: true });

module.exports = mongoose.model("Submission", submissionSchema);