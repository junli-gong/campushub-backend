import { ResourceModel } from '../models/Resource.model';
import { ReservationModel } from '../models/Reservation.model';
import type { Resource } from '../types/reservation';

const seedResources: readonly Resource[] = [
  {
    id: 'res-101',
    name: 'Study Room 302',
    type: 'ROOM',
    location: 'Library, Floor 3',
    isAvailable: true,
  },
  {
    id: 'res-102',
    name: '3D Printer A',
    type: 'EQUIPMENT',
    location: 'Maker Space',
    isAvailable: true,
  },
  {
    id: 'res-103',
    name: 'Computer Lab',
    type: 'LAB',
    location: 'Engineering Building',
    isAvailable: true,
  },
  {
    id: 'res-104',
    name: 'Study Room 303',
    type: 'ROOM',
    location: 'Library, Floor 3',
    isAvailable: false,
  },
];

export async function initializeModels(): Promise<void> {
  await Promise.all([ResourceModel.init(), ReservationModel.init()]);
}

export async function seedResourcesIfMissing(): Promise<void> {
  await initializeModels();
  for (const resource of seedResources) {
    await ResourceModel.updateOne(
      { id: resource.id },
      { $setOnInsert: resource },
      { upsert: true, runValidators: true },
    ).exec();
  }
}
