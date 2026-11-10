import type { CreateReservationRequest } from '../../shared/contracts';
export const reservationInput: CreateReservationRequest = {
  resourceId: 'res-101',
  userId: 'test-student',
  startTime: '2027-01-01T10:00:00Z',
  endTime: '2027-01-01T11:00:00Z',
};
