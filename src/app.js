const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth.routes');
const groupRoutes = require('./routes/group.routes');
const expenseRoutes = require('./routes/expense.routes');
const invitationRoutes = require('./routes/invitation.routes');
const { errorHandler } = require('./middlewares/error.middleware');
const logger = require('./utils/logger');
const { pool } = require('./config/db');

const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json());
app.use(passport.initialize());

// Pipe HTTP request logs through Winston instead of morgan's default stdout,
// so they show up in the same structured log files/streams.
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Health check: pings actual dependencies (DB), not just "process is alive".
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', db: 'unreachable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/invitations', invitationRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler must be registered last.
app.use(errorHandler);

module.exports = app;
