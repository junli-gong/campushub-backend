# CampusHub Backend

CS 5500 Labs 1–3: context boundaries, an OpenAPI contract, and a MongoDB-backed reservation API.

## Setup

Requires Node.js >=24.21.0, npm >=11.19.1, and Docker Desktop running (or another MongoDB replica set).

```sh
npm ci
cp .env-example .env
npm run db:up
npm run seed
npm run dev
```

If you already have `.env`, merge the settings from `.env-example` instead of overwriting your configuration. The first `db:up` downloads the MongoDB image, starts a single-node `rs0` replica set, and waits for initialization. MongoDB is exposed only on `127.0.0.1:27017` and uses a persistent Docker volume. The local database has no authentication; it is a development environment.

Lab 3 requires a real database **and seeded resources before the API tests**. There is no in-memory fallback. The seed command inserts missing `res-101` through `res-104` without overwriting existing resources or deleting reservations. Restarting the API retains bookings. Startup connects and initializes model indexes before opening the HTTP port; a failed connection exits with an error.

`PORT` defaults to 3000. `MONGODB_URI` is required. `TEST_MONGODB_URI` identifies the replica set used for automated tests; each test run overrides the database name with a unique `campushub_test_*` name and deletes only that database. Environment reads are centralized in `src/config/environment.ts`.

## Contract and API

[docs/openapi.json](docs/openapi.json) remains the authoritative Lab 2 contract. No endpoints, request fields, response fields, or status codes were added for Lab 3.

| Method | Endpoint                             | Behavior                                                       |
| ------ | ------------------------------------ | -------------------------------------------------------------- |
| GET    | `/api/v1/health`                     | Process liveness, 200                                          |
| GET    | `/api/v1/resources`                  | Resource array; optional non-empty `type` filter               |
| POST   | `/api/v1/reservations`               | 201 created; 400 invalid input; 409 overlapping active booking |
| GET    | `/api/v1/reservations/user/{userId}` | User's PENDING and CONFIRMED reservations, 200                 |

Errors use `{ "code": "VALIDATION_ERROR", "message": "..." }`, with `DOUBLE_BOOKING`, `NOT_FOUND`, or `INTERNAL_ERROR` as appropriate. Unknown routes return JSON 404 and unexpected errors return a sanitized JSON 500.

### Run the Lab 2 regression examples

```sh
curl -i http://localhost:3000/api/v1/resources
curl -i 'http://localhost:3000/api/v1/resources?type=ROOM'
curl -i 'http://localhost:3000/api/v1/resources?type=STUDY_ROOM'
curl -i 'http://localhost:3000/api/v1/resources?type='

curl -i -X POST http://localhost:3000/api/v1/reservations \
  -H 'Content-Type: application/json' \
  -d '{"resourceId":"res-101","userId":"user-456","startTime":"2026-10-01T10:00:00Z","endTime":"2026-10-01T11:00:00Z"}'

curl -i http://localhost:3000/api/v1/reservations/user/user-456
```

With fresh data, the POST returns 201, a generated id, and PENDING status. Repeating it returns 409, including after restarting the API. If that example has already been booked, use an unused time interval to test another successful creation. The automated test suite uses its own isolated database and remains repeatable.

### Data and booking behavior

- Types are ROOM, EQUIPMENT, LAB. A non-empty unmatched type (including STUDY_ROOM) returns 200 with `[]`; empty or repeated values return 400, preserving the reviewed Lab 2 behavior.
- API resource IDs remain strings such as `res-101`. The service looks up Resource's MongoDB `_id` and stores an ObjectId reference in Reservation.resourceId. Responses translate that reference back to the public ID and never expose `_id`, `__v`, or internal bookingVersion.
- Dates are stored as MongoDB dates and serialized as UTC ISO 8601 strings. Timezone offsets may normalize to `Z`; represented instants remain the same.
- Requests accept exactly resourceId, userId, startTime, endTime. Real calendar dates, required timezone, up to three fractional digits, and endTime > startTime are validated before persistence.
- PENDING and CONFIRMED reservations block overlaps. CANCELLED reservations are excluded from active results and do not block rebooking. Intervals are half-open `[startTime, endTime)`, so adjacent bookings are allowed.
- A transaction first increments the resource's internal bookingVersion, then checks for an overlap and inserts the reservation. Concurrent transactions for the same resource conflict and retry, preventing the race in a bare find-then-create. MongoDB must support transactions: use the supplied replica set or an existing replica set/Atlas deployment, not a standalone mongod. Startup and `npm run seed` exit with an error when connected to a standalone server.
- `isAvailable` is administrative availability. Unknown or unavailable resources return 400. Seeded `res-104` is unavailable.
- No authentication, user-management, or cancellation API is introduced. userId is still supplied by the caller. All booking writes must use the service to preserve conflict guarantees; no production tenant isolation is claimed.

## Commands

- `npm run db:up`: start local MongoDB and initialize/wait for the replica set.
- `npm run db:down`: stop/remove this project's containers, keeping the data volume.
- `npm run seed`: insert missing demo resources without resetting data.
- `npm run dev`: run TypeScript, loading `.env` if present.
- `npm run check`: strict type checking, architecture-aware ESLint, and Prettier.
- `npm test`: HTTP + real MongoDB regression tests, model validation, and architecture-rule probes.
- `npm run contract:lint`: validate the unchanged OpenAPI contract with pinned Redocly CLI.
- `npm run format`: format repository files.
- `npm run build`: compile to ignored `dist/`.
- `npm start`: run the compiled server.

## Architecture

```text
src/config/                  Environment parsing and connection lifecycle
src/app.ts                   Express wiring and async database initialization
src/server.ts                Listener startup and graceful shutdown
src/routes/                  Route-to-controller mappings only
src/controllers/             Extract input, call services, set HTTP responses
src/services/                Validation, queries, booking transactions, serialization
src/models/Resource.model.ts Resource schema and strict document interface
src/models/Reservation.model.ts ObjectId reference, Date fields, status enum
src/scripts/seed.ts          CLI orchestration of the seed service
src/tests/                   Database and boundary verification
```

ESLint rejects model/Mongoose/config imports from controllers and routes, HTTP-layer imports from services and models, and `process.env` access outside configuration. Only Express and Mongoose are runtime dependencies. Models have no connections and controllers have no ORM queries. Historical Lab 1/2 verification records remain intact.

## Lab 3 review and submission

[docs/lab3-verification.md](docs/lab3-verification.md) records executed checks and includes the **NO AI manual audit checklist** required by Part 3. The student must personally inspect the generated files and complete that audit; automated tests do not substitute for it. The repository is private for Lab 3; ensure the instructor has access and submit the repository URL to the Lab 3 Canvas assignment.
