const config = require('./config/env');
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const User = require('./models/User');
const { apiRouter, healthRoutes } = require('./routes/index');
const requestIdMiddleware = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// 1. Correlation ID
app.use(requestIdMiddleware);

// 2. Body Parser & Security Limits
app.use(express.json({ limit: config.bodyLimit }));
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(passport.initialize());

// 3. Request Logging (Structured JSON, sanitizing passwords/tokens/code)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      correlationId: req.id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start
    });
  });
  next();
});

// 4. Database Connection
mongoose.connect(config.mongodbUri)
  .then(() => logger.info('MongoDB connected'))
  .catch(error => {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  });

// 5. Google OAuth
if (config.isGoogleConfigured) {
  passport.use(new GoogleStrategy({
    clientID: config.googleClientId,
    clientSecret: config.googleClientSecret,
    callbackURL: '/auth/google/callback'
  }, async (_, __, profile, done) => {
    try {
      const user = await User.findOneAndUpdate(
        { googleId: profile.id },
        {
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          picture: profile.photos?.[0]?.value
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      done(null, user);
    } catch (error) {
      done(error);
    }
  }));
}

app.get('/auth/google', (req, res, next) =>
  config.isGoogleConfigured
    ? passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })(req, res, next)
    : res.status(503).json({ message: 'Google OAuth is not configured.' })
);

app.get('/auth/google/callback', (req, res, next) =>
  config.isGoogleConfigured
    ? passport.authenticate('google', { session: false })(req, res, () =>
        res.redirect(`${config.clientUrl}/dashboard?token=${jwt.sign({ id: req.user._id }, config.jwtSecret, { expiresIn: '7d' })}`)
      )
    : res.status(503).json({ message: 'Google OAuth is not configured.' })
);

// 6. Health Check Endpoints (/health, /health/live, /health/ready)
app.use('/health', healthRoutes);

// 7. API Routes (mounted on /api and /api/v1)
app.use('/api', apiRouter);

// 8. 404 Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    },
    message: `Cannot ${req.method} ${req.originalUrl}`,
    requestId: req.id
  });
});

// 9. Unified Typed Error Handler
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
  });
}

module.exports = app;
