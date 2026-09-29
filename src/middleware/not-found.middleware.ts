import type { Request } from 'express';
import type { Response } from 'express-serve-static-core';
import type { ErrorResponse } from '../types/error';

export function handleNotFound(
  _request: Request,
  response: Response<ErrorResponse, Record<string, never>, 404>,
): void {
  response.status(404).json({ code: 'NOT_FOUND', message: 'Not found' });
}
