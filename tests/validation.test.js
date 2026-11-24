import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmail,
  validateDestinationId,
  validateLogin,
  validateRegister,
  validateResourceId,
  validateTrip,
} from '../server/validation.js';

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Traveller@Example.COM '), 'traveller@example.com');
  assert.equal(normalizeEmail(null), '');
});

test('validateRegister reports every invalid field', () => {
  const { errors, value } = validateRegister({ name: '', email: 'nope', password: 'short' });
  assert.equal(value, null);
  assert.deepEqual(errors.map((item) => item.field).sort(), ['email', 'name', 'password']);
});

test('validateRegister accepts a valid registration', () => {
  const { errors, value } = validateRegister({
    name: '  Asha  ', email: ' ASHA@example.com ', password: 'correct-horse',
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(value, { name: 'Asha', email: 'asha@example.com', password: 'correct-horse' });
});

test('validateLogin requires email and password', () => {
  assert.equal(validateLogin({}).errors.length, 2);
  assert.deepEqual(validateLogin({ email: 'a@b.com', password: 'pw' }).errors, []);
});

test('validateTrip requires the core create fields', () => {
  const { errors } = validateTrip({});
  const fields = errors.map((item) => item.field);
  assert.ok(fields.includes('name'));
  assert.ok(fields.includes('destination'));
  assert.ok(fields.includes('travellers'));
  assert.ok(fields.includes('budget'));
});

test('validateTrip accepts a well-formed trip and normalizes fields', () => {
  const { errors, value } = validateTrip({
    name: ' Weekend in Ooty ',
    destination: 'ooty',
    destinationName: 'Ooty',
    startDate: '2026-12-01',
    endDate: '2026-12-03',
    travellers: '2',
    budget: '18000',
    preferences: [' nature ', 'tea'],
    tripType: 'family',
    status: 'planned',
  });
  assert.deepEqual(errors, []);
  assert.equal(value.name, 'Weekend in Ooty');
  assert.equal(value.travellers, 2);
  assert.equal(value.budget, 18000);
  assert.deepEqual(value.preferences, ['nature', 'tea']);
});

test('validateTrip rejects impossible dates and reversed ranges', () => {
  assert.ok(validateTrip({ name: 'X', destination: 'ooty', startDate: '2026-02-30' }).errors.length);
  assert.ok(validateTrip({
    name: 'X', destination: 'ooty', startDate: '2026-12-05', endDate: '2026-12-01',
  }).errors.some((item) => item.field === 'endDate'));
});

test('validateTrip partial mode only checks supplied fields', () => {
  assert.deepEqual(validateTrip({ travellers: 3 }, { partial: true }).errors, []);
  assert.ok(validateTrip({ travellers: 0 }, { partial: true }).errors.length);
  assert.ok(validateTrip({}, { partial: true }).errors.length);
});

test('id validators reject missing or malformed ids', () => {
  assert.ok(validateResourceId('').errors.length);
  assert.deepEqual(validateResourceId('t_123').errors, []);
  assert.ok(validateDestinationId('bad id!').errors.length);
  assert.deepEqual(validateDestinationId('ooty').errors, []);
});
