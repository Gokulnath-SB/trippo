import mongoose from 'mongoose';
import { createApp } from './app.js';
import { config } from './config.js';
import { markDbConnected, markDbNotConfigured, markDbUnavailable, state } from './state.js';

async function start() {
  if (config.jwtSecretIsEphemeral) {
    console.warn('[auth] JWT_SECRET is not set — using an ephemeral development secret. Tokens will stop working after a restart.');
  }

  if (!config.mongoUri) {
    markDbNotConfigured();
    console.warn('[db] MONGODB_URI is not set — API will use non-persistent in-memory storage. /api/health reports degraded mode.');
  } else {
    try {
      mongoose.set('strictQuery', true);
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
      markDbConnected();
      console.log('[db] MongoDB connected.');
    } catch (error) {
      markDbUnavailable(error?.message ?? 'unknown connection error');
      console.warn('[db] MongoDB connection failed — using non-persistent in-memory storage for this process.');
    }
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[api] tripo.tech listening on http://localhost:${config.port} (${state.db.mode} storage).`);
  });

  const shutdown = () => {
    server.close(async () => {
      await mongoose.disconnect().catch(() => {});
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('[api] failed to start:', error);
  process.exit(1);
});
