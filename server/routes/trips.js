import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { createTrip, deleteTrip, findTrip, listTrips, updateTrip } from '../repository.js';
import { publicTrip } from '../serialize.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { validateResourceId, validateTrip } from '../validation.js';

export const tripsRouter = Router();
tripsRouter.use(requireAuth);

tripsRouter.get('/', asyncHandler(async (req, res) => {
  const trips = await listTrips(req.userId);
  res.json(trips.map(publicTrip));
}));

tripsRouter.post('/', asyncHandler(async (req, res) => {
  const { errors, value } = validateTrip(req.body);
  if (errors.length) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Please check the trip details.', errors);
  }
  const trip = await createTrip(req.userId, value);
  res.status(201).json(publicTrip(trip));
}));

tripsRouter.put('/:id', asyncHandler(async (req, res) => {
  const idResult = validateResourceId(req.params.id);
  if (idResult.errors.length) {
    throw new ApiError(400, 'INVALID_ID', 'A valid trip id is required.');
  }
  const { errors, value } = validateTrip(req.body, { partial: true });
  if (errors.length) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Please check the trip details.', errors);
  }
  const existing = await findTrip(req.userId, idResult.value);
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Trip not found.');

  const trip = await updateTrip(req.userId, idResult.value, value);
  if (!trip) throw new ApiError(404, 'NOT_FOUND', 'Trip not found.');
  res.json(publicTrip(trip));
}));

tripsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const idResult = validateResourceId(req.params.id);
  if (idResult.errors.length) {
    throw new ApiError(400, 'INVALID_ID', 'A valid trip id is required.');
  }
  const removed = await deleteTrip(req.userId, idResult.value);
  if (!removed) throw new ApiError(404, 'NOT_FOUND', 'Trip not found.');
  res.json({ ok: true });
}));
