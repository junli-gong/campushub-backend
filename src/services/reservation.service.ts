import { randomUUID } from 'node:crypto';
import { DomainError } from '../types/error';
import type {
  CreateReservationRequest,
  Reservation,
} from '../types/reservation';
import { findResource } from './resource.service';

const reservations: Reservation[] = [];

export function createReservation(
  input: CreateReservationRequest,
): Reservation {
  const resource = findResource(input.resourceId);
  if (!resource || !resource.isAvailable) {
    throw new DomainError(
      'VALIDATION_ERROR',
      'Resource does not exist or is unavailable.',
    );
  }
  const start = Date.parse(input.startTime);
  const end = Date.parse(input.endTime);
  const conflict = reservations.some(
    (reservation: Reservation): boolean =>
      reservation.resourceId === input.resourceId &&
      reservation.status !== 'CANCELLED' &&
      start < Date.parse(reservation.endTime) &&
      end > Date.parse(reservation.startTime),
  );
  if (conflict) {
    throw new DomainError(
      'DOUBLE_BOOKING',
      'Resource is already reserved for this time slot.',
    );
  }
  // No awaits between conflict check and insertion: atomic within this single process.
  const reservation: Reservation = {
    ...input,
    id: randomUUID(),
    status: 'PENDING',
  };
  reservations.push(reservation);
  return { ...reservation };
}

export function listUserReservations(userId: string): Reservation[] {
  return reservations
    .filter(
      (reservation: Reservation): boolean =>
        reservation.userId === userId && reservation.status !== 'CANCELLED',
    )
    .map((reservation: Reservation): Reservation => ({ ...reservation }));
}
