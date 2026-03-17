const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

// Validate required environment variables on startup
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const db = require('./db/config');
const patientsRouter = require('./api/routes/patients');
const authRouter    = require('./api/routes/auth');
const syncRouter    = require('./api/routes/sync');

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet());

// CORS — restrict to configured origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl) in development
      if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true
  })
);

// Rate limiting: 100 requests per minute per IP
app.use(
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
  })
);

// Request logging (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', async (req, res) => {
  try {
    const start = Date.now();
    await db.query('SELECT 1');
    const dbLatencyMs = Date.now() - start;
    res.json({ status: 'ok', message: 'iKhaya Health API is running', db: 'connected', dbLatencyMs });
  } catch (err) {
    res.status(503).json({ status: 'degraded', message: 'Database unreachable', db: 'disconnected' });
  }
});

app.use('/api/auth',     authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/sync',     syncRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server only when not in test mode
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`iKhaya Health API running on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
      db.pool.end(() => {
        console.log('Database pool closed.');
        process.exit(0);
      });
    });
    // Force exit after 10s if connections don't drain
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = app;
