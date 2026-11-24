import test from 'node:test';
import assert from 'node:assert/strict';
import { authApi, isLiveApi, tripsApi, wishlistApi } from '../src/lib/api.js';
import { STORAGE_KEYS, getJSON, removeJSON } from '../src/lib/storage.js';

function memoryLocalStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: (key) => { values.delete(key); },
  };
}

globalThis.localStorage = memoryLocalStorage();

function resetStore() {
  Object.values(STORAGE_KEYS).forEach((key) => removeJSON(key));
}

test('browser client uses demo mode without VITE_API_URL', () => {
  assert.equal(isLiveApi(), false);
});

test('demo register, me and login persist a clearly local session', async () => {
  resetStore();
  const registered = await authApi.register({
    name: 'Meera', email: 'meera@example.com', password: 'demo-password',
  });
  assert.match(registered.token, /^demo\./);
  assert.equal(registered.user.email, 'meera@example.com');
  assert.equal(registered.user.passwordHash, undefined);
  assert.deepEqual(await authApi.me(), registered.user);

  await authApi.logout();
  await assert.rejects(() => authApi.me(), /No active session/);

  const loggedIn = await authApi.login({ email: 'MEERA@example.com', password: 'demo-password' });
  assert.equal(loggedIn.user.id, registered.user.id);
  await assert.rejects(
    () => authApi.login({ email: 'meera@example.com', password: 'wrong-password' }),
    /incorrect/,
  );
  assert.equal(getJSON(STORAGE_KEYS.token, null), loggedIn.token);
});

test('demo trips upsert by id and delete only the owner\'s trips', async () => {
  resetStore();
  const created = await tripsApi.save({ name: 'Goa break', destination: 'goa', budget: 12000 });
  assert.equal(typeof created.id, 'string');
  assert.equal(created.owner, 'demo-guest');

  const updated = await tripsApi.save({ ...created, name: 'Goa, extended' });
  assert.equal(updated.id, created.id);
  assert.equal((await tripsApi.list()).length, 1);
  assert.equal((await tripsApi.list())[0].name, 'Goa, extended');

  assert.deepEqual(await tripsApi.remove(created.id), { ok: true });
  assert.deepEqual(await tripsApi.list(), []);
  await assert.rejects(() => tripsApi.remove(created.id), /not found/);
});

test('demo wishlist toggles and validates ids', async () => {
  resetStore();
  assert.deepEqual(await wishlistApi.list(), []);
  assert.deepEqual(await wishlistApi.toggle('ooty'), ['ooty']);
  assert.deepEqual(await wishlistApi.toggle('jaipur'), ['ooty', 'jaipur']);
  assert.deepEqual(await wishlistApi.toggle('ooty'), ['jaipur']);
  assert.deepEqual(await wishlistApi.list(), ['jaipur']);
  await assert.rejects(() => wishlistApi.toggle(''), /destination id/);
});
