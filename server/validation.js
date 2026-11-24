/**
 * Pure validation helpers. No I/O and no framework imports so node:test can
 * exercise them directly. Errors are returned (not thrown) for easy mapping to 400s.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRING_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const TRIP_STATUSES = ['draft', 'planned', 'active', 'completed', 'cancelled'];

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function addError(errors, field, message) {
  errors.push({ field, message });
}

function text(value, field, errors, { required = false, max = 120, label = field } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) addError(errors, field, `${label} is required.`);
    return undefined;
  }
  if (typeof value !== 'string') {
    addError(errors, field, `${label} must be text.`);
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) addError(errors, field, `${label} is required.`);
    return undefined;
  }
  if (trimmed.length > max) addError(errors, field, `${label} must be ${max} characters or fewer.`);
  return trimmed;
}

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validateRegister(input = {}) {
  const errors = [];
  const source = isPlainObject(input) ? input : {};
  const name = text(source.name, 'name', errors, { required: true, max: 80, label: 'Name' });
  const email = normalizeEmail(source.email);
  if (!email) addError(errors, 'email', 'Email is required.');
  else if (email.length > 254) addError(errors, 'email', 'Email is too long.');
  else if (!EMAIL_RE.test(email)) addError(errors, 'email', 'Enter a valid email address.');

  const password = typeof source.password === 'string' ? source.password : '';
  if (!password) addError(errors, 'password', 'Password is required.');
  else if (password.length < 8) addError(errors, 'password', 'Password must be at least 8 characters.');
  else if (password.length > 128) addError(errors, 'password', 'Password must be 128 characters or fewer.');

  return {
    errors,
    value: errors.length ? null : { name, email, password },
  };
}

export function validateLogin(input = {}) {
  const errors = [];
  const source = isPlainObject(input) ? input : {};
  const email = normalizeEmail(source.email);
  if (!email) addError(errors, 'email', 'Email is required.');
  else if (!EMAIL_RE.test(email)) addError(errors, 'email', 'Enter a valid email address.');

  const password = typeof source.password === 'string' ? source.password : '';
  if (!password) addError(errors, 'password', 'Password is required.');

  return { errors, value: errors.length ? null : { email, password } };
}

export function validateDestinationId(value, field = 'destinationId') {
  const errors = [];
  const id = text(value, field, errors, { required: true, max: 80, label: 'Destination' });
  if (id && !STRING_ID_RE.test(id)) addError(errors, field, `${field} contains unsupported characters.`);
  return { errors, value: errors.length ? null : id };
}

function validatedDate(value, field, errors, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) addError(errors, field, `${field} is required.`);
    return undefined;
  }
  if (typeof value !== 'string' && !(value instanceof Date)) {
    addError(errors, field, `${field} must be a date string.`);
    return undefined;
  }
  const raw = typeof value === 'string' ? value.trim() : value.toISOString();
  if (!raw) {
    if (required) addError(errors, field, `${field} is required.`);
    return undefined;
  }

  let normalized = raw;
  if (ISO_DATE_RE.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      addError(errors, field, `${field} is not a real calendar date.`);
      return undefined;
    }
    normalized = raw;
  } else {
    const timestamp = Date.parse(raw);
    if (Number.isNaN(timestamp)) {
      addError(errors, field, `${field} must be a valid ISO date.`);
      return undefined;
    }
    normalized = new Date(timestamp).toISOString();
  }
  return normalized;
}

function validatedNumber(value, field, errors, { required = false, min = 0, max = 1e9, integer = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) addError(errors, field, `${field} is required.`);
    return undefined;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    addError(errors, field, `${field} must be a number.`);
    return undefined;
  }
  if (integer && !Number.isInteger(numeric)) {
    addError(errors, field, `${field} must be a whole number.`);
    return undefined;
  }
  if (numeric < min || numeric > max) {
    addError(errors, field, `${field} must be between ${min} and ${max}.`);
    return undefined;
  }
  return numeric;
}

function validatedStringArray(value, field, errors, { maxItems = 20, maxLength = 80 } = {}) {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    addError(errors, field, `${field} must be a list.`);
    return undefined;
  }
  if (value.length > maxItems) {
    addError(errors, field, `${field} must contain ${maxItems} items or fewer.`);
    return undefined;
  }
  const valid = [];
  value.forEach((entry, index) => {
    if (typeof entry !== 'string' || !entry.trim()) {
      addError(errors, field, `${field}[${index}] must be non-empty text.`);
    } else if (entry.trim().length > maxLength) {
      addError(errors, field, `${field}[${index}] is too long.`);
    } else {
      valid.push(entry.trim());
    }
  });
  return valid;
}

function validatedObjectArray(value, field, errors, { maxItems = 60 } = {}) {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    addError(errors, field, `${field} must be a list.`);
    return undefined;
  }
  if (value.length > maxItems) {
    addError(errors, field, `${field} must contain ${maxItems} items or fewer.`);
    return undefined;
  }
  if (value.some((entry) => !isPlainObject(entry))) {
    addError(errors, field, `${field} entries must be objects.`);
    return undefined;
  }
  return value;
}

/**
 * Validates a trip for create (partial = false) or update (partial = true).
 * For updates only supplied fields are checked, so clients can patch a subset.
 */
