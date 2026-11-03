import type { HealthResponse } from '../../shared/contracts';

export function getHealth(): HealthResponse {
  return { status: 'ok', service: 'campushub-backend' };
}
