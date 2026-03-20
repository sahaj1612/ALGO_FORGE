const judgeQueue = require("./queues/judgeQueue");

async function check(){
  const jobs = await judgeQueue.getWaiting();
  console.log("Waiting jobs:", jobs.length);
  process.exit();
}

check();