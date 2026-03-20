const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const Problem = require("../models/Problem");

router.post("/", async (req, res) => {

  const { code, problemId } = req.body;

  const problem = await Problem.findById(problemId);

  if (!problem) {
    return res.json({ result: "Problem Not Found" });
  }

  const sandboxPath = path.resolve(__dirname, "../sandbox");
  const dockerPath = sandboxPath.replace(/\\/g, "/");

  const results = [];

  for (const testcase of problem.testcases) {

    const wrappedCode = `
${code}

try {
  const result = solve(${JSON.stringify(testcase.input)});
  console.log(result);
} catch(e){
  console.error("Runtime Error");
}
`;

    fs.writeFileSync(path.join(sandboxPath, "code.js"), wrappedCode);

    const result = spawnSync(
      "docker",
      [
        "run",
        "--rm",
        "-v",
        `${dockerPath}:/app`,
        "code-runner"
      ],
      { encoding: "utf-8", timeout: 3000 }
    );

    results.push({
      input: testcase.input,
      expected: testcase.output,
      got: result.stdout.trim()
    });

    fs.unlinkSync(path.join(sandboxPath, "code.js"));
  }

  res.json({ result: results });

});

module.exports = router;