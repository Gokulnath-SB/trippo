/**
 * Browser-safe API client. No Node imports.
 *
 * When VITE_API_URL is set it talks to the Express API with a bearer token.
 * When it is absent it uses a clearly-labelled localStorage DEMO store so the
 * UI remains fully explorable without credentials or a database.
 */
import { STORAGE_KEYS, getJSON, removeJSON, setJSON } from './storage.js';

const runtimeEnv = (() => {
  try {
    return typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  } catch {
    return {};
  }
})();

const API_URL = String(runtimeEnv.VITE_API_URL ?? '')
  .trim()
  .replace(/\/+$/, '');

export function isLiveApi() {
  return API_URL.length > 0;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function saveSession(token, user) {
  setJSON(STORAGE_KEYS.token, token);
  setJSON(STORAGE_KEYS.user, user ?? null);
}

function clearSession() {
  removeJSON(STORAGE_KEYS.token);
  removeJSON(STORAGE_KEYS.user);
}

function storedToken() {
  const token = getJSON(STORAGE_KEYS.token, null);
  return typeof token === 'string' && token ? token : null;
}

// ---------------------------------------------------------------------------
// Live transport
// ---------------------------------------------------------------------------

async function request(path, { method = 'GET', body, auth = true } = {}) {
  if (!isLiveApi()) throw new Error('The live API is not configured.');

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = storedToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the API. Check your connection or VITE_API_URL setting.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`The API returned an unreadable response (${response.status}).`);
  }

  if (!response.ok) {
    if (response.status === 401) clearSession();
    const detail = payload?.error;
    const error = new Error(detail?.message || `The API request failed (${response.status}).`);
    error.code = detail?.code;
    error.status = response.status;
    if (Array.isArray(detail?.details)) error.details = detail.details;
    throw error;
  }

  return payload;
}

// ---------------------------------------------------------------------------
// DEMO store (never secure — see hash note below)
// ---------------------------------------------------------------------------

