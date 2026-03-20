const fs = require("fs");

let output = "";

// capture console.log
const originalLog = console.log;

console.log = (...args) => {
  output += args.join(" ") + "\n";
};

try {

  // read wrapped user code
  const code = fs.readFileSync("code.js", "utf8");

  // execute code
  eval(code);

} catch (err) {

  console.error(err.message);
  process.exit(1);

}

// print captured output
process.stdout.write(output);