import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { signToken, requireAuth } from '../auth.js';
import { createUser, findUserByEmail } from '../repository.js';
import { publicUser } from '../serialize.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { validateLogin, validateRegister } from '../validation.js';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(async (req, res) => {
  const { errors, value } = validateRegister(req.body);
  if (errors.length) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', errors);
  }

  if (await findUserByEmail(value.email)) {
    throw new ApiError(409, 'EMAIL_IN_USE', 'An account with that email already exists.');
  }

  const passwordHash = await bcrypt.hash(value.password, 10);
  const user = await createUser({ name: value.name, email: value.email, passwordHash });
  const token = signToken(user._id ?? user.id);
  res.status(201).json({ token, user: publicUser(user) });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const { errors, value } = validateLogin(req.body);
  if (errors.length) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', errors);
  }

  const user = await findUserByEmail(value.email);
  const passwordMatches = user ? await bcrypt.compare(value.password, user.passwordHash) : false;
  if (!user || !passwordMatches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  const token = signToken(user._id ?? user.id);
  res.json({ token, user: publicUser(user) });
}));

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

// JWTs are stateless: the server cannot revoke a token, so the client discards it.
authRouter.post('/logout', (req, res) => {
  res.json({ ok: true, message: 'Discard the stored token to sign out.' });
});
