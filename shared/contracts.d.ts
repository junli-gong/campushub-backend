export type ResourceType = 'ROOM' | 'EQUIPMENT' | 'LAB';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
}

export interface CreateReservationRequest {
  resourceId: string;
  userId: string;
  startTime: string;
  endTime: string;
}

export interface Reservation extends CreateReservationRequest {
  id: string;
  status: ReservationStatus;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'DOUBLE_BOOKING'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'INVALID_TRANSITION';

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
}

export interface HealthResponse {
  status: 'ok';
  service: 'campushub-backend';
}
