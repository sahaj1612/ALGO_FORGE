const express = require("express");
const router = express.Router();
const problems = require("../data/problems");

router.post("/", async (req, res) => {

  const { code, problemId } = req.body;

  const problem = problems.find(p => p.id === problemId);

  try {

    const results = [];

    for (let tc of problem.testcases) {

      const wrappedCode = `
      ${code}
      console.log(solve(${JSON.stringify(tc.input)}))
      `;

      const output = await runInSandbox(wrappedCode);

      results.push({
        expected: tc.output,
        got: output.trim()
      });
    }

    res.json({ result: results });

  } catch (err) {
    res.json({ result: "Runtime Error" });
  }

});

module.exports = router;