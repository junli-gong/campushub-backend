# CampusHub

CS 5500 Labs 1–7: context boundaries, an OpenAPI contract, a MongoDB-backed reservation API, and a React client.

## Setup

Requires Node.js >=24.21.0, npm >=11.19.1, and Docker Desktop running (or another MongoDB replica set).

```sh
npm ci
npm --prefix client ci
cp .env-example .env
npm run db:up
npm run seed
npm run dev
```

If you already have `.env`, merge the settings from `.env-example` instead of overwriting your configuration. The first `db:up` downloads the MongoDB image, starts a single-node `rs0` replica set, and waits for initialization. MongoDB is exposed only on `127.0.0.1:27017` and uses a persistent Docker volume. The local database has no authentication; it is a development environment.

Lab 3 requires a real database **and seeded resources before the API tests**. There is no in-memory fallback. The seed command inserts missing `res-101` through `res-104` without overwriting existing resources or deleting reservations. Restarting the API retains bookings. Startup connects and initializes model indexes before opening the HTTP port; a failed connection exits with an error.

`PORT` defaults to 3000. `MONGODB_URI` is required. `npm test` and `npm run test:regression` now start their own temporary replica sets; no `.env`, Docker, or existing database is required for tests. The regression launcher supplies its generated `TEST_MONGODB_URI` only to the test subprocess. Environment reads are centralized in `src/config/environment.ts`.

## Contract and API

[docs/openapi.json](docs/openapi.json) is the authoritative contract (version 1.1.0).

| Method | Endpoint                             | Behavior                                                       |
| ------ | ------------------------------------ | -------------------------------------------------------------- |
| GET    | `/api/v1/health`                     | Process liveness, 200                                          |
| GET    | `/api/v1/resources`                  | Resource array; optional `type` and `isAvailable` filters      |
| POST   | `/api/v1/reservations`               | 201 created; 400 invalid input; 409 overlapping active booking |
| GET    | `/api/v1/reservations/user/{userId}` | All user bookings, including CANCELLED, 200                    |
| PATCH  | `/api/v1/reservations/{id}/confirm`  | 200 CONFIRMED; 404 unknown ID; 409 if already CANCELLED        |
| PATCH  | `/api/v1/reservations/{id}/cancel`   | 200 CANCELLED; 404 unknown ID                                  |

Errors use `{ "code": "VALIDATION_ERROR", "message": "..." }`, with `DOUBLE_BOOKING`, `INVALID_TRANSITION`, `NOT_FOUND`, or `INTERNAL_ERROR` as appropriate. Unknown routes and reservation IDs return JSON 404, and unexpected errors return a sanitized JSON 500.

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

### Filters and status changes

```sh
curl -i 'http://localhost:3000/api/v1/resources?type=ROOM&isAvailable=true'

# Replace BOOKING_ID with the id returned by POST.
curl -i -X PATCH http://localhost:3000/api/v1/reservations/BOOKING_ID/confirm
curl -i -X PATCH http://localhost:3000/api/v1/reservations/BOOKING_ID/cancel
curl -i http://localhost:3000/api/v1/reservations/user/user-456
```

Both PATCH routes take no body and return the full reservation with 200. Repeating the current state is idempotent, and confirming a cancelled reservation returns 409 `INVALID_TRANSITION`. After cancellation, POST can book the same slot again with a new ID.

### Data and booking behavior

