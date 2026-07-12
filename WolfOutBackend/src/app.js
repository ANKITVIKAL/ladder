'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// CORS: allow any origin when CORS_ORIGIN='*', otherwise use the allow-list.
const corsOptions =
  config.corsOrigin === '*'
    ? { origin: true }
    : { origin: config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean) };
app.use(cors(corsOptions));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

if (config.env !== 'test') {
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
}

// Friendly root so hitting the base URL isn't a 404.
app.get('/', (req, res) => {
  res.json({
    name: 'WolfOut Ladder API',
    version: '1.0.0',
    docs: 'See README.md',
    health: '/api/health',
  });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
