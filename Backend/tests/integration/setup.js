const http = require('http');
const mongoose = require('mongoose');
const app = require('../../server');
const config = require('../../config/env');
const { closeRedis } = require('../../controllers/healthController');
const judgeQueue = require('../../queues/judgeQueue');

let server = null;
let baseUrl = '';

async function startTestServer() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.mongodbUri);
  }

  if (!server) {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  }

  return { baseUrl, server };
}

async function stopTestServer() {
  if (server) {
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
  try {
    await judgeQueue.close();
  } catch {}
  await closeRedis();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Connection: 'close',
      ...(options.headers || {})
    }
  });

  let body = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    body
  };
}

module.exports = {
  startTestServer,
  stopTestServer,
  request
};
