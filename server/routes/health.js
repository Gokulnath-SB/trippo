import { Router } from 'express';
import { config } from '../config.js';
import { healthSnapshot } from '../state.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const snapshot = healthSnapshot();
  // Always 200: degradation is reported in the body, not hidden behind a transport error.
  res.status(200).json({
    ...snapshot,
    api: 'tripo.tech',
    jwt: { configured: !config.jwtSecretIsEphemeral, ephemeral: config.jwtSecretIsEphemeral },
  });
});
