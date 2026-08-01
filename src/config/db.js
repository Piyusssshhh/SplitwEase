const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

// A connection Pool (not a single client) is used so multiple queries
// can run concurrently without waiting on one shared connection.
// pg manages a set of reusable connections under the hood.
const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,               // max simultaneous connections in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Fires on idle client errors (e.g. DB restarted) — log, don't crash.
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

// Every Repository will import this `query` helper instead of touching
// the pool directly — keeps the pg-specific API in one place.
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.debug('Executed query', { text, duration, rows: result.rowCount });
  return result;
}

module.exports = { query, pool };
