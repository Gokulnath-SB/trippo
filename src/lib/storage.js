/**
 * Safe JSON storage helpers. Work in browsers, SSR and node:test without throwing.
 * A process-local Map is used whenever Web Storage is unavailable or blocked.
 */

export const STORAGE_KEYS = {
  token: 'tripo:auth:token',
  user: 'tripo:auth:user',
  users: 'tripo:demo:users',
  trips: 'tripo:demo:trips',
  wishlist: 'tripo:demo:wishlist',
};

const memory = new Map();

function webStorage() {
  try {
    const candidate = globalThis.localStorage;
    if (candidate && typeof candidate.getItem === 'function' && typeof candidate.setItem === 'function') {
      return candidate;
    }
  } catch {
    // Access can throw in privacy modes / sandboxed frames.
  }
  return null;
}

function readRaw(key) {
  const store = webStorage();
  if (store) {
    try {
      return store.getItem(key);
    } catch {
      // Fall through to the in-process fallback.
    }
  }
  return memory.has(key) ? memory.get(key) : null;
}

function writeRaw(key, raw) {
  memory.set(key, raw);
  const store = webStorage();
  if (!store) return false;
  try {
    store.setItem(key, raw);
    return true;
  } catch {
    return false;
  }
}

function removeRaw(key) {
  memory.delete(key);
  const store = webStorage();
  if (!store) return false;
  try {
    store.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getJSON(key, fallback = null) {
  const raw = readRaw(key);
  if (raw === null || raw === undefined || raw === '') return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    removeRaw(key);
    return fallback;
  }
}

export function setJSON(key, value) {
  let raw;
  try {
    raw = JSON.stringify(value);
  } catch {
    throw new Error(`Unable to store ${key}: value is not JSON-serializable.`);
  }
  if (raw === undefined) {
    removeRaw(key);
    return true;
  }
  return writeRaw(key, raw);
}

export function removeJSON(key) {
  return removeRaw(key);
}

export const storage = { get: getJSON, set: setJSON, remove: removeJSON };
