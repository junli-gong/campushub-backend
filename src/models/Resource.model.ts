import { Schema, model, type Types } from 'mongoose';
import type { ResourceType } from '../types/reservation';

export interface ResourceDocument {
  _id: Types.ObjectId;
  bookingVersion: number;
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  isAvailable: boolean;
}

export const resourceSchema = new Schema<ResourceDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      match: /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/,
    },
    bookingVersion: { type: Number, required: true, default: 0 },
    name: { type: String, required: true },
    type: { type: String, enum: ['ROOM', 'EQUIPMENT', 'LAB'], required: true },
    location: { type: String, required: true },
    isAvailable: { type: Boolean, required: true },
  },
  { strict: 'throw', versionKey: false },
);

export const ResourceModel = model<ResourceDocument>(
  'Resource',
  resourceSchema,
);
