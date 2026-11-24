import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';

let server;
let base;

test.before(async () => {
  server = await new Promise((resolve) => {
    const instance = createApp().listen(0, '127.0.0.1', () => resolve(instance));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function call(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

test('health reports degraded mode when no database is configured', async () => {
  const { status, payload } = await call('/api/health');
  assert.equal(status, 200);
  assert.equal(payload.status, 'degraded');
  assert.equal(payload.db.mode, 'memory');
  assert.equal(payload.db.persistent, false);
});

test('auth, trips and wishlist endpoints work end to end with consistent errors', async () => {
  const invalid = await call('/api/auth/register', {
    method: 'POST', body: { name: '', email: 'bad', password: 'x' },
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.payload.error.code, 'VALIDATION_ERROR');
  assert.equal(typeof invalid.payload.error.message, 'string');

  const unauthenticated = await call('/api/trips');
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.payload.error.code, 'UNAUTHORIZED');

  const registered = await call('/api/auth/register', {
    method: 'POST',
    body: { name: 'Integration User', email: 'integration@example.com', password: 'integration-password' },
  });
  assert.equal(registered.status, 201);
  assert.equal(registered.payload.user.passwordHash, undefined);
  const token = registered.payload.token;

  const me = await call('/api/auth/me', { token });
  assert.equal(me.status, 200);
  assert.equal(me.payload.email, 'integration@example.com');

  const created = await call('/api/trips', {
    method: 'POST',
    token,
    body: {
      name: 'Coorg weekend', destination: 'coorg', destinationName: 'Coorg',
      startDate: '2026-12-10', endDate: '2026-12-12', travellers: 2, budget: 15000,
      preferences: ['coffee'], tripType: 'weekend', status: 'planned',
    },
  });
  assert.equal(created.status, 201);
  const tripId = created.payload.id;

  const updated = await call(`/api/trips/${tripId}`, {
    method: 'PUT', token, body: { name: 'Coorg, relaxed' },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.payload.name, 'Coorg, relaxed');
  assert.equal((await call('/api/trips', { token })).payload.length, 1);

  const wishlist = await call('/api/wishlist/toggle', {
    method: 'POST', token, body: { destinationId: 'coorg' },
  });
  assert.deepEqual(wishlist.payload.wishlist, ['coorg']);

  assert.equal((await call(`/api/trips/${tripId}`, { method: 'DELETE', token })).status, 200);
  const missing = await call(`/api/trips/${tripId}`, { method: 'PUT', token, body: { name: 'x' } });
  assert.equal(missing.status, 404);
  assert.equal(missing.payload.error.code, 'NOT_FOUND');

  assert.equal((await call('/api/auth/logout', { method: 'POST', token })).payload.ok, true);
});
