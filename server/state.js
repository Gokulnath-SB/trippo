/** Runtime status shared by health checks and the repository layer. */
export const state = {
  startedAt: Date.now(),
  db: {
    mode: 'memory',
    connected: false,
    persistent: false,
    urlConfigured: false,
    error: null,
  },
};

export function markDbNotConfigured() {
  state.db = {
    mode: 'memory',
    connected: false,
    persistent: false,
    urlConfigured: false,
    error: 'MONGODB_URI is not set. Data is held in memory only and will be lost on restart.',
  };
}

export function markDbConnected() {
  state.db = {
    mode: 'mongodb',
    connected: true,
    persistent: true,
    urlConfigured: true,
    error: null,
  };
}

export function markDbUnavailable(message) {
  state.db = {
    mode: 'memory',
    connected: false,
    persistent: false,
    urlConfigured: true,
    error: `MongoDB connection failed (${message}). Falling back to in-memory storage for this process only.`,
  };
}

export function healthSnapshot() {
  const healthy = state.db.mode === 'mongodb' && state.db.connected;
  return {
    status: healthy ? 'ok' : 'degraded',
    db: { ...state.db },
    uptimeSeconds: Math.floor((Date.now() - state.startedAt) / 1000),
    timestamp: new Date().toISOString(),
  };
}
