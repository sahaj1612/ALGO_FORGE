const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

router.post("/run", async (req, res) => {
  try {
    console.log("RUN API HIT ✅");

    const { code, input } = req.body;

    const sandboxPath = path.join(__dirname, "../sandbox");
    const codePath = path.join(sandboxPath, "code.js");
    const inputPath = path.join(sandboxPath, "input.txt");

    fs.writeFileSync(codePath, code);
    fs.writeFileSync(inputPath, input || "");

    console.log("Files written ✅");

    const dockerPath = sandboxPath.replace(/\\/g, "/");

    const docker = spawn("docker", [
      "run",
      "--rm",
      "-v",
      `${dockerPath}:/app`,
      "code-runner"
    ]);

    let output = "";
    let errorOutput = "";

    docker.stdout.on("data", (data) => {
      output += data.toString();
    });

    docker.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    docker.on("close", (code) => {
      console.log("DOCKER EXIT CODE:", code);

      if (code !== 0) {
        console.log("STDERR:", errorOutput);
        return res.status(500).json({ error: errorOutput });
      }

      console.log("OUTPUT:", output);
      res.json({ output });
    });

  } catch (err) {
    console.log("ROUTE ERROR ❌", err);
    res.status(500).json({ error: "Server crash" });
  }
});

module.exports = router;