import type {
  Resource,
  Reservation,
  CreateReservationRequest,
} from '../../../src/types/reservation';
export type {
  Resource,
  Reservation,
  ResourceType,
} from '../../../src/types/reservation';
export type CreateReservationDTO = CreateReservationRequest;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isResource(value: unknown): value is Resource {
  return (
    record(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['location'] === 'string' &&
    typeof value['isAvailable'] === 'boolean' &&
    ['ROOM', 'EQUIPMENT', 'LAB'].includes(String(value['type']))
  );
}
function isReservation(value: unknown): value is Reservation {
  return (
    record(value) &&
    ['id', 'resourceId', 'userId', 'startTime', 'endTime'].every(
      (key: string): boolean => typeof value[key] === 'string',
    ) &&
    ['PENDING', 'CONFIRMED', 'CANCELLED'].includes(String(value['status'])) &&
    Number.isFinite(Date.parse(String(value['startTime']))) &&
    Number.isFinite(Date.parse(String(value['endTime'])))
  );
}
async function request(path: string, options?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Unable to connect. Check your connection and try again.',
    );
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      'INVALID_RESPONSE',
      'The service is unavailable. Please try again.',
    );
  }
  if (!response.ok) {
    const code =
      record(data) && typeof data['code'] === 'string'
        ? data['code']
        : 'REQUEST_FAILED';
    const message =
      response.status >= 500
        ? 'The service is unavailable. Please try again.'
        : record(data) && typeof data['message'] === 'string'
          ? data['message']
          : 'Request failed. Please try again.';
    throw new ApiError(response.status, code, message);
  }
  return data;
}
export function errorMessage(error: unknown): string {
  if (
    error instanceof ApiError &&
    error.status === 409 &&
    error.code === 'DOUBLE_BOOKING'
  )
    return 'This resource is already reserved for the selected time window. Please choose another time.';
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';
}
export async function fetchResources(type?: string): Promise<Resource[]> {
  const query = new URLSearchParams({ isAvailable: 'true' });
  if (type) query.set('type', type);
  const data = await request(`/resources?${query.toString()}`);
  if (!Array.isArray(data) || !data.every(isResource))
    throw new Error('The service returned an invalid resource list.');
  return data;
}
export async function createReservation(
  payload: CreateReservationDTO,
): Promise<Reservation> {
  const data = await request('/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!isReservation(data))
    throw new Error(
      'The service returned an invalid reservation. Refresh My Bookings before retrying.',
    );
  return data;
}
export async function fetchUserReservations(
  userId: string,
): Promise<Reservation[]> {
  const data = await request(
    `/reservations/user/${encodeURIComponent(userId)}`,
  );
  if (!Array.isArray(data) || !data.every(isReservation))
    throw new Error('The service returned an invalid booking list.');
  return data;
}
export async function cancelReservation(
  reservationId: string,
): Promise<Reservation> {
  const data = await request(
    `/reservations/${encodeURIComponent(reservationId)}/cancel`,
    { method: 'PATCH' },
  );
  if (!isReservation(data))
    throw new Error(
      'The service returned an invalid reservation. Refresh My Bookings before retrying.',
    );
  return data;
}
