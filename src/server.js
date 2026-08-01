const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { startRecurringExpenseJob } = require('./jobs/recurringExpense.job');

const server = app.listen(env.port, () => {
  logger.info(`SplitEase API running on port ${env.port} [${env.nodeEnv}]`);
  startRecurringExpenseJob();
});

// Graceful shutdown — let in-flight requests finish before the process exits.
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});

module.exports = server;
