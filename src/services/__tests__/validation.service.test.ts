import { expect, test } from '@jest/globals';
import {
  isTimestamp,
  validateIdentifier,
  validateReservation,
  validateTypeFilter,
  validateAvailabilityFilter,
} from '../validation.service';
import { reservationInput as input } from '../../test/fixtures';

test.each([
  undefined,
  null,
  {},
  [],
  42,
  '',
  '-first',
  'a'.repeat(65),
  'bad id',
])('rejects invalid identifier %p', (value: unknown): void => {
  expect((): string => validateIdentifier(value, 'id')).toThrow();
});
test('identifier lengths 1 and 64 and allowed punctuation', (): void => {
  for (const value of ['a', 'A'.repeat(64), 'a-1_2'])
    expect(validateIdentifier(value, 'id')).toBe(value);
});
test.each([
  null,
  3,
  '',
  'bad',
  '2027-01-01',
  '2027-01-01T10:00:00',
  '2027-02-29T10:00:00Z',
  '2100-02-29T10:00:00Z',
  '2027-13-01T10:00:00Z',
  '2027-01-00T10:00:00Z',
  '2027-04-31T10:00:00Z',
  '2027-01-01T24:00:00Z',
  '2027-01-01T10:60:00Z',
  '2027-01-01T10:00:60Z',
  '2027-01-01T10:00:00+24:00',
  '2027-01-01T10:00:00+01:60',
  '2027-01-01T10:00:00.1234Z',
])('rejects invalid timestamp %p', (value: unknown): void => {
  expect(isTimestamp(value)).toBe(false);
});
test.each([
  '2000-02-29T00:00:00Z',
  '2028-02-29T00:00:00.001-07:00',
  '2027-01-01T00:00:00.12+02:00',
])('accepts valid timestamp %s', (value: string): void => {
  expect(isTimestamp(value)).toBe(true);
});
test('validation rejects all missing keys, extra fields and invalid ranges', (): void => {
  for (const key of Object.keys(input)) {
    const incomplete = Object.fromEntries(
      Object.entries(input).filter(
        ([name]: [string, string]): boolean => name !== key,
      ),
    );
    expect((): unknown => validateReservation(incomplete)).toThrow();
  }
  for (const value of [
    undefined,
    null,
    [],
    5,
    {},
    { ...input, id: 'injected' },
    { ...input, status: 'CONFIRMED' },
    { ...input, startTime: 'bad' },
    { ...input, endTime: 'bad' },
    { ...input, endTime: input.startTime },
    { ...input, endTime: '2027-01-01T09:00:00Z' },
  ])
    expect((): unknown => validateReservation(value)).toThrow();
  expect(validateReservation(input)).toEqual(input);
});
test('filters distinguish absent, unmatched, false and malformed inputs', (): void => {
  expect(validateTypeFilter(undefined)).toBeUndefined();
  expect(validateTypeFilter('UNMATCHED')).toBe('UNMATCHED');
  expect(validateAvailabilityFilter(undefined)).toBeUndefined();
  expect(validateAvailabilityFilter('true')).toBe(true);
  expect(validateAvailabilityFilter('false')).toBe(false);
  for (const value of ['', [], true, {}, null])
    expect((): unknown => validateTypeFilter(value)).toThrow();
  for (const value of ['', '1', 'TRUE', ['false', 'true'], false])
    expect((): unknown => validateAvailabilityFilter(value)).toThrow();
});
