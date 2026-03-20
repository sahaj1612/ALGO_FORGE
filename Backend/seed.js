const mongoose = require("mongoose");
const Problem = require("./models/Problem");

mongoose.connect("mongodb://127.0.0.1:27017/algoforge")
.then(async () => {

  await Problem.deleteMany();

  await Problem.create({

    // ⭐ FIXED ID (URL will always work)
    _id: new mongoose.Types.ObjectId("69bd041c0669b885ce198b33"),

    title: "Find Maximum Element",
    difficulty: "Easy",

    description:
`Given an array of integers, return the maximum element present in the array.

You must implement a function solve(arr) which returns the maximum value.`,

    inputFormat:
`An array of integers arr.`,

    outputFormat:
`Return a single integer representing the maximum element.`,
  constraints:
`1 ≤ N ≤ 10^5
-10^9 ≤ arr[i] ≤ 10^9`,
    // ⭐ DEFAULT CODE SHOWN IN EDITOR
    starterCode:
`function solve(arr){

}`,

    examples: [
      {
        input: "[1,2,3,4]",
        output: "4"
      },
      {
        input: "[5,9,1]",
        output: "9"
      }
    ],

    // ⭐ SAMPLE TESTCASES → RUN BUTTON
    testcases: [
      { input: [1,2,3,4], output: "4" },
      { input: [5,9,1], output: "9" }
    ],

    // ⭐ HIDDEN TESTCASES → SUBMIT BUTTON
    hiddenTestcases: [
      { input: [100,2,300], output: "300" },
      { input: [-1,-9,-3], output: "-1" }
    ]

  });

  console.log("✅ Problems Seeded");
  process.exit();

});