'use strict';

const config = require('../config');
const { ApiError } = require('../utils/http');

/** 404 for any unmatched route. */
function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/* eslint-disable no-unused-vars */
/** Central error handler — must keep 4 args for Express to recognise it. */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status >= 500) {
    // Log unexpected errors server-side; don't leak details to clients.
    console.error('[error]', err);
  }

  const body = {
    error: {
      message: status >= 500 ? 'Internal server error.' : err.message,
    },
  };
  if (err.details) body.error.details = err.details;
  if (config.env !== 'production' && status >= 500) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
