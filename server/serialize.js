function toPlain(value) {
  if (!value) return {};
  return typeof value.toObject === 'function' ? value.toObject() : { ...value };
}

function clone(value) {
  if (value === undefined) return undefined;
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function dateString(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function publicUser(value) {
  const raw = toPlain(value);
  return {
    id: String(raw._id ?? raw.id),
    name: raw.name,
    email: raw.email,
    wishlist: Array.isArray(raw.wishlist) ? [...raw.wishlist] : [],
    createdAt: dateString(raw.createdAt),
  };
}

export function publicTrip(value) {
  const raw = toPlain(value);
  return {
    id: String(raw._id ?? raw.id),
    owner: String(raw.owner),
    name: raw.name,
    origin: raw.origin ?? '',
    destination: raw.destination ?? '',
    destinationName: raw.destinationName ?? '',
    startDate: dateString(raw.startDate),
    endDate: dateString(raw.endDate),
    travellers: raw.travellers ?? 1,
    budget: raw.budget ?? 0,
    preferences: Array.isArray(raw.preferences) ? [...raw.preferences] : [],
    tripType: raw.tripType ?? '',
    itinerary: clone(raw.itinerary ?? []),
    expenses: clone(raw.expenses ?? []),
    status: raw.status ?? 'draft',
    createdAt: dateString(raw.createdAt),
  };
}
