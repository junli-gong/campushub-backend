import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import {
  ApiError,
  cancelReservation,
  createReservation,
  errorMessage,
  fetchResources,
  fetchUserReservations,
} from '../src/api/campushubApi.ts';
const payload = {
  resourceId: 'res-101',
  userId: 'user-456',
  startTime: '2027-01-04T18:00:00Z',
  endTime: '2027-01-04T19:00:00Z',
};
const booking = { ...payload, id: 'booking-1', status: 'PENDING' };
void test('resource query uses contract type and availability parameters', async (context: TestContext): Promise<void> => {
  context.mock.method(
    globalThis,
    'fetch',
    (input: string | URL | Request): Promise<Response> => {
      assert.equal(input, '/api/v1/resources?isAvailable=true&type=ROOM');
      return json([
        {
          id: 'res-101',
          name: 'Room',
          type: 'ROOM',
          location: 'Library',
          isAvailable: true,
        },
      ]);
    },
  );
  assert.equal((await fetchResources('ROOM')).length, 1);
});
void test('creation sends only the four writable contract fields', async (context: TestContext): Promise<void> => {
  context.mock.method(
    globalThis,
    'fetch',
    (
      input: string | URL | Request,
      options?: RequestInit,
    ): Promise<Response> => {
      assert.equal(input, '/api/v1/reservations');
      assert.equal(options?.method, 'POST');
      assert.equal(options.body, JSON.stringify(payload));
      return json(booking, { status: 201 });
    },
  );
  assert.deepEqual(await createReservation(payload), booking);
});
void test('user list preserves history for the UI to filter', async (context: TestContext): Promise<void> => {
  const history = [{ ...booking, status: 'CANCELLED' }];
  context.mock.method(
    globalThis,
    'fetch',
    (input: string | URL | Request): Promise<Response> => {
      assert.equal(input, '/api/v1/reservations/user/student%2Fone');
      return json(history);
    },
  );
  assert.deepEqual(await fetchUserReservations('student/one'), history);
});
void test('cancellation sends PATCH without a fabricated request body', async (context: TestContext): Promise<void> => {
  context.mock.method(
    globalThis,
    'fetch',
    (
      input: string | URL | Request,
      options?: RequestInit,
    ): Promise<Response> => {
      assert.equal(input, '/api/v1/reservations/booking-1/cancel');
      assert.equal(options?.method, 'PATCH');
      assert.equal(options.body, undefined);
      assert.ok(options.signal instanceof AbortSignal);
      return json({ ...booking, status: 'CANCELLED' });
    },
  );
  assert.equal((await cancelReservation('booking-1')).status, 'CANCELLED');
});
void test('409 gets actionable feedback and preserves the typed API error', async (context: TestContext): Promise<void> => {
  context.mock.method(globalThis, 'fetch', (): Promise<Response> =>
    json({ code: 'DOUBLE_BOOKING', message: 'Conflict' }, { status: 409 }),
  );
  await assert.rejects(
    createReservation(payload),
    (error: unknown): boolean => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 409);
      assert.match(
        errorMessage(error),
        /already reserved for the selected time window/,
      );
      return true;
    },
  );
});
void test('network, malformed payload and server failures produce recoverable messages', async (context: TestContext): Promise<void> => {
  const mock = context.mock.method(
    globalThis,
    'fetch',
    (): Promise<Response> => {
      throw new TypeError('network');
    },
  );
  await assert.rejects(fetchResources(), /Unable to connect/);
  mock.mock.mockImplementation((): Promise<Response> =>
    json({ unexpected: true }),
  );
  await assert.rejects(fetchResources(), /invalid resource list/);
  mock.mock.mockImplementation((): Promise<Response> =>
    json({ ...booking, status: 'UNKNOWN' }),
  );
  await assert.rejects(createReservation(payload), /invalid reservation/);
  mock.mock.mockImplementation((): Promise<Response> =>
    Promise.resolve(new Response('<html>proxy error</html>', { status: 502 })),
  );
  await assert.rejects(fetchResources(), /service is unavailable/);
  mock.mock.mockImplementation((): Promise<Response> =>
    json(
      { code: 'INTERNAL_ERROR', message: 'private database details' },
      { status: 500 },
    ),
  );
  await assert.rejects(fetchResources(), /service is unavailable/);
});

function json(value: unknown, init?: ResponseInit): Promise<Response> {
  return Promise.resolve(Response.json(value, init));
}