- Types are ROOM, EQUIPMENT, LAB. A non-empty unmatched type (including STUDY_ROOM) returns 200 with `[]`; empty or repeated values return 400, preserving the reviewed Lab 2 behavior.
- `isAvailable` accepts exactly `true` or `false` and combines with `type` using AND; empty, repeated, or other values return 400. It is administrative availability, not availability for a requested time slot.
- API resource IDs remain strings such as `res-101`. The service looks up Resource's MongoDB `_id` and stores an ObjectId reference in Reservation.resourceId. Responses translate that reference back to the public ID and never expose `_id`, `__v`, or internal bookingVersion.
- Dates are stored as MongoDB dates and serialized as UTC ISO 8601 strings. Timezone offsets may normalize to `Z`; represented instants remain the same.
- Requests accept exactly resourceId, userId, startTime, endTime. Real calendar dates, required timezone, up to three fractional digits, and endTime > startTime are validated before persistence.
- PENDING and CONFIRMED reservations block overlaps. CANCELLED reservations remain in user history and do not block rebooking. Intervals are half-open `[startTime, endTime)`, so adjacent bookings are allowed.
- Status transitions are PENDING → CONFIRMED and PENDING or CONFIRMED → CANCELLED. CANCELLED is terminal. Status changes share the resource transaction with creation, including after a resource becomes administratively unavailable.
- The user endpoint returns all bookings, including CANCELLED history: Lab 4 asks for all of a student's bookings, whereas Lab 2 listed only active ones. `/confirm` exists because Lab 4 requires updates to both CONFIRMED and CANCELLED; `/cancel` is the route the lab names.
- A transaction first increments the resource's internal bookingVersion, then checks for an overlap and inserts the reservation. Concurrent transactions for the same resource conflict and retry, preventing the race in a bare find-then-create. MongoDB must support transactions: use the supplied replica set or an existing replica set/Atlas deployment, not a standalone mongod. Startup and `npm run seed` exit with an error when connected to a standalone server.
- Creating a reservation for an unknown or unavailable resource returns 400. Seeded `res-104` is unavailable.
- No authentication or user-management API is introduced. userId is still supplied by the caller. All booking writes must use the service to preserve conflict guarantees; no production tenant isolation is claimed.

## Frontend

The client in [`client/`](client/) uses React, TypeScript, Vite, native fetch, and CSS Modules, and calls the API above without changing it. With the API running (see Setup), open a **second terminal** at the repository root:

```sh
npm --prefix client run dev
```

Open **http://127.0.0.1:5173**. Vite proxies `/api` to the backend on **127.0.0.1:3000**, so no CORS middleware is needed. If you customized the backend port, adjust the proxy target in `client/vite.config.ts` accordingly.

- Filter available resources by Study rooms, Equipment, or Labs; choose **Reserve resource**.
- Select local start and end times, then **Create reservation**. An overlapping booking displays a specific conflict alert and keeps the form usable.
- **My Bookings** shows PENDING and CONFIRMED bookings, labeled by resource name (a resource taken out of service shows its ID). Cancel a booking to free its slot. The API keeps CANCELLED history; the client filters it out of this active-only view.
- The default demo student is `user-456`. Enter a different valid student ID and select **Apply** to change the demo session. This is not login or authorization.
- Loading, empty, validation, API, and network states are visible. Failed reads offer retry/refresh; failed mutations retain the form or booking and enable retry. In-flight mutations prevent duplicate clicks and student switching.
- API responses are validated before display. API types come from `shared/contracts.d.ts` through `import type`; backend runtime code is never bundled into the browser.

### Frontend checks and production build

```sh
npm --prefix client run check
npm --prefix client test
npm --prefix client run build
npm --prefix client run preview
```

`client/` declares its own tooling, so these also work after `cd client && npm ci`. Preview the production build at **http://127.0.0.1:4173**, with the API still running on port 3000. The preview proxy is for local verification. A deployed static client must have a same-origin `/api` reverse proxy pointing to the backend; no hosting deployment is included.

## Commands