export function validateTrip(input = {}, { partial = false } = {}) {
  const errors = [];
  const source = isPlainObject(input) ? input : {};
  if (partial && Object.keys(source).length === 0) {
    addError(errors, 'body', 'No trip fields were supplied.');
    return { errors, value: null };
  }

  const value = {};
  const stringFields = [
    ['name', 120, true],
    ['origin', 120, false],
    ['destination', 80, false],
    ['destinationName', 120, false],
    ['tripType', 60, false],
    ['status', 32, false],
  ];
  for (const [field, max, required] of stringFields) {
    if (!(field in source) && partial) continue;
    const parsed = text(source[field], field, errors, { required, max, label: field });
    if (parsed !== undefined) value[field] = parsed;
  }

  for (const field of ['startDate', 'endDate']) {
    if (!(field in source) && partial) continue;
    const parsed = validatedDate(source[field], field, errors, { required: false });
    if (parsed !== undefined) value[field] = parsed;
  }

  if (!partial || 'travellers' in source) {
    const travellers = validatedNumber(source.travellers, 'travellers', errors, {
      required: !partial, min: 1, max: 100, integer: true,
    });
    if (travellers !== undefined) value.travellers = travellers;
  }

  if (!partial || 'budget' in source) {
    const budget = validatedNumber(source.budget, 'budget', errors, {
      required: !partial, min: 0, max: 1e9,
    });
    if (budget !== undefined) value.budget = budget;
  }

  for (const field of ['preferences', 'itinerary', 'expenses']) {
    if (!(field in source) && partial) continue;
    const parsed = field === 'preferences'
      ? validatedStringArray(source[field], field, errors)
      : validatedObjectArray(source[field], field, errors);
    if (parsed !== undefined) value[field] = parsed;
  }

  if (value.status && !TRIP_STATUSES.includes(value.status)) {
    addError(errors, 'status', `status must be one of: ${TRIP_STATUSES.join(', ')}.`);
  }

  if (!partial && !value.destination && !value.destinationName) {
    addError(errors, 'destination', 'Either destination or destinationName is required.');
  }

  if (value.startDate && value.endDate) {
    const start = Date.parse(value.startDate);
    const end = Date.parse(value.endDate);
    if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
      addError(errors, 'endDate', 'endDate must be on or after startDate.');
    }
  }

  if (partial && Object.keys(value).length === 0 && errors.length === 0) {
    addError(errors, 'body', 'No usable trip fields were supplied.');
  }

  return { errors, value: errors.length ? null : value };
}

export function validateResourceId(id, field = 'id') {
  const errors = [];
  const value = text(id, field, errors, { required: true, max: 100, label: 'Trip id' });
  return { errors, value: errors.length ? null : value };
}
