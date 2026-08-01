const winston = require('winston');
const env = require('../config/env');

// Structured JSON logs in production (machine-parseable by log aggregators),
// human-readable colored logs in development.
const isProd = env.nodeEnv === 'production';

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
  transports: [
    new winston.transports.Console(),
    // File logging only in development — in production/cloud environments,
    // logs go to stdout and are captured by the platform (Render, Railway,
    // Docker logs, etc.) instead. Writing to local files in a container
    // also risks permission errors depending on the container's filesystem setup.
    ...(isProd
      ? []
      : [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]),
  ],
});

module.exports = logger;
