import { Router } from 'express';
import {
  confirmReservationHandler,
  cancelReservationHandler,
  createReservationHandler,
  listUserReservationsHandler,
} from '../controllers/reservation.controller';

export const reservationRouter: Router = Router();
reservationRouter.post('/reservations', createReservationHandler);
reservationRouter.get(
  '/reservations/user/:userId',
  listUserReservationsHandler,
);

reservationRouter.patch('/reservations/:id/confirm', confirmReservationHandler);

reservationRouter.patch('/reservations/:id/cancel', cancelReservationHandler);
