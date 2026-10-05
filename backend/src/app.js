// src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { devicesRouter } from './routes/devices.routes.js';
import { readingsRouter } from './routes/readings.routes.js';
import { isBrokerConnected } from './mqtt/client.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/api/health', (_req, res) =>
    res.json({ status: 'ok', mqtt: isBrokerConnected() ? 'connected' : 'disconnected', ts: new Date().toISOString() })
  );

  app.use('/api/devices', devicesRouter);
  app.use('/api/readings', readingsRouter);

  app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
  return app;
}