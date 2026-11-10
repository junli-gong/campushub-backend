import {
  afterAll,
  beforeAll,
  beforeEach,
  expect,
  jest,
  test,
} from '@jest/globals';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../../app';
import { startTestDatabase, type TestDatabase } from '../../test/setup';
import { reservationInput as input } from '../../test/fixtures';
import * as resourceService from '../../services/resource.service';

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
function object(value: unknown): Record<string, unknown> {
  assert.ok(
    typeof value === 'object' && value !== null && !Array.isArray(value),
  );
  return Object.fromEntries(Object.entries(value));
}
test('health 200 and JSON unknown-route 404', async (): Promise<void> => {
  await request(app)
    .get('/api/v1/health')
    .expect(200, { status: 'ok', service: 'campushub-backend' });
  const missing = await request(app).get('/api/v1/missing').expect(404);
  expect(object(missing.body)['code']).toBe('NOT_FOUND');
});
test('POST 201, conflict 409, user history, confirm and cancellation through routes', async (): Promise<void> => {
  const created = await request(app)
    .post('/api/v1/reservations')
    .send(input)
    .expect(201);
  const body = object(created.body);
  const id = body['id'];
  assert.equal(typeof id, 'string');
  expect(body).toEqual({ ...input, id, status: 'PENDING' });
  const duplicate = await request(app)
    .post('/api/v1/reservations')
    .send(input)
    .expect(409);
  expect(object(duplicate.body)['code']).toBe('DOUBLE_BOOKING');
  await request(app)
    .patch(`/api/v1/reservations/${String(id)}/confirm`)
    .expect(200);
  await request(app)
    .patch(`/api/v1/reservations/${String(id)}/cancel`)
    .expect(200);
  await request(app)
    .patch(`/api/v1/reservations/${String(id)}/confirm`)
    .expect(409);
  const history = await request(app)
    .get(`/api/v1/reservations/user/${input.userId}`)
    .expect(200);
  expect(history.body).toEqual([{ ...body, status: 'CANCELLED' }]);
  await request(app).post('/api/v1/reservations').send(input).expect(201);
});
test.each([
  ['', 4],
  ['?type=ROOM', 2],
  ['?type=EQUIPMENT', 1],
  ['?type=LAB', 1],
  ['?type=unknown', 0],
  ['?isAvailable=true', 3],
  ['?isAvailable=false', 1],
  ['?type=LAB&isAvailable=false', 0],
])(
  'resource filtering %s returns %i matches',
  async (query: string | number, count: string | number): Promise<void> => {
    const response = await request(app)
      .get(`/api/v1/resources${String(query)}`)
      .expect(200);
    const body: unknown = response.body;
    assert.ok(Array.isArray(body));
    expect(body).toHaveLength(Number(count));
    const filters = new URLSearchParams(String(query));
    for (const resource of body) {
      const item = object(resource);
      expect(Object.keys(item).sort()).toEqual([
        'id',
        'isAvailable',
        'location',
        'name',
        'type',
      ]);
      if (filters.has('type')) expect(item['type']).toBe(filters.get('type'));
      if (filters.has('isAvailable'))
        expect(item['isAvailable']).toBe(filters.get('isAvailable') === 'true');
    }
  },
);
test.each([
  '?type=',
  '?type=ROOM&type=LAB',
  '?isAvailable=',
  '?isAvailable=FALSE',
  '?isAvailable=true&isAvailable=false',
])('invalid query %s returns 400', async (query: string): Promise<void> => {
  const response = await request(app)
    .get(`/api/v1/resources${query}`)
    .expect(400);
  expect(object(response.body)['code']).toBe('VALIDATION_ERROR');
});
test('missing keys, negative times and one-millisecond overlap are enforced at HTTP boundary', async (): Promise<void> => {
  for (const payload of [
    {},
    { ...input, endTime: input.startTime },
    { ...input, endTime: '2027-01-01T09:00:00Z' },
    { ...input, resourceId: 'missing' },
    { ...input, userId: { $ne: null } },
  ]) {
    const response = await request(app)
      .post('/api/v1/reservations')
      .send(payload)
      .expect(400);
    expect(object(response.body)['code']).toBe('VALIDATION_ERROR');
  }
  await request(app).post('/api/v1/reservations').send(input).expect(201);
  await request(app)
    .post('/api/v1/reservations')
    .send({
      ...input,
      startTime: '2027-01-01T10:59:59.999Z',
      endTime: '2027-01-01T12:00:00Z',
    })
    .expect(409);
  await request(app)
    .post('/api/v1/reservations')
    .send({
      ...input,
      startTime: input.endTime,
      endTime: '2027-01-01T12:00:00Z',
    })
    .expect(201);
});
test('malformed JSON, bad URL ID, absent reservation and internal failure are JSON errors', async (): Promise<void> => {
  await request(app)
    .post('/api/v1/reservations')
    .set('Content-Type', 'application/json')
    .send('{')
    .expect(400);
  await request(app).get('/api/v1/reservations/user/bad%20id').expect(400);
  await request(app).patch('/api/v1/reservations/missing/cancel').expect(404);
  jest
    .spyOn(resourceService, 'listResources')
    .mockRejectedValueOnce(new Error('private database detail'));
  jest.spyOn(console, 'error').mockImplementation((): void => {});
  await request(app)
    .get('/api/v1/resources')
    .expect(500, { code: 'INTERNAL_ERROR', message: 'Internal server error' });
});
