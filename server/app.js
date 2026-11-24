import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { tripsRouter } from './routes/trips.js';
import { wishlistRouter } from './routes/wishlist.js';
import { errorHandler, notFoundHandler } from './utils/http.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  const allowAll = config.clientOrigins.includes('*');
  app.use(cors({
    origin(origin, callback) {
      // Same-origin / non-browser clients send no Origin header.
      if (!origin || allowAll || config.clientOrigins.includes(origin)) {
        callback(null, origin || true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '1mb' }));

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/trips', tripsRouter);
  app.use('/api/wishlist', wishlistRouter);

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
