const { Worker } = require("bullmq");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const Submission = require("../models/Submission");
const Problem = require("../models/Problem");

const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/algoforge")
  .then(()=> console.log("Worker DB Connected"))
  .catch(err => console.log(err));

const worker = new Worker(
  "judge-queue",
  async job => {

    console.log("🟡 Job received:", job.data);

    const { submissionId } = job.data;

    console.log("🔵 Judging:", submissionId);

    const sub = await Submission.findById(submissionId);
    if (!sub) return;

    sub.status = "running";
    await sub.save();

    const problem = await Problem.findById(sub.problemId);
    if (!problem) {
      sub.status = "server_error";
      await sub.save();
      return;
    }

    const sandboxPath = path.resolve(__dirname, "../sandbox");
    const dockerPath = sandboxPath.replace(/\\/g, "/");

    let finalVerdict = "ACCEPTED";
    let results = [];
    let maxTime = 0;

    try {

      for (const tc of problem.hiddenTestcases) {

        const wrappedCode = `
${sub.code}

try {
  const result = solve(${JSON.stringify(tc.input)});
  console.log(result);
} catch(e){
  console.error(e.toString());
}
`;

        const filePath = path.join(sandboxPath, "code.js");
        fs.writeFileSync(filePath, wrappedCode);

        const start = Date.now();

        const result = spawnSync(
          "docker",
          [
            "run",
            "--rm",

            // ⭐ SECURITY LIMITS
            "--memory=128m",
            "--cpus=0.5",
            "--pids-limit=64",

            "-v",
            `${dockerPath}:/app`,
            "code-runner"
          ],
          { encoding: "utf-8", timeout: 3000 }
        );

        const end = Date.now();
        const timeTaken = end - start;
        maxTime = Math.max(maxTime, timeTaken);

        // ⭐ TLE
        if (result.signal === "SIGTERM") {

          finalVerdict = "TIME LIMIT EXCEEDED";

          results.push({
            input: JSON.stringify(tc.input),
            expected: tc.output.toString(),
            got: "Time Limit Exceeded",
            status: "TLE"
          });

          break;
        }

        // ⭐ Runtime Error
        if (result.error || (result.stderr && result.stderr.trim() !== "")) {

          finalVerdict = "RUN TIME ERROR";

          results.push({
            input: JSON.stringify(tc.input),
            expected: tc.output.toString(),
            got: result.stderr || result.error?.toString(),
            status: "Runtime Error"
          });

          break;
        }

        let got = result.stdout.trim();
        let expected = tc.output.toString().trim();

        // ⭐ numeric compare
        if (!isNaN(got) && !isNaN(expected)) {
          got = Number(got);
          expected = Number(expected);
        }

        // ⭐ JSON compare
        try {
          const g = JSON.parse(got);
          const e = JSON.parse(expected);

          if (JSON.stringify(g) === JSON.stringify(e)) {

            results.push({
              input: JSON.stringify(tc.input),
              expected,
              got,
              status: "Passed"
            });

            continue;
          }
        } catch {}

        // ⭐ final compare
        if (got !== expected) {

          finalVerdict = "WRONG ANSWER";

          results.push({
            input: JSON.stringify(tc.input),
            expected,
            got,
            status: "Failed"
          });

          break;
        }

        // ⭐ testcase passed
        results.push({
          input: JSON.stringify(tc.input),
          expected,
          got,
          status: "Passed"
        });

        // ⭐ cleanup file after each testcase
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

    } catch (err) {

      console.log("Worker Error:", err);
      finalVerdict = "SERVER ERROR";

    }

    // ⭐ FINAL DB UPDATE
    sub.status = finalVerdict;
    sub.results = results;
    sub.time = maxTime;

    await sub.save();

    console.log("🟢 Judged:", submissionId, finalVerdict);

  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379,
    },
    concurrency: 3   // ⭐ parallel jobs per worker
  }
);

console.log("🚀 Judge Worker Started");