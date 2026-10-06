import type { Request } from 'express';
import type { Response } from 'express-serve-static-core';
import { listResources } from '../services/resource.service';
import { validateTypeFilter } from '../services/validation.service';
import type { Resource } from '../types/reservation';

export async function listResourcesHandler(
  request: Request,
  response: Response<Resource[], Record<string, never>, 200>,
): Promise<void> {
  response
    .status(200)
    .json(await listResources(validateTypeFilter(request.query['type'])));
}
