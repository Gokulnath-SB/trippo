import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(env = process.env) {
  const secretFromEnv = String(env.JWT_SECRET ?? '').trim();

  return {
    port: positiveInt(env.PORT, 4000),
    mongoUri: String(env.MONGODB_URI ?? '').trim(),
    jwtSecret: secretFromEnv || crypto.randomBytes(32).toString('hex'),
    jwtSecretIsEphemeral: !secretFromEnv,
    clientOrigins: String(env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    nodeEnv: String(env.NODE_ENV ?? 'development'),
  };
}

export const config = loadConfig();
