import { DomainError } from '../types/error';
import type {
  CreateReservationRequest,
  ResourceType,
} from '../types/reservation';

export function validateIdentifier(value: unknown, name: string): string {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value)
  ) {
    throw new DomainError(
      'VALIDATION_ERROR',
      `${name} must be a 1–64 character identifier using letters, digits, underscores, or hyphens.`,
    );
  }
  return value;
}

export function validateResourceType(value: unknown): ResourceType | undefined {
  if (value === undefined) return undefined;
  if (value !== 'ROOM' && value !== 'EQUIPMENT' && value !== 'LAB') {
    throw new DomainError(
      'VALIDATION_ERROR',
      'type must be a non-empty string: ROOM, EQUIPMENT, or LAB.',
    );
  }
  return value;
}

export function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/.exec(
      value,
    );
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDay = days[month - 1];
  return (
    maxDay !== undefined &&
    day >= 1 &&
    day <= maxDay &&
    Number(match[4]) <= 23 &&
    Number(match[5]) <= 59 &&
    Number(match[6]) <= 59 &&
    (match[7] === 'Z' || (Number(match[8]) <= 23 && Number(match[9]) <= 59)) &&
    Number.isFinite(Date.parse(value))
  );
}

export function validateReservation(value: unknown): CreateReservationRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DomainError('VALIDATION_ERROR', 'Body must be a JSON object.');
  }
  const keys = ['resourceId', 'userId', 'startTime', 'endTime'];
  if (
    Object.keys(value).some((key: string): boolean => !keys.includes(key)) ||
    !('resourceId' in value) ||
    !('userId' in value) ||
    !('startTime' in value) ||
    !('endTime' in value)
  ) {
    throw new DomainError(
      'VALIDATION_ERROR',
      'Body must contain exactly resourceId, userId, startTime, and endTime.',
    );
  }
  const resourceId = validateIdentifier(value.resourceId, 'resourceId');
  const userId = validateIdentifier(value.userId, 'userId');
  if (!isTimestamp(value.startTime) || !isTimestamp(value.endTime)) {
    throw new DomainError(
      'VALIDATION_ERROR',
      'Times must be valid ISO 8601 calendar timestamps with a timezone and at most 3 fractional digits.',
    );
  }
  if (Date.parse(value.endTime) <= Date.parse(value.startTime)) {
    throw new DomainError(
      'VALIDATION_ERROR',
      'endTime must be later than startTime.',
    );
  }
  return {
    resourceId,
    userId,
    startTime: value.startTime,
    endTime: value.endTime,
  };
}
