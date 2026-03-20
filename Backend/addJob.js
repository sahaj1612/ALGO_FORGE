const testQueue = require("./queues/testQueue");

async function add() {
  await testQueue.add("demo-job", {
    code: "console.log('Hello AlgoForge')",
    language: "javascript",
  });

  console.log("Job added");
  process.exit(0);
}

add();