// DEMO ONLY: this deterministic FNV-1a hash exists so the browser demo can
// "remember" a password without a server. It is NOT password security. Never
// reuse these records, this hash, or this flow for real accounts.
function demoHash(email, password) {
  const input = `${String(email).toLowerCase()}:${String(password)}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function readDemoUsers() {
  const users = getJSON(STORAGE_KEYS.users, []);
  return Array.isArray(users) ? users.filter((user) => user && typeof user.id === 'string') : [];
}

function writeDemoUsers(users) {
  setJSON(STORAGE_KEYS.users, users);
}

function readDemoTrips() {
  const trips = getJSON(STORAGE_KEYS.trips, []);
  return Array.isArray(trips) ? trips.filter((trip) => trip && typeof trip.id === 'string') : [];
}

function writeDemoTrips(trips) {
  setJSON(STORAGE_KEYS.trips, trips);
}

function readDemoWishlists() {
  const value = getJSON(STORAGE_KEYS.wishlist, {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function publicDemoUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    wishlist: Array.isArray(user.wishlist) ? [...user.wishlist] : [],
    createdAt: user.createdAt,
  };
}

function demoUserIdFromToken() {
  const token = storedToken();
  if (!token) return 'demo-guest';
  const match = /^demo\.([^.]+)\./.exec(token);
  if (!match) return 'demo-guest';
  return readDemoUsers().some((user) => user.id === match[1]) ? match[1] : 'demo-guest';
}

function demoUserById(id) {
  return readDemoUsers().find((user) => user.id === id) ?? null;
}

function requireDemoFields(input, fields) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Please provide valid account details.');
  }
  for (const field of fields) {
    if (typeof input[field] !== 'string' || !input[field].trim()) {
      throw new Error(`${field[0].toUpperCase()}${field.slice(1)} is required.`);
    }
  }
}

function demoRegister({ name, email, password }) {
  requireDemoFields({ name, email, password }, ['name', 'email', 'password']);
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Enter a valid email address.');
  }
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');

  const users = readDemoUsers();
  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error('An account with that email already exists.');
  }

  const user = {
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: normalizedName,
    email: normalizedEmail,
    passwordHash: demoHash(normalizedEmail, password),
    wishlist: [],
    createdAt: new Date().toISOString(),
  };
  writeDemoUsers([...users, user]);

  const token = `demo.${user.id}.${Date.now()}`;
  saveSession(token, publicDemoUser(user));
  return { token, user: publicDemoUser(user) };
}

function demoLogin({ email, password }) {
  requireDemoFields({ email, password }, ['email', 'password']);
  const normalizedEmail = email.trim().toLowerCase();
  const user = readDemoUsers().find((candidate) => candidate.email === normalizedEmail);
  if (!user || user.passwordHash !== demoHash(normalizedEmail, password)) {
    throw new Error('Email or password is incorrect.');
  }

  const token = `demo.${user.id}.${Date.now()}`;
  saveSession(token, publicDemoUser(user));
  return { token, user: publicDemoUser(user) };
}

function demoMe() {
  const token = storedToken();
  if (!token) throw new Error('No active session. Please sign in.');
  const match = /^demo\.([^.]+)\./.exec(token);
  const user = match ? demoUserById(match[1]) : null;
  if (!user) {
    clearSession();
    throw new Error('Your demo session is invalid. Please sign in again.');
  }
  return publicDemoUser(user);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const authApi = {
  async register(values) {
    if (!isLiveApi()) return demoRegister(values ?? {});
    const payload = await request('/api/auth/register', { method: 'POST', body: values, auth: false });
    if (!payload?.token || !payload?.user) throw new Error('The API returned an incomplete sign-up response.');
    saveSession(payload.token, payload.user);
    return { token: payload.token, user: payload.user };
  },

  async login(values) {
    if (!isLiveApi()) return demoLogin(values ?? {});
    const payload = await request('/api/auth/login', { method: 'POST', body: values, auth: false });
    if (!payload?.token || !payload?.user) throw new Error('The API returned an incomplete sign-in response.');
    saveSession(payload.token, payload.user);
    return { token: payload.token, user: payload.user };
  },

  async me() {
    if (!isLiveApi()) return demoMe();
    const user = await request('/api/auth/me');
    if (!user || typeof user !== 'object') throw new Error('The API returned an invalid account response.');
    setJSON(STORAGE_KEYS.user, user);
    return user;
  },

  async logout() {
    if (!isLiveApi()) {
      clearSession();
      return { ok: true };
    }
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      clearSession();
    }
    return { ok: true };
  },
};

export const tripsApi = {
  async list() {
    if (!isLiveApi()) {
      const ownerId = demoUserIdFromToken();
      return readDemoTrips()
        .filter((trip) => trip.owner === ownerId)
        .map(clone);
    }
    const payload = await request('/api/trips');
    if (!Array.isArray(payload)) throw new Error('The API returned an invalid trips list.');
    return payload;
  },

  async save(trip) {
    if (!trip || typeof trip !== 'object' || Array.isArray(trip)) {
      throw new Error('A trip object is required.');
    }

    if (!isLiveApi()) {
      const ownerId = demoUserIdFromToken();
      const trips = readDemoTrips();
      const incomingId = typeof trip.id === 'string' ? trip.id : '';
      const index = incomingId ? trips.findIndex((item) => item.id === incomingId && item.owner === ownerId) : -1;
      const { id: _ignoredId, _id, owner: _ignoredOwner, createdAt: _ignoredCreatedAt, ...fields } = trip;
      const record = index >= 0
        ? { ...trips[index], ...clone(fields) }
        : {
            ...clone(fields),
            id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            owner: ownerId,
            createdAt: new Date().toISOString(),
          };
      const next = [...trips];
      if (index >= 0) next[index] = record;
      else next.push(record);
      writeDemoTrips(next);
      return clone(record);
    }

    const { id, _id, owner, createdAt, updatedAt, ...body } = trip;
    const isUpdate = typeof id === 'string' && id.length > 0;
    const payload = await request(isUpdate ? `/api/trips/${encodeURIComponent(id)}` : '/api/trips', {
      method: isUpdate ? 'PUT' : 'POST',
      body,
    });
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('The API returned an invalid trip.');
    }
    return payload;
  },

  async remove(id) {
    if (typeof id !== 'string' || !id.trim()) throw new Error('A trip id is required.');
    if (!isLiveApi()) {
      const ownerId = demoUserIdFromToken();
      const trips = readDemoTrips();
      const next = trips.filter((trip) => !(trip.id === id && trip.owner === ownerId));
      if (next.length === trips.length) throw new Error('Trip not found.');
      writeDemoTrips(next);
      return { ok: true };
    }
    const payload = await request(`/api/trips/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!payload?.ok) throw new Error('The API did not confirm the deletion.');
    return { ok: true };
  },
};

export const wishlistApi = {
  async list() {
    if (!isLiveApi()) {
      const ownerId = demoUserIdFromToken();
      const lists = readDemoWishlists();
      const value = lists[ownerId];
      return Array.isArray(value) ? [...value] : [];
    }
    const payload = await request('/api/wishlist');
    return Array.isArray(payload?.wishlist) ? payload.wishlist : [];
  },

  async toggle(destinationId) {
    if (typeof destinationId !== 'string' || !destinationId.trim()) {
      throw new Error('A destination id is required.');
    }
    const id = destinationId.trim();
    if (!isLiveApi()) {
      const ownerId = demoUserIdFromToken();
      const lists = readDemoWishlists();
      const current = Array.isArray(lists[ownerId]) ? lists[ownerId] : [];
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      writeDemoWishlists({ ...lists, [ownerId]: next });
      return [...next];
    }
    const payload = await request('/api/wishlist/toggle', { method: 'POST', body: { destinationId: id } });
    if (!Array.isArray(payload?.wishlist)) throw new Error('The API returned an invalid wishlist.');
    return payload.wishlist;
  },
};

function writeDemoWishlists(lists) {
  setJSON(STORAGE_KEYS.wishlist, lists);
}
