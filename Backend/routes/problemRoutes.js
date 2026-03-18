const express = require("express");
const router = express.Router();
const Problem = require("../models/Problem");

// Get all problems
router.get("/", async (req, res) => {
  const problems = await Problem.find();
  res.json(problems);
});

// Get single problem by ID
router.get("/:id", async (req, res) => {
  const problem = await Problem.findById(req.params.id);

  if (!problem) {
    return res.status(404).json({ message: "Problem not found" });
  }

  res.json(problem);
});

module.exports = router;