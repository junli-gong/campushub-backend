import { ResourceModel } from '../models/Resource.model';
import { ReservationModel } from '../models/Reservation.model';

// Builds model indexes (such as the unique public id) before the API or seed uses them.
export async function initializeModels(): Promise<void> {
  await Promise.all([ResourceModel.init(), ReservationModel.init()]);
}
