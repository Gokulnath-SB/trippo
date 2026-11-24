import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { findUserById, setUserWishlist } from '../repository.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { validateDestinationId } from '../validation.js';

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);

wishlistRouter.get('/', (req, res) => {
  res.json({ wishlist: [...(req.user.wishlist ?? [])] });
});

wishlistRouter.post('/toggle', asyncHandler(async (req, res) => {
  const { errors, value } = validateDestinationId(req.body?.destinationId);
  if (errors.length) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'A destination id is required.', errors);
  }

  const current = await findUserById(req.userId);
  if (!current) throw new ApiError(401, 'INVALID_TOKEN', 'Your account no longer exists.');

  const existing = Array.isArray(current.wishlist) ? current.wishlist : [];
  const next = existing.includes(value)
    ? existing.filter((id) => id !== value)
    : [...existing, value];

  const updated = await setUserWishlist(req.userId, next);
  if (!updated) throw new ApiError(401, 'INVALID_TOKEN', 'Your account no longer exists.');
  res.json({ wishlist: [...updated.wishlist] });
}));
