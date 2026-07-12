'use strict';

/**
 * An Error subclass carrying an HTTP status code, handled by the
 * central error middleware. Throw this anywhere in a handler.
 */
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (details) this.details = details;
  }
}

/**
 * Wrap an async route handler so thrown/rejected errors are forwarded
 * to Express' error middleware instead of crashing the process.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { ApiError, asyncHandler };
