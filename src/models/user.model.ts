import { Schema, model } from 'mongoose';

export interface UserDocument {
  id: string;
  name: string;
  email: string;
}

export const userSchema = new Schema<UserDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      match: /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/,
    },
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  },
  { strict: 'throw', versionKey: false },
);

export const UserModel = model<UserDocument>('User', userSchema);
