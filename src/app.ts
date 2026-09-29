import express, { type Express } from 'express';
import { handleError } from './middleware/error.middleware';
import { handleNotFound } from './middleware/not-found.middleware';
import { healthRouter } from './routes/health.routes';
import { reservationRouter } from './routes/reservation.routes';
import { resourceRouter } from './routes/resource.routes';

export const app: Express = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use('/api/v1', healthRouter);
app.use('/api/v1', resourceRouter);
app.use('/api/v1', reservationRouter);
app.use(handleNotFound);
app.use(handleError);
