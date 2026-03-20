const mongoose = require("mongoose");

const exampleSchema = new mongoose.Schema({
  input: String,
  output: String
});

const testcaseSchema = new mongoose.Schema({
  input: {
    type: mongoose.Schema.Types.Mixed,   // ⭐ VERY IMPORTANT
    required: true
  },
  output: {
    type: String,
    required: true
  }
});

const problemSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true
  },

  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    required: true
  },

  description: {
    type: String,
    required: true
  },

  inputFormat: String,
  outputFormat: String,
  constraints: String,

  examples: [exampleSchema],

  // ⭐ SAMPLE TESTCASES (RUN BUTTON)
  testcases: [testcaseSchema],

  // ⭐ HIDDEN TESTCASES (SUBMIT BUTTON)
  hiddenTestcases: [testcaseSchema]

}, { timestamps: true });

module.exports = mongoose.model("Problem", problemSchema);