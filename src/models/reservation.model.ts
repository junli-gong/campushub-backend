import { Schema, model } from 'mongoose';
import type { ReservationStatus } from '../types/reservation';

// Persistence uses Date values; HTTP serialization uses ISO 8601 strings.
export interface ReservationDocument {
  id: string;
  resourceId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
}

export const reservationSchema = new Schema<ReservationDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      match: /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/,
    },
    resourceId: {
      type: String,
      required: true,
      match: /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/,
    },
    userId: {
      type: String,
      required: true,
      match: /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/,
    },
    startTime: { type: Date, required: true },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: unknown, value: Date): boolean {
          return (
            typeof this === 'object' &&
            this !== null &&
            'startTime' in this &&
            this.startTime instanceof Date &&
            value.getTime() > this.startTime.getTime()
          );
        },
        message: 'endTime must be later than startTime',
      },
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
      required: true,
      default: 'PENDING',
    },
  },
  { strict: 'throw', versionKey: false },
);

reservationSchema.index({ resourceId: 1, startTime: 1, endTime: 1 });
export const ReservationModel = model<ReservationDocument>(
  'Reservation',
  reservationSchema,
);
