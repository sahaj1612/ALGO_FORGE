// showProblems.js
const mongoose = require("mongoose");
const Problem = require("./models/Problem");

mongoose.connect("mongodb://127.0.0.1:27017/algoforge")
.then(async () => {

  const problems = await Problem.find();

  console.log(problems);

  process.exit();
});