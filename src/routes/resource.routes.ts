import { Router } from 'express';
import { listResourcesHandler } from '../controllers/resource.controller';

export const resourceRouter: Router = Router();
resourceRouter.get('/resources', listResourcesHandler);
