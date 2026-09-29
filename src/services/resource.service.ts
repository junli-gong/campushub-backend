import type { Resource } from '../types/reservation';

const resources: readonly Resource[] = [
  {
    id: 'res-101',
    name: 'Study Room 302',
    type: 'ROOM',
    location: 'Library, Floor 3',
    isAvailable: true,
  },
  {
    id: 'res-102',
    name: '3D Printer A',
    type: 'EQUIPMENT',
    location: 'Maker Space',
    isAvailable: true,
  },
  {
    id: 'res-103',
    name: 'Computer Lab',
    type: 'LAB',
    location: 'Engineering Building',
    isAvailable: true,
  },
  {
    id: 'res-104',
    name: 'Study Room 303',
    type: 'ROOM',
    location: 'Library, Floor 3',
    isAvailable: false,
  },
];

// A type that matches no resource yields an empty list rather than an error.
export function listResources(type?: string): Resource[] {
  return resources
    .filter(
      (resource: Resource): boolean =>
        type === undefined || resource.type === type,
    )
    .map((resource: Resource): Resource => ({ ...resource }));
}

export function findResource(id: string): Resource | undefined {
  const resource = resources.find((item: Resource): boolean => item.id === id);
  return resource === undefined ? undefined : { ...resource };
}
