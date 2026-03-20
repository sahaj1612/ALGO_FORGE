const { Queue } = require("bullmq");

const judgeQueue = new Queue("judge-queue", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
  },
});

module.exports = judgeQueue;