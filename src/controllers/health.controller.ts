import type { Request, Response } from 'express';
import { getHealth } from '../services/health.service';
import type { HealthResponse } from '../types/health';

export function getHealthHandler(
  _request: Request,
  response: Response<HealthResponse>,
): void {
  response.status(200).json(getHealth());
}
