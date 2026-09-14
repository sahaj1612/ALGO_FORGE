const mongoose = require("mongoose");

const exampleSchema = new mongoose.Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  explanation: { type: String, default: "" }
}, { _id: false });

const testcaseSchema = new mongoose.Schema({
  input: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  output: {
    type: String,
    required: true
  }
}, { _id: false });

const parameterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true } // e.g. "int[]", "int", "string", "ListNode", "boolean"
}, { _id: false });

const signatureSchema = new mongoose.Schema({
  functionName: { type: String, default: "solve" },
  returnType: { type: String, default: "void" }, // e.g. "int", "int[]", "boolean", "string"
  parameters: [parameterSchema]
}, { _id: false });

const problemSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },

  title: {
    type: String,
    required: true,
    trim: true
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

  topic: {
    type: String,
    default: "Arrays",
    required: true
  },

  topics: {
    type: [String],
    default: []
  },

  status: {
    type: String,
    enum: ["draft", "review", "published", "retired"],
    default: "published"
  },

  version: {
    type: Number,
    default: 1
  },

  inputFormat: { type: String, default: "" },
  outputFormat: { type: String, default: "" },
  constraints: { type: String, default: "" },

  timeLimit: {
    type: Number,
    default: 2000 // in ms
  },

  memoryLimit: {
    type: Number,
    default: 256 // in MB
  },

  supportedLanguages: {
    type: [String],
    default: ["javascript", "python", "java", "cpp", "c"]
  },

  starterCode: {
    type: Map,
    of: String,
    default: {
      javascript: "function solve(nums) {\n  // Write your solution here\n}",
      python: "class Solution:\n    def solve(self, nums):\n        # Write your solution here\n        pass",
      java: "class Solution {\n    public int solve(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Write your solution here\n        return 0;\n    }\n};",
      c: "#include <stdio.h>\n\nint solve(int* nums, int numsSize) {\n    // Write your solution here\n    return 0;\n}"
    }
  },

  signature: {
    type: signatureSchema,
    default: () => ({
      functionName: "solve",
      returnType: "int",
      parameters: [{ name: "nums", type: "int[]" }]
    })
  },

  examples: [exampleSchema],

  // Sample testcases (used by Run button)
  testcases: [testcaseSchema],

  // Hidden testcases (used by Submit button — never exposed publicly)
  hiddenTestcases: [testcaseSchema],

  editorial: {
    hints: { type: [String], default: [] },
    approach: { type: String, default: "" },
    solutionCode: { type: Map, of: String, default: {} }
  }
}, { timestamps: true });

// Compound indexes according to Phase 2 spec
problemSchema.index({ slug: 1 }, { unique: true });
problemSchema.index({ status: 1, difficulty: 1, topic: 1 });

module.exports = mongoose.model("Problem", problemSchema);
