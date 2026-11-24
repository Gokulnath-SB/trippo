import mongoose from 'mongoose';
import { User, Trip } from './models.js';
import { state } from './state.js';

/** In-memory fallback. It is deliberately non-persistent; health reports this honestly. */
const memory = {
  users: new Map(),
  trips: new Map(),
  sequence: 0,
};

function nextId(prefix) {
  memory.sequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${memory.sequence.toString(36)}`;
}

function usingMongo() {
  return state.db.mode === 'mongodb' && state.db.connected;
}

function validObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

export async function findUserByEmail(email) {
  const normalized = String(email).trim().toLowerCase();
  if (usingMongo()) return User.findOne({ email: normalized });
  for (const user of memory.users.values()) {
    if (user.email === normalized) return user;
  }
  return null;
}

export async function findUserById(id) {
  if (usingMongo()) {
    return validObjectId(id) ? User.findById(id) : null;
  }
  return memory.users.get(String(id)) ?? null;
}

export async function createUser({ name, email, passwordHash }) {
  if (usingMongo()) return User.create({ name, email, passwordHash, wishlist: [], createdAt: new Date() });
  const record = {
    _id: nextId('u'),
    name,
    email,
    passwordHash,
    wishlist: [],
    createdAt: new Date(),
  };
  memory.users.set(record._id, record);
  return record;
}

export async function setUserWishlist(id, wishlist) {
  const ids = [...new Set(wishlist.filter((item) => typeof item === 'string' && item))];
  if (usingMongo()) {
    if (!validObjectId(id)) return null;
    return User.findByIdAndUpdate(id, { $set: { wishlist: ids } }, { new: true });
  }
  const record = memory.users.get(String(id));
  if (!record) return null;
  record.wishlist = ids;
  return record;
}

export async function listTrips(ownerId) {
  if (usingMongo()) {
    return Trip.find({ owner: ownerId }).sort({ createdAt: -1, _id: -1 });
  }
  return [...memory.trips.values()]
    .filter((trip) => trip.owner === String(ownerId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function findTrip(ownerId, id) {
  if (usingMongo()) {
    if (!validObjectId(id) || !validObjectId(ownerId)) return null;
    return Trip.findOne({ _id: id, owner: ownerId });
  }
  const trip = memory.trips.get(String(id));
  return trip && trip.owner === String(ownerId) ? trip : null;
}

function toMongoTripData(data) {
  const result = { ...data };
  for (const field of ['startDate', 'endDate']) {
    if (field in result) {
      result[field] = result[field] ? new Date(result[field]) : undefined;
    }
  }
  return result;
}

export async function createTrip(ownerId, data) {
  if (usingMongo()) {
    return Trip.create({ ...toMongoTripData(data), owner: new mongoose.Types.ObjectId(String(ownerId)) });
  }
  const record = {
    _id: nextId('t'),
    owner: String(ownerId),
    name: data.name,
    origin: data.origin ?? '',
    destination: data.destination ?? '',
    destinationName: data.destinationName ?? '',
    startDate: data.startDate ?? undefined,
    endDate: data.endDate ?? undefined,
    travellers: data.travellers ?? 1,
    budget: data.budget ?? 0,
    preferences: data.preferences ?? [],
    tripType: data.tripType ?? '',
    itinerary: data.itinerary ?? [],
    expenses: data.expenses ?? [],
    status: data.status ?? 'draft',
    createdAt: new Date(),
  };
  memory.trips.set(record._id, record);
  return record;
}

export async function updateTrip(ownerId, id, data) {
  if (usingMongo()) {
    if (!validObjectId(id) || !validObjectId(ownerId)) return null;
    return Trip.findOneAndUpdate(
      { _id: id, owner: ownerId },
      { $set: toMongoTripData(data) },
      { new: true, runValidators: true },
    );
  }
  const record = await findTrip(ownerId, id);
  if (!record) return null;
  Object.assign(record, data);
  for (const field of ['startDate', 'endDate']) {
    if (field in data && !data[field]) delete record[field];
  }
  return record;
}

export async function deleteTrip(ownerId, id) {
  if (usingMongo()) {
    if (!validObjectId(id) || !validObjectId(ownerId)) return false;
    const result = await Trip.deleteOne({ _id: id, owner: ownerId });
    return result.deletedCount > 0;
  }
  const record = await findTrip(ownerId, id);
  if (!record) return false;
  memory.trips.delete(record._id);
  return true;
}
