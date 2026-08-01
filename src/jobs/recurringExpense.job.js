const cron = require('node-cron');
const recurringExpenseService = require('../services/recurringExpense.service');
const logger = require('../utils/logger');

// Runs once a day at midnight — checks for any recurring expenses that are
// due, generates real expenses for them, and reschedules their next run.
// Cron syntax '0 0 * * *' = minute 0, hour 0, every day, every month, every weekday.
function startRecurringExpenseJob() {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running recurring expense job');
    try {
      const result = await recurringExpenseService.processDueRecurringExpenses();
      logger.info('Recurring expense job completed', result);
    } catch (err) {
      logger.error('Recurring expense job failed', { error: err.message });
    }
  });

  logger.info('Recurring expense cron job scheduled (daily at midnight)');
}

module.exports = { startRecurringExpenseJob };