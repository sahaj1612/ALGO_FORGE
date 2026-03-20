// const express = require("express");
// const router = express.Router();
// const fs = require("fs");
// const path = require("path");
// const { spawnSync } = require("child_process");

// const Problem = require("../models/Problem");
// const Submission = require("../models/Submission");
// const auth = require("../middleware/authMiddleware");

// router.post("/", auth, async (req, res) => {

//   try {

//     const { code, problemId } = req.body;

//     const problem = await Problem.findById(problemId);

//     if (!problem) {
//       return res.json({ verdict: "Problem Not Found" });
//     }

//     // ⭐ Empty logic check (BEFORE docker)
//     const body = code
//       ?.replace(/\s/g, "")
//       .replace("functionsolve(arr){", "")
//       .replace("}", "");

//     if (!code || body.length === 0) {
//       return res.json({
//         verdict: "Empty Logic",
//         results: []
//       });
//     }

//     let verdict = "Accepted";
//     let results = [];

//     const sandboxPath = path.resolve(__dirname, "../sandbox");
//     const dockerPath = sandboxPath.replace(/\\/g, "/");

//     for (const testcase of problem.hiddenTestcases) {

//       const wrappedCode = `
// ${code}

// try {
//   const result = solve(${JSON.stringify(testcase.input)});
//   console.log(result);
// } catch(e){
//   console.error(e.toString());
// }
// `;

//       fs.writeFileSync(path.join(sandboxPath, "code.js"), wrappedCode);

//       const result = spawnSync(
//         "docker",
//         [
//           "run",
//           "--rm",
//           "-v",
//           `${dockerPath}:/app`,
//           "code-runner"
//         ],
//         { encoding: "utf-8", timeout: 3000 }
//       );

//       // ⭐ Runtime Error (REAL check)
//       if (result.error) {
//         verdict = "Runtime Error";
//         results.push({ status: "Runtime Error" });
//         break;
//       }

//       if (result.stderr && result.stderr.trim() !== "") {
//         verdict = "Runtime Error";
//         results.push({ status: result.stderr.trim() });
//         break;
//       }

//       // ⭐ Time Limit
//       if (result.signal === "SIGTERM") {
//         verdict = "Time Limit Exceeded";
//         results.push({ status: "TLE" });
//         break;
//       }

//       // ⭐ SAFE OUTPUT COMPARISON (VERY IMPORTANT)
//       let got = result.stdout.trim();
//       let expected = testcase.output.toString().trim();

//       // number compare
//       if (!isNaN(got) && !isNaN(expected)) {
//         got = Number(got);
//         expected = Number(expected);
//       }

//       // array/object compare
//       try {
//         const g = JSON.parse(got);
//         const e = JSON.parse(expected);

//         if (JSON.stringify(g) === JSON.stringify(e)) {

//           results.push({
//             status: "Passed",
//             input: testcase.input,
//             expected,
//             got
//           });

//           continue;
//         }
//       } catch {}

//       // final compare
//       if (got !== expected) {
//         verdict = "Wrong Answer";

//         results.push({
//           status: "Failed",
//           input: testcase.input,
//           expected,
//           got
//         });

//         break;
//       }

//       // ⭐ testcase passed
//       results.push({
//         status: "Passed",
//         input: testcase.input,
//         expected,
//         got
//       });
//     }

//     // ⭐ SAFE delete
//     const filePath = path.join(sandboxPath, "code.js");
//     if (fs.existsSync(filePath)) {
//       fs.unlinkSync(filePath);
//     }

//     // ⭐ Save submission
//     await Submission.create({
//       userId: req.user.id,
//       problemId,
//       code,
//       status: verdict
//     });

//     return res.json({ verdict, results });

//   } catch (err) {

//     console.log(err);
//     return res.json({ verdict: "Server Error" });

//   }

// });

// module.exports = router;

const express = require("express");
const router = express.Router();

const judgeQueue = require("../queues/judgeQueue");
const Submission = require("../models/Submission");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, async (req, res) => {
  try {

    const { problemId, code, language } = req.body;

    console.log("🟡 Creating submission");

    const submission = await Submission.create({
      userId: req.user.id,   // ⭐ REAL USER ID
      problemId,
      code,
      language,
      status: "pending",
    });

    console.log("🟡 Adding job to queue");

    await judgeQueue.add("judge-job", {
      submissionId: submission._id,
    });

    console.log("🟢 Job added");

    res.json({
      success: true,
      submissionId: submission._id,
    });

  } catch (err) {
    console.log("🔥 Submit Route Error:", err);
    res.status(500).json({ error: "Submit failed" });
  }
});

module.exports = router;