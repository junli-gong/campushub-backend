import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose, { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { readTestDatabaseUri } from '../config/environment';
import { seedResourcesIfMissing } from '../services/seed.service';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import express, { type Request, type Response } from 'express';
import { handleError } from '../middleware/error.middleware';
import { app } from '../app';
import { ResourceModel } from '../models/Resource.model';
import { ReservationModel } from '../models/Reservation.model';
import { UserModel } from '../models/user.model';
import { isTimestamp } from '../services/validation.service';

interface HttpResult {
  status: number;
  body: unknown;
}

function object(value: unknown): Record<string, unknown> {
  assert.ok(
    typeof value === 'object' && value !== null && !Array.isArray(value),
  );
  return Object.fromEntries(Object.entries(value));
}

function error(result: HttpResult, status: number, code: string): void {
  assert.equal(result.status, status);
  const body = object(result.body);
  assert.deepEqual(Object.keys(body).sort(), ['code', 'message']);
  assert.equal(body['code'], code);
  assert.equal(typeof body['message'], 'string');
}

void test('reservation API follows the contract over real HTTP and MongoDB', async (context: TestContext): Promise<void> => {
  const databaseName = `campushub_test_${randomUUID().replaceAll('-', '')}`;
  const uri = readTestDatabaseUri();
  context.after(async (): Promise<void> => {
    try {
      if (
        mongoose.connection.readyState === mongoose.ConnectionStates.connected
      ) {
        assert.equal(mongoose.connection.name, databaseName);
        await mongoose.connection.dropDatabase();
      }
    } finally {
      await disconnectDatabase();
    }
  });
  await connectDatabase(uri, 5000, databaseName);
  await seedResourcesIfMissing();

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1`;

  async function request(
    path: string,
    body?: unknown,
    raw?: string,
  ): Promise<HttpResult> {
    const response = await fetch(
      base + path,
      body === undefined && raw === undefined
        ? {}
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: raw ?? JSON.stringify(body),
          },
    );
    assert.match(
      response.headers.get('content-type') ?? '',
      /application\/json/,
    );
    const parsed: unknown = await response.json();
    return { status: response.status, body: parsed };
  }

  const payload = {
    resourceId: 'res-101',
    userId: 'user-456',
    startTime: '2026-10-01T10:00:00Z',
    endTime: '2026-10-01T11:00:00Z',
  };
  try {
    await context.test(
      'health and JSON 404 remain available',
      async (): Promise<void> => {
        assert.deepEqual(await request('/health'), {
          status: 200,
          body: { status: 'ok', service: 'campushub-backend' },
        });
        error(await request('/missing'), 404, 'NOT_FOUND');
      },
    );
    await context.test(
      'list and filter all three resource types',
      async (): Promise<void> => {
        const all = await request('/resources');
        assert.equal(all.status, 200);
        assert.ok(Array.isArray(all.body));
        assert.equal(all.body.length, 4);
        for (const type of ['ROOM', 'EQUIPMENT', 'LAB']) {
          const filtered = await request(`/resources?type=${type}`);
          assert.equal(filtered.status, 200);
          assert.ok(Array.isArray(filtered.body) && filtered.body.length > 0);
          for (const item of filtered.body) {
            const resource = object(item);
            assert.deepEqual(Object.keys(resource).sort(), [
              'id',
              'isAvailable',
              'location',
              'name',
              'type',
            ]);
            assert.equal(resource['type'], type);
            assert.equal(typeof resource['isAvailable'], 'boolean');
          }
        }
      },
    );
    await context.test(
      'unmatched type values return an empty array',
      async (): Promise<void> => {
        for (const query of ['type=STUDY_ROOM', 'type=room']) {
          assert.deepEqual(await request(`/resources?${query}`), {
            status: 200,
            body: [],
          });
        }
      },
    );
    await context.test(
      'reject empty and repeated type values',
      async (): Promise<void> => {
        for (const query of ['type=', 'type=ROOM&type=LAB']) {
          error(await request(`/resources?${query}`), 400, 'VALIDATION_ERROR');
        }
      },
    );
    await context.test(
      'create returns precisely the Reservation fields',
      async (): Promise<void> => {
        const result = await request('/reservations', payload);
        assert.equal(result.status, 201);
        const reservation = object(result.body);
        assert.deepEqual(Object.keys(reservation).sort(), [
          'endTime',
          'id',
          'resourceId',
          'startTime',
          'status',
          'userId',
        ]);
        assert.equal(reservation['status'], 'PENDING');
        assert.equal(typeof reservation['id'], 'string');
        assert.deepEqual(
          { ...reservation, id: undefined, status: undefined },
          { ...payload, id: undefined, status: undefined },
        );
      },
    );
    await context.test(
      'duplicate, partial, contained, containing, and timezone-equivalent overlaps return 409',
      async (): Promise<void> => {
        for (const [startTime, endTime] of [
          [payload.startTime, payload.endTime],
          ['2026-10-01T09:30:00Z', '2026-10-01T10:30:00Z'],
          ['2026-10-01T10:30:00Z', '2026-10-01T11:30:00Z'],
          ['2026-10-01T10:15:00Z', '2026-10-01T10:45:00Z'],
          ['2026-10-01T09:00:00Z', '2026-10-01T12:00:00Z'],
          ['2026-10-01T12:00:00+02:00', '2026-10-01T13:00:00+02:00'],
        ]) {
          error(
            await request('/reservations', {
              ...payload,
              userId: 'another-user',
              startTime,
              endTime,
            }),
            409,
            'DOUBLE_BOOKING',
          );
        }
      },
    );
    await context.test(
      'adjacent times and a different resource are allowed',
      async (): Promise<void> => {
        for (const data of [
          {
            ...payload,
            startTime: '2026-10-01T09:00:00Z',
            endTime: payload.startTime,
          },
          {
            ...payload,
            startTime: payload.endTime,
            endTime: '2026-10-01T12:00:00Z',
          },
          { ...payload, resourceId: 'res-102' },
        ])
          assert.equal((await request('/reservations', data)).status, 201);
      },
    );
    await context.test(
      'list active reservations only for the requested user',
      async (): Promise<void> => {
        const result = await request('/reservations/user/user-456');
        assert.equal(result.status, 200);
        assert.ok(Array.isArray(result.body));
        assert.equal(result.body.length, 4);
        for (const item of result.body) {
          const reservation = object(item);
          assert.equal(reservation['userId'], 'user-456');
          assert.equal(reservation['status'], 'PENDING');
        }
        assert.deepEqual(await request('/reservations/user/unknown-user'), {
          status: 200,
          body: [],
        });
        error(
          await request('/reservations/user/bad%20id'),
          400,
          'VALIDATION_ERROR',
        );
      },
    );
    await context.test(
      'reject missing, extra, or wrong-type fields and non-object bodies',
      async (): Promise<void> => {
        for (const body of [
          {},
          [],
          null,
          { ...payload, id: 'client-id' },
          { ...payload, status: 'CONFIRMED' },
          { ...payload, userId: 42 },
          { ...payload, userId: '' },
          { ...payload, resourceId: 'missing' },
          { ...payload, resourceId: 'res-104' },
        ]) {
          error(await request('/reservations', body), 400, 'VALIDATION_ERROR');
        }
        for (const key of Object.keys(payload)) {
          const incomplete = Object.fromEntries(
            Object.entries(payload).filter(
              ([name]: [string, string]): boolean => name !== key,
            ),
          );
          error(
            await request('/reservations', incomplete),
            400,
            'VALIDATION_ERROR',
          );
        }
      },
    );
    await context.test(
      'reject invalid calendar dates, timezones, and ranges',
      async (): Promise<void> => {
        for (const startTime of [
          '2026-02-29T10:00:00Z',
          '2026-04-31T10:00:00Z',
          '2026-10-01',
          '2026-10-01T10:00:00',
          '2026-10-01T24:00:00Z',
          '2026-10-01T10:00:60Z',
          '2026-10-01T10:00:00+24:00',
          '2026-10-01T10:00:00.1234Z',
          'not-a-date',
        ]) {
          error(
            await request('/reservations', { ...payload, startTime }),
            400,
            'VALIDATION_ERROR',
          );
        }
        error(
          await request('/reservations', {
            ...payload,
            endTime: payload.startTime,
          }),
          400,
          'VALIDATION_ERROR',
        );
        error(
          await request('/reservations', {
            ...payload,
            endTime: '2026-10-01T09:00:00Z',
          }),
          400,
          'VALIDATION_ERROR',
        );
        assert.equal(isTimestamp('2028-02-29T10:00:00.123-07:00'), true);
      },
    );
    await context.test(
      'malformed URLs and JSON, and oversized JSON, return standardized 400',
      async (): Promise<void> => {
        error(await request('/reservations/user/%ZZ'), 400, 'VALIDATION_ERROR');
        error(
          await request('/reservations', undefined, '{'),
          400,
          'VALIDATION_ERROR',
        );
        error(
          await request('/reservations', { padding: 'x'.repeat(110000) }),
          400,
          'VALIDATION_ERROR',
        );
      },
    );
    await context.test(
      'simultaneous duplicate attempts have one winner',
      async (): Promise<void> => {
        const data = { ...payload, resourceId: 'res-103' };
        const results = await Promise.all([
          request('/reservations', data),
          request('/reservations', data),
        ]);
        assert.deepEqual(
          results.map((result: HttpResult): number => result.status).sort(),
          [201, 409],
        );
      },
    );
    await context.test(
      'MongoDB stores ObjectId references and services hide internal fields',
      async (): Promise<void> => {
        const resource = await ResourceModel.findOne({ id: payload.resourceId })
          .orFail()
          .exec();
        const stored = await ReservationModel.findOne({
          userId: payload.userId,
          startTime: new Date(payload.startTime),
          resourceId: resource._id,
        })
          .orFail()
          .exec();
        assert.ok(stored.resourceId instanceof Types.ObjectId);
        assert.ok(stored.resourceId.equals(resource._id));
        assert.ok(stored.startTime instanceof Date);
        const result = await request('/reservations/user/user-456');
        assert.ok(Array.isArray(result.body));
        for (const item of result.body) {
          const reservation = object(item);
          assert.equal('_id' in reservation, false);
          assert.equal('__v' in reservation, false);
          assert.ok(
            typeof reservation['resourceId'] === 'string' &&
              reservation['resourceId'].startsWith('res-'),
          );
        }
      },
    );
    await context.test(
      'seeding is idempotent and does not overwrite existing resources',
      async (): Promise<void> => {
        await ResourceModel.updateOne(
          { id: 'res-104' },
          { $set: { name: 'Preserved custom name' } },
        );
        await seedResourcesIfMissing();
        assert.equal(await ResourceModel.countDocuments(), 4);
        assert.equal(
          (await ResourceModel.findOne({ id: 'res-104' }).orFail()).name,
          'Preserved custom name',
        );
      },
    );
    await context.test(
      'CONFIRMED blocks conflicts; CANCELLED permits rebooking and is not active',
      async (): Promise<void> => {
        const data = {
          ...payload,
          userId: 'status-user',
          resourceId: 'res-103',
          startTime: '2026-10-02T10:00:00Z',
          endTime: '2026-10-02T11:00:00Z',
        };
        const created = await request('/reservations', data);
        assert.equal(created.status, 201);
        const id = object(created.body)['id'];
        assert.equal(typeof id, 'string');
        assert.ok(typeof id === 'string');
        await ReservationModel.updateOne(
          { id },
          { $set: { status: 'CONFIRMED' } },
        );
        error(await request('/reservations', data), 409, 'DOUBLE_BOOKING');
        const active = await request('/reservations/user/status-user');
        assert.ok(Array.isArray(active.body));
        assert.equal(object(active.body[0])['status'], 'CONFIRMED');
        await ReservationModel.updateOne(
          { id },
          { $set: { status: 'CANCELLED' } },
        );
        assert.deepEqual(await request('/reservations/user/status-user'), {
          status: 200,
          body: [],
        });
        assert.equal((await request('/reservations', data)).status, 201);
      },
    );
    await context.test(
      'data and conflict protection survive disconnect/reconnect; database failures return 500',
      async (subcontext: TestContext): Promise<void> => {
        const before = await request('/reservations/user/user-456');
        subcontext.mock.method(console, 'error', (): void => {});
        await disconnectDatabase();
        error(await request('/resources'), 500, 'INTERNAL_ERROR');
        await connectDatabase(uri, 5000, databaseName);
        assert.deepEqual(await request('/reservations/user/user-456'), before);
        error(await request('/reservations', payload), 409, 'DOUBLE_BOOKING');
      },
    );
  } finally {
    await new Promise<void>(
      (resolve: () => void, reject: (reason?: unknown) => void): void => {
        server.close((failure?: Error): void =>
          failure ? reject(failure) : resolve(),
        );
        server.closeAllConnections();
      },
    );
  }
});

void test('Mongoose schemas validate without a database', async (): Promise<void> => {
  await new UserModel({
    id: 'user-456',
    name: 'Demo Student',
    email: 'student@example.edu',
  }).validate();
  await assert.rejects(new UserModel({ id: 'bad id' }).validate());
  await assert.rejects(
    new UserModel({
      id: 'user-456',
      name: 'Demo',
      email: 'invalid',
    }).validate(),
  );
  const resource = {
    id: 'res-101',
    name: 'Study Room',
    type: 'ROOM',
    location: 'Library',
    isAvailable: true,
  };
  await new ResourceModel(resource).validate();
  await assert.rejects(
    new ResourceModel({ ...resource, type: 'STUDY_ROOM' }).validate(),
  );
  const reservation = {
    id: 'booking-1',
    resourceId: new Types.ObjectId(),
    userId: 'user-456',
    startTime: new Date('2026-10-01T10:00:00Z'),
    endTime: new Date('2026-10-01T11:00:00Z'),
  };
  await new ReservationModel(reservation).validate();
  await assert.rejects(
    new ReservationModel({ ...reservation, status: 'UNKNOWN' }).validate(),
  );
  await assert.rejects(
    new ReservationModel({
      ...reservation,
      endTime: reservation.startTime,
    }).validate(),
  );
});

async function failingHandler(
  _request: Request,
  _response: Response,
): Promise<void> {
  await Promise.reject(new Error('private failure detail'));
}

void test('async failures return the contract 500 without leaking details', async (context: TestContext): Promise<void> => {
  context.mock.method(console, 'error', (): void => {});
  const fixture = express();
  fixture.get('/failure', failingHandler);
  fixture.use(handleError);
  const server = fixture.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/failure`);
    const body: unknown = await response.json();
    assert.equal(response.status, 500);
    assert.deepEqual(body, {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  } finally {
    await new Promise<void>(
      (resolve: () => void, reject: (reason?: unknown) => void): void => {
        server.close((failure?: Error): void =>
          failure ? reject(failure) : resolve(),
        );
        server.closeAllConnections();
      },
    );
  }
});