- `npm run db:up`: start local MongoDB and initialize/wait for the replica set.
- `npm run db:down`: stop/remove this project's containers, keeping the data volume.
- `npm run seed`: insert missing demo resources without resetting data.
- `npm run dev`: run TypeScript, loading `.env` if present.
- `npm run check`: strict type checking (including `shared/` declarations), architecture-aware ESLint, and Prettier.
- `npm test`: Jest service and Supertest HTTP tests with an ephemeral MongoDB replica set.
- `npm run test:coverage`: Jest coverage with >80% statement/branch gates for services and controllers.
- `npm run test:regression`: original Node HTTP/database/model/architecture tests on another ephemeral replica set.
- `npm run contract:lint`: validate the OpenAPI contract with pinned Redocly CLI.
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
src/middleware/              JSON 404 and the central error handler (errorHandler.ts)
src/services/                Validation, queries, booking transactions, serialization
src/models/                  Mongoose schemas; Reservation.resourceId is an ObjectId
src/types/                   Backend-only route params and DomainError
src/scripts/seed.ts          CLI orchestration of the seed service
src/tests/                   Database and boundary verification
shared/contracts.d.ts        API types for the backend and client (type-only imports)
client/src/api/              Fetch wrapper, response guards, user-facing errors
client/src/hooks/            Reservation state and stale-response protection
client/src/components/       UI only; Workspace wires selection and refresh
```

ESLint rejects model/Mongoose/config imports from controllers and routes, HTTP-layer imports from services and models, and `process.env` access outside configuration. The backend runtime dependencies are Express and Mongoose. Models have no connections and controllers have no ORM queries or try/catch: Express 5 forwards rejected promises to `errorHandler.ts`.

API types are declared once in `shared/contracts.d.ts`. Because it is declaration-only, it adds nothing to `dist/` or the browser bundle, and `shared/tsconfig.json` type-checks it. In the client, `useBooking` and `useReservations` own reservation state and share the duplicate-submit guard, feedback, and busy cleanup in `useReservationMutation`; `useAsyncList` discards stale read responses.

## Agent context

`AGENTS.md` holds the canonical project rules, and `CLAUDE.md` imports it. `.cursorignore` keeps dependencies, build output, lockfiles, logs, source maps, generated artifacts, and historical lab records out of agent search. `.ignore` is a symlink to it, so ripgrep-based tools apply the same rules without extra flags. `docs/openapi.json` and `shared/contracts.d.ts` stay visible. Excluded files remain readable by explicit path; this is a search filter, not access control.

## Review records

- [VERIFICATION.md](VERIFICATION.md): Lab 1 checks and review.
- [docs/lab2-verification.md](docs/lab2-verification.md): Lab 2 checks, contract decisions, and review.
- [docs/lab3-verification.md](docs/lab3-verification.md): Lab 3 checks and the manual layer-isolation audit checklist.
- [docs/lab4-verification.md](docs/lab4-verification.md) and [docs/lab4-steering-log.md](docs/lab4-steering-log.md): Lab 4 checks, review, and agent steering log.
- [docs/lab5-verification.md](docs/lab5-verification.md): Lab 5 checks, browser audit, and review.
- [docs/lab6-verification.md](docs/lab6-verification.md): Lab 6 bloat audit, context measurements, regression checks, and review.

## Lab 7: Adversarial testing and coverage

```sh
npm ci
npm test
npm run test:coverage
# Equivalent coverage command required by the handout:
npx jest --coverage
npm run test:regression
```

The first test run downloads MongoDB **8.0.16** for your platform (network access and a supported MongoDB platform are required). Subsequent runs reuse its cache. `mongodb-memory-server` manages a real disposable single-node replica set with WiredTiger, enabling the existing transactions. It uses temporary storage rather than promising that every database byte stays in RAM. Tests never connect to your normal application database; each suite has a generated `campushub_test_*` database and teardown stops its server.

- Jest configuration: `jest.config.ts`; setup/ownership-checked cleanup: `src/test/setup.ts`.
- Service and validation cases: `src/services/__tests__/`; Supertest HTTP cases: `src/routes/__tests__/`.
- The service suite includes 32 deterministic millisecond interval cases and eight concurrent duplicate booking attempts. The tests retain real transactions instead of mocking the collision check.
- Coverage collects every production file in `src/services/` and `src/controllers/`, excluding only test files. Each directory independently requires **81%** statements and branches. Generated HTML is available at `coverage/index.html`; generated coverage stays out of Git.
- [Checked-in coverage report and audit](docs/lab7-verification.md) and [portable coverage summary](docs/lab7/coverage-summary.json) record the completed run.

Application startup and seeding still use your configured real development database, as described above. Only the testing workflow changed in Lab 7.
