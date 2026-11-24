export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export function sendError(res, status, code, message, details) {
  const error = { message, code };
  if (details !== undefined) error.details = details;
  return res.status(status).json({ error });
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function notFoundHandler(req, res) {
  return sendError(res, 404, 'NOT_FOUND', `No API route matches ${req.method} ${req.originalUrl}.`);
}

export function errorHandler(err, req, res, _next) {
  if (res.headersSent) return;

  if (err instanceof ApiError) {
    sendError(res, err.status, err.code, err.message, err.details);
    return;
  }

  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    sendError(res, 400, 'INVALID_JSON', 'Request body must contain valid JSON.');
    return;
  }

  if (err?.name === 'CastError') {
    sendError(res, 400, 'INVALID_ID', 'A supplied identifier is not valid.');
    return;
  }

  if (err?.name === 'ValidationError') {
    const details = Object.entries(err.errors ?? {}).map(([field, item]) => ({ field, message: item.message }));
    sendError(res, 400, 'VALIDATION_ERROR', 'The supplied data is invalid.', details);
    return;
  }

  if (err?.code === 11000) {
    sendError(res, 409, 'CONFLICT', 'That value is already in use.');
    return;
  }

  if (err?.message === 'Not allowed by CORS') {
    sendError(res, 403, 'CORS_DENIED', 'This origin is not allowed by CORS.');
    return;
  }

  console.error('[api] unhandled error:', err);
  sendError(res, 500, 'INTERNAL_ERROR', 'The server could not complete that request.');
}
