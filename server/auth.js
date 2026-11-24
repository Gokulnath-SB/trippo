import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { ApiError, asyncHandler } from './utils/http.js';
import { findUserById } from './repository.js';

const TOKEN_TTL = '7d';

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: TOKEN_TTL });
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = String(req.headers.authorization ?? '');
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    throw new ApiError(401, 'UNAUTHORIZED', 'A bearer token is required.');
  }

  let userId;
  try {
    const payload = jwt.verify(match[1].trim(), config.jwtSecret);
    if (!payload?.sub) throw new Error('Missing subject');
    userId = String(payload.sub);
  } catch {
    throw new ApiError(401, 'INVALID_TOKEN', 'Your session is invalid or has expired.');
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(401, 'INVALID_TOKEN', 'Your account no longer exists.');
  }

  req.userId = userId;
  req.user = user;
  next();
});
