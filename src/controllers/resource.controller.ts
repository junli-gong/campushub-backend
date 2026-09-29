import type { Request } from 'express';
import type { Response } from 'express-serve-static-core';
import { listResources } from '../services/resource.service';
import { validateResourceType } from '../services/validation.service';
import type { Resource } from '../types/reservation';

export function listResourcesHandler(
  request: Request,
  response: Response<Resource[], Record<string, never>, 200>,
): void {
  response
    .status(200)
    .json(listResources(validateResourceType(request.query['type'])));
}
