const logger = require('../utils/logger');

// Centralized error handler: Services throw errors with a `statusCode`
// (e.g. 409 for "email exists", 401 for "invalid credentials"). Controllers
// just pass errors here via next(err) instead of each writing its own
// try/catch response formatting — one place to control the error shape.
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  logger.error(err.message, {
    statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message,
  });
}

// Wraps async route handlers so thrown errors are automatically forwarded
// to the error handler, instead of needing try/catch in every controller.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
