import type { HealthResponse } from '../types/health';

export function getHealth(): HealthResponse {
  return { status: 'ok', service: 'campushub-backend' };
}
