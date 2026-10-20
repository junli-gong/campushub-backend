import type { Request } from 'express';
import type { Response } from 'express-serve-static-core';
import {
  createReservation,
  updateReservationStatus,
  listUserReservations,
} from '../services/reservation.service';
import {
  validateIdentifier,
  validateReservation,
} from '../services/validation.service';
import type {
  Reservation,
  ReservationParams,
  UserReservationParams,
} from '../types/reservation';

export async function createReservationHandler(
  request: Request<Record<string, string>, Reservation, unknown>,
  response: Response<Reservation, Record<string, never>, 201>,
): Promise<void> {
  const input = validateReservation(request.body);
  response.status(201).json(await createReservation(input));
}

export async function listUserReservationsHandler(
  request: Request<UserReservationParams>,
  response: Response<Reservation[], Record<string, never>, 200>,
): Promise<void> {
  const userId = validateIdentifier(request.params.userId, 'userId');
  response.status(200).json(await listUserReservations(userId));
}

export async function confirmReservationHandler(
  request: Request<ReservationParams>,
  response: Response<Reservation, Record<string, never>, 200>,
): Promise<void> {
  const id = validateIdentifier(request.params.id, 'id');
  response.status(200).json(await updateReservationStatus(id, 'CONFIRMED'));
}

export async function cancelReservationHandler(
  request: Request<ReservationParams>,
  response: Response<Reservation, Record<string, never>, 200>,
): Promise<void> {
  const id = validateIdentifier(request.params.id, 'id');
  response.status(200).json(await updateReservationStatus(id, 'CANCELLED'));
}
