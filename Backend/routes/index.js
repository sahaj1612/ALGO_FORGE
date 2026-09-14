const express = require('express');
const authRoutes = require('./authRoutes');
const problemRoutes = require('./problemRoutes');
const submissionRoutes = require('./submissionRoutes');
const runRoutes = require('./runRoutes');
const submitRoutes = require('./submitRoutes');
const userRoutes = require('./userRoutes');
const learningRoutes = require('./learningRoutes');
const healthRoutes = require('./healthRoutes');

const router = express.Router();

function registerApiRoutes(r) {
  r.use('/auth', authRoutes);
  r.use('/problems', problemRoutes);
  r.use('/submissions', submissionRoutes);
  r.use('/run', runRoutes);
  r.use('/submit', submitRoutes);
  r.use('/learning', learningRoutes);
  r.use('/', userRoutes);
}

// Version 1 API: /api/v1/*
const v1Router = express.Router();
registerApiRoutes(v1Router);
router.use('/v1', v1Router);

// Backward compatibility: mount directly on /api/* as well
registerApiRoutes(router);

module.exports = {
  apiRouter: router,
  healthRoutes
};
