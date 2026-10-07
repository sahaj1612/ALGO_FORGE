// showProblems.js
const mongoose = require("mongoose");
const Problem = require("../../models/Problem");
const config = require("../../config/env");

mongoose.connect(config.mongodbUri)
.then(async () => {

  const problems = await Problem.find();

  console.log(problems);

  process.exit();
});
