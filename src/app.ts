import express, { type Express } from 'express';
import { handleError } from './middleware/error.middleware';
import { healthRouter } from './routes/health.routes';

export const app: Express = express();
app.disable('x-powered-by');
app.use('/api/v1', healthRouter);
app.use(handleError);
