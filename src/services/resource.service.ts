import { ResourceModel, type ResourceDocument } from '../models/Resource.model';
import type { Resource } from '../types/reservation';

export function serializeResource(resource: ResourceDocument): Resource {
  return {
    id: resource.id,
    name: resource.name,
    type: resource.type,
    location: resource.location,
    isAvailable: resource.isAvailable,
  };
}

export async function listResources(type?: string): Promise<Resource[]> {
  if (
    type !== undefined &&
    type !== 'ROOM' &&
    type !== 'EQUIPMENT' &&
    type !== 'LAB'
  )
    return [];
  const resources = await ResourceModel.find(type === undefined ? {} : { type })
    .sort({ id: 1 })
    .lean()
    .exec();
  return resources.map(serializeResource);
}
