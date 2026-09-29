# CampusHub Backend

CS 5500 Labs 1 and 2: agent context boundaries, executable specifications, and a reservation API.

## Setup

Requires Node.js >=24.21.0 and npm >=11.19.1.

```sh
npm ci
cp .env-example .env
npm run dev
```

`PORT` defaults to 3000 and `.env` is optional. MongoDB is not required: Lab 2 uses seeded resources and process-local reservations. Restarting clears reservations. Mongoose schemas are defined for future persistence, but are not connected to a database.

## Contract and API

The authoritative OpenAPI 3.0.3 contract is [docs/openapi.json](docs/openapi.json). `src/types/reservation.ts` contains the corresponding interfaces. No authentication is implemented in this local lab demo.

| Method | Endpoint                             | Behavior                                                            |
| ------ | ------------------------------------ | ------------------------------------------------------------------- |
| GET    | `/api/v1/health`                     | Process liveness, 200                                               |
| GET    | `/api/v1/resources`                  | Resource array, optionally `?type=ROOM`, `EQUIPMENT`, or `LAB`      |
| POST   | `/api/v1/reservations`               | Create a PENDING reservation, 201; invalid input, 400; overlap, 409 |
| GET    | `/api/v1/reservations/user/{userId}` | Active reservations for the user, 200                               |

Errors use `{ "code": "VALIDATION_ERROR", "message": "..." }`, with `DOUBLE_BOOKING`, `NOT_FOUND`, or `INTERNAL_ERROR` as appropriate. This replaces Lab 1's `{ error }` shape. Unknown routes return JSON 404; unexpected failures return JSON 500.

### Run the lab examples

```sh
curl -i http://localhost:3000/api/v1/resources
curl -i 'http://localhost:3000/api/v1/resources?type=ROOM'
curl -i 'http://localhost:3000/api/v1/resources?type='

curl -i -X POST http://localhost:3000/api/v1/reservations \
  -H 'Content-Type: application/json' \
  -d '{"resourceId":"res-101","userId":"user-456","startTime":"2026-10-01T10:00:00Z","endTime":"2026-10-01T11:00:00Z"}'

curl -i http://localhost:3000/api/v1/reservations/user/user-456
```

The POST returns a generated `id`, the four submitted fields, and `status: "PENDING"`. Repeat the POST to receive 409 with `code: "DOUBLE_BOOKING"`.

### Domain decisions

- The handout's domain enum is `ROOM/EQUIPMENT/LAB`; its `STUDY_ROOM` curl example contradicts that enum. Use `ROOM`. `STUDY_ROOM`, empty values, and repeated type filters return 400.
- A separate `CreateReservationRequest` schema contains the four writable fields. The response `Reservation` also contains server-owned `id` and `status`. Extra request fields are rejected.
- Timestamps must be real calendar dates with uppercase `T`, timezone (`Z` or numeric offset), seconds, and at most three fractional digits. End must be later than start. Offset-equivalent instants are compared correctly.
- Overlaps use half-open intervals `[startTime, endTime)`; adjacent bookings are allowed. Both PENDING and CONFIRMED block overlaps; CANCELLED does not. Active means PENDING or CONFIRMED, not a comparison with today's date.
- Seeded resources are `res-101` (ROOM), `res-102` (EQUIPMENT), `res-103` (LAB), and unavailable `res-104` (ROOM). `isAvailable` is administrative availability, not a timeslot computation. Unknown or unavailable resources return 400.
- `userId` is a demo identifier, not authenticated identity. The User schema is defined without inventing a user-management endpoint. No cancellation/update endpoint is added.
- Conflict checking and insertion are synchronous within one process. This demo does not provide durable storage or cross-process concurrency protection. Mongoose indexes alone do not enforce interval exclusivity; future database integration will need a concurrency strategy.

## Commands

- `npm run dev`: run TypeScript, loading `.env` if present.
- `npm run check`: strict type checking, type-aware ESLint, and Prettier.
- `npm test`: real HTTP integration and database-free Mongoose validation tests.
- `npm run contract:lint`: pinned Redocly CLI validation; requires registry access on first use.
- `npm run format`: format the repository.
- `npm run build`: compile to ignored `dist/`.
- `npm start`: run the compiled server.

## Architecture

`AGENTS.md` governs changes. Routes map to controllers; controllers manage HTTP and call services; services validate and manage in-memory state; models contain Mongoose schemas and document interfaces. No database calls occur in controllers. Only Express and Mongoose are runtime dependencies; the OpenAPI linter is ephemeral.

```text
docs/openapi.json            Authoritative API contract
src/types/reservation.ts    User, Resource, Reservation and request interfaces
src/routes/                 Health, resource and reservation mappings
src/controllers/            HTTP handling and typed status codes
src/services/               Validation, resource fixtures, reservation logic
src/models/                 User, Resource and Reservation Mongoose schemas
src/middleware/             Standardized 404 and error responses
src/tests/                  HTTP and model verification
```

## Review and submission

[VERIFICATION.md](VERIFICATION.md) preserves Lab 1's historical review. [docs/lab2-verification.md](docs/lab2-verification.md) records Lab 2 checks and contract decisions. Lab 2 still requires the student's personal review and submission of the repository URL to Canvas; prior Lab 1 submission does not submit Lab 2.
