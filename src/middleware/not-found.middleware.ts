import type { Request, Response } from 'express';
import type { ErrorResponse } from '../types/error';

export function handleNotFound(
  _request: Request,
  response: Response<ErrorResponse>,
): void {
  response.status(404).json({ error: 'Not found' });
}
