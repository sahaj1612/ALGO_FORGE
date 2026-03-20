const express = require("express");
const router = express.Router();
const Problem = require("../models/Problem");
const auth = require("../middleware/authMiddleware");

// ⭐ GET ALL PROBLEMS
router.get("/", async (req, res) => {
  const problems = await Problem.find();
  res.json(problems);
});

// ⭐ GET SINGLE PROBLEM
router.get("/:id", auth, async (req, res) => {
  const problem = await Problem.findById(req.params.id);
  res.json(problem);
});

module.exports = router;