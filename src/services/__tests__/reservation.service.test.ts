import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from '@jest/globals';
import { startTestDatabase, type TestDatabase } from '../../test/setup';
import { reservationInput as input } from '../../test/fixtures';
import { ResourceModel } from '../../models/Resource.model';
import { ReservationModel } from '../../models/Reservation.model';
import {
  createReservation,
  listUserReservations,
  updateReservationStatus,
} from '../reservation.service';
import { listResources } from '../resource.service';
import { seedResourcesIfMissing } from '../seed.service';

let database: TestDatabase;
beforeAll(async (): Promise<void> => {
  database = await startTestDatabase();
});
beforeEach(async (): Promise<void> => {
  await database.reset();
});
afterAll(async (): Promise<void> => {
  if (database) await database.stop();
});

describe('reservation services with actual isolated MongoDB transactions', (): void => {
  test('resource creation and idempotent seeding preserve user edits', async (): Promise<void> => {
    await ResourceModel.create({
      id: 'custom-room',
      name: 'Custom room',
      type: 'ROOM',
      location: 'Campus',
      isAvailable: true,
    });
    await ResourceModel.updateOne(
      { id: 'res-101' },
      { $set: { name: 'Edited room' } },
    );
    await seedResourcesIfMissing();
    expect(await ResourceModel.countDocuments()).toBe(5);
    expect(
      (await listResources('ROOM', true)).map(
        (resource): string => resource.name,
      ),
    ).toEqual(['Custom room', 'Edited room']);
  });
  test('creates public payload and persists ObjectId/date fields', async (): Promise<void> => {
    const result = await createReservation(input);
    expect(result).toEqual({
      ...input,
      id: expect.any(String),
      status: 'PENDING',
    });
    const stored = await ReservationModel.findOne({ id: result.id }).orFail();
    const resource = await ResourceModel.findOne({
      id: input.resourceId,
    }).orFail();
    expect(stored.resourceId.equals(resource._id)).toBe(true);
    expect(stored.startTime).toEqual(new Date(input.startTime));
    expect(await listUserReservations(input.userId)).toEqual([result]);
    expect(await listUserReservations('someone-else')).toEqual([]);
  });
  test.each(['missing-resource', 'res-104'])(
    'rejects unknown/unavailable resource %s',
    async (resourceId: string): Promise<void> => {
      await expect(
        createReservation({ ...input, resourceId }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(await ReservationModel.countDocuments()).toBe(0);
    },
  );
  test.each(['2027-01-01T09:00:00Z', input.startTime])(
    'rejects negative/zero duration %s and rolls back the resource write',
    async (endTime: string): Promise<void> => {
      await expect(createReservation({ ...input, endTime })).rejects.toThrow();
      expect(await ReservationModel.countDocuments()).toBe(0);
      expect(
        (await ResourceModel.findOne({ id: input.resourceId }).orFail())
          .bookingVersion,
      ).toBe(0);
    },
  );
  test('exact duplicate and timezone-equivalent requests conflict', async (): Promise<void> => {
    await createReservation(input);
    for (const data of [
      input,
      {
        ...input,
        startTime: '2027-01-01T12:00:00+02:00',
        endTime: '2027-01-01T13:00:00+02:00',
      },
    ]) {
      await expect(createReservation(data)).rejects.toMatchObject({
        code: 'DOUBLE_BOOKING',
      });
    }
    expect(await ReservationModel.countDocuments()).toBe(1);
  });
  test('confirm, repeated confirm, cancel, repeated cancel and rebooking', async (): Promise<void> => {
    const result = await createReservation(input);
    const confirmed = await updateReservationStatus(result.id, 'CONFIRMED');
    expect(confirmed.status).toBe('CONFIRMED');
    expect(await updateReservationStatus(result.id, 'CONFIRMED')).toEqual(
      confirmed,
    );
    await expect(createReservation(input)).rejects.toMatchObject({
      code: 'DOUBLE_BOOKING',
    });
    // Administrative unavailability must never prevent cancellation.
    await ResourceModel.updateOne(
      { id: input.resourceId },
      { $set: { isAvailable: false } },
    );
    const cancelled = await updateReservationStatus(result.id, 'CANCELLED');
    expect(cancelled.status).toBe('CANCELLED');
    expect(await updateReservationStatus(result.id, 'CANCELLED')).toEqual(
      cancelled,
    );
    await expect(
      updateReservationStatus(result.id, 'CONFIRMED'),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    expect(await listUserReservations(input.userId)).toEqual([cancelled]);
    await ResourceModel.updateOne(
      { id: input.resourceId },
      { $set: { isAvailable: true } },
    );
    expect((await createReservation(input)).id).not.toBe(result.id);
  });
  test('missing reservation and dangling references fail without partial writes', async (): Promise<void> => {
    await expect(
      updateReservationStatus('missing', 'CANCELLED'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const result = await createReservation(input);
    await ResourceModel.deleteOne({ id: input.resourceId });
    await expect(listUserReservations(input.userId)).rejects.toThrow(
      'missing resource',
    );
    await expect(
      updateReservationStatus(result.id, 'CANCELLED'),
    ).rejects.toThrow('missing resource');
    expect(
      (await ReservationModel.findOne({ id: result.id }).orFail()).status,
    ).toBe('PENDING');
  });
  test('eight concurrent booking attempts have exactly one winner', async (): Promise<void> => {
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (): ReturnType<typeof createReservation> =>
        createReservation(input),
      ),
    );
    expect(
      results.filter((result): boolean => result.status === 'fulfilled'),
    ).toHaveLength(1);
    for (const result of results)
      if (result.status === 'rejected')
        expect(result.reason).toMatchObject({ code: 'DOUBLE_BOOKING' });
    expect(await ReservationModel.countDocuments()).toBe(1);
  });
});

// Deterministic boundary fuzzing: a discrete millisecond occupancy oracle,
// independent of the implementation's MongoDB interval predicate.
const cases = [-1, 0, 9, 10, 11, 19, 20, 21].flatMap(
  (start: number): [number, number][] =>
    [1, 2, 10, 21].map((length: number): [number, number] => [
      start,
      start + length,
    ]),
);
test.each(cases)(
  'millisecond boundary [%i, %i) against [10, 20)',
  async (start: number, end: number): Promise<void> => {
    const base = Date.parse('2027-02-01T00:00:00Z');
    const timestamp = (offset: number): string =>
      new Date(base + offset).toISOString();
    await createReservation({
      ...input,
      startTime: timestamp(10),
      endTime: timestamp(20),
    });
    const occupied = new Set(
      Array.from({ length: 10 }, (_, index: number): number => index + 10),
    );
    const conflict = Array.from(
      { length: end - start },
      (_, index: number): number => start + index,
    ).some((ms: number): boolean => occupied.has(ms));
    const attempt = createReservation({
      ...input,
      startTime: timestamp(start),
      endTime: timestamp(end),
    });
    if (conflict)
      await expect(attempt).rejects.toMatchObject({ code: 'DOUBLE_BOOKING' });
    else expect((await attempt).status).toBe('PENDING');
    expect(await ReservationModel.countDocuments()).toBe(conflict ? 1 : 2);
  },
);
