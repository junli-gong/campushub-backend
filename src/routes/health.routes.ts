import { Router } from 'express';
import { getHealthHandler } from '../controllers/health.controller';

export const healthRouter: Router = Router();
healthRouter.get('/health', getHealthHandler);
