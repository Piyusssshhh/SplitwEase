const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

const redisClient = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => logger.info('Redis connected'));
redisClient.on('error', (err) => logger.error('Redis error', { error: err.message }));

module.exports = redisClient;