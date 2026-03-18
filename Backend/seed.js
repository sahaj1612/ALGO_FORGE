const mongoose = require("mongoose");
const Problem = require("./models/Problem");

mongoose.connect("mongodb://127.0.0.1:27017/algoforge");

async function seed() {
  await Problem.deleteMany();

  await Problem.create({
    title: "Find Maximum Element",
    difficulty: "Easy",
    description:
      "Given an array of integers, find and print the maximum element.",
    inputFormat:
      "First line contains N (size of array). Second line contains N space-separated integers.",
    outputFormat: "Print the maximum element in the array.",
    examples: [
      {
        input: "5\n1 2 3 4 5",
        output: "5",
      },
    ],
  });

  console.log("Seeded Successfully");
  process.exit();
}

seed();