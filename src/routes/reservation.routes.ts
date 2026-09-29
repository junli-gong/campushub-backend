import { Router } from 'express';
import {
  createReservationHandler,
  listUserReservationsHandler,
} from '../controllers/reservation.controller';

export const reservationRouter: Router = Router();
reservationRouter.post('/reservations', createReservationHandler);
reservationRouter.get(
  '/reservations/user/:userId',
  listUserReservationsHandler,
);
