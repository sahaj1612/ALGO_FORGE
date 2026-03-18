const { execSync } = require("child_process");
const fs = require("fs");

// Read user code
const code = fs.readFileSync("code.js", "utf8");

// Save to file
fs.writeFileSync("temp.js", code);

try {
    const output = execSync("node temp.js", { timeout: 2000 });
    console.log(output.toString());
} catch (err) {
    console.log("Error:", err.message);
}