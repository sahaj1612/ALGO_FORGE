const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");

const router = express.Router();

router.post("/run", async (req, res) => {
    const { code } = req.body;

    fs.writeFileSync("sandbox/code.js", code);

    exec(
        "docker run --rm -v %cd%/sandbox:/app code-runner",
        (error, stdout, stderr) => {
            if (error) {
                return res.json({ output: stderr });
            }
            res.json({ output: stdout });
        }
    );
});

module.exports = router;