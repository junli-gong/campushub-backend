import type { NextFunction, Request } from 'express';
import type { Response } from 'express-serve-static-core';
import { DomainError, type ErrorResponse } from '../types/error';

export function handleError(
  error: unknown,
  _request: Request,
  response: Response<ErrorResponse, Record<string, never>, 400 | 409 | 500>,
  next: NextFunction,
): void {
  if (response.headersSent) {
    next(error);
    return;
  }
  if (error instanceof DomainError) {
    response
      .status(error.code === 'DOUBLE_BOOKING' ? 409 : 400)
      .json({ code: error.code, message: error.message });
    return;
  }
  if (
    error instanceof Error &&
    'type' in error &&
    (error.type === 'entity.parse.failed' ||
      error.type === 'entity.too.large' ||
      error.type === 'encoding.unsupported' ||
      error.type === 'charset.unsupported')
  ) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Body must be valid application/json within the 100 KB limit.',
    });
    return;
  }
  console.error(error);
  response
    .status(500)
    .json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
}
