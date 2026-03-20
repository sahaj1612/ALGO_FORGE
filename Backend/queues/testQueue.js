const { Queue } = require("bullmq");

const testQueue = new Queue("test-queue", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
  },
});

module.exports = testQueue;