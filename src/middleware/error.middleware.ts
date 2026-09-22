import type { NextFunction, Request, Response } from 'express';
import type { ErrorResponse } from '../types/error';

export function handleError(
  error: unknown,
  _request: Request,
  response: Response<ErrorResponse>,
  next: NextFunction,
): void {
  if (response.headersSent) {
    next(error);
    return;
  }
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
}
