import { randomUUID } from 'node:crypto';
import type { ClientSession } from 'mongoose';
import { ResourceModel, type ResourceDocument } from '../models/Resource.model';
import {
  ReservationModel,
  type ReservationDocument,
} from '../models/Reservation.model';
import { DomainError } from '../types/error';
import type {
  CreateReservationRequest,
  Reservation,
} from '../types/reservation';

function serializeReservation(
  reservation: ReservationDocument,
  resourceId: string,
): Reservation {
  return {
    id: reservation.id,
    resourceId,
    userId: reservation.userId,
    startTime: reservation.startTime.toISOString().replace('.000Z', 'Z'),
    endTime: reservation.endTime.toISOString().replace('.000Z', 'Z'),
    status: reservation.status,
  };
}

export async function createReservation(
  input: CreateReservationRequest,
): Promise<Reservation> {
  // Updating the resource serializes competing transactions for this resource.
  // An overlap query alone would allow concurrent requests to both succeed.
  return ResourceModel.db.transaction(
    async (session: ClientSession): Promise<Reservation> => {
      const resource = await ResourceModel.findOneAndUpdate(
        { id: input.resourceId, isAvailable: true },
        { $inc: { bookingVersion: 1 } },
        { session, returnDocument: 'after' },
      ).exec();
      if (!resource) {
        throw new DomainError(
          'VALIDATION_ERROR',
          'Resource does not exist or is unavailable.',
        );
      }
      const conflict = await ReservationModel.exists({
        resourceId: resource._id,
        status: { $in: ['PENDING', 'CONFIRMED'] },
        startTime: { $lt: new Date(input.endTime) },
        endTime: { $gt: new Date(input.startTime) },
      }).session(session);
      if (conflict) {
        throw new DomainError(
          'DOUBLE_BOOKING',
          'Resource is already reserved for this time slot.',
        );
      }
      const reservation = new ReservationModel({
        ...input,
        id: randomUUID(),
        resourceId: resource._id,
        status: 'PENDING',
        startTime: new Date(input.startTime),
        endTime: new Date(input.endTime),
      });
      await reservation.save({ session });
      return serializeReservation(reservation, resource.id);
    },
  );
}

export async function listUserReservations(
  userId: string,
): Promise<Reservation[]> {
  const reservations = await ReservationModel.find({
    userId,
    status: { $in: ['PENDING', 'CONFIRMED'] },
  })
    .sort({ _id: 1 })
    .lean()
    .exec();
  const resources = await ResourceModel.find({
    _id: {
      $in: reservations.map(
        (reservation: ReservationDocument): ReservationDocument['resourceId'] =>
          reservation.resourceId,
      ),
    },
  })
    .lean()
    .exec();
  const resourceIds = new Map(
    resources.map((resource: ResourceDocument): [string, string] => [
      resource._id.toHexString(),
      resource.id,
    ]),
  );
  return reservations.map((reservation: ReservationDocument): Reservation => {
    const resourceId = resourceIds.get(reservation.resourceId.toHexString());
    if (resourceId === undefined)
      throw new Error('Reservation references a missing resource');
    return serializeReservation(reservation, resourceId);
  });
}
