# Lab 3 verification and student audit checklist

Automated verification performed on 2026-10-05 (America/Los_Angeles). This document records agent-executed checks. It does **not** claim that the student's required NO AI manual audit or Canvas submission has occurred.

## Deliverables and design

| Lab requirement           | Implementation                                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typed Resource model      | `src/models/Resource.model.ts`; exported ResourceDocument and resourceSchema                                                                                                  |
| Typed Reservation model   | `src/models/Reservation.model.ts`; exported ReservationDocument, Date fields, enum status, and ObjectId resourceId with ref Resource                                          |
| Database service layer    | `src/services/resource.service.ts` and `reservation.service.ts` perform all resource/reservation queries and serialize API responses                                          |
| Thin controllers          | Extract/validate input through service functions, await services, return typed 200/201 responses; error middleware maps domain errors to 400/409 and unexpected errors to 500 |
| Routes                    | Existing Lab 2 paths remain mounted under `/api/v1`, with mapping-only router files                                                                                           |
| Configuration             | `src/config/environment.ts` owns environment reads; `src/config/database.ts` owns connection/disconnection and rejects deployments without transaction support                |
| Application wireup        | `initializeApplication` in `src/app.ts` connects and initializes models before `src/server.ts` starts listening                                                               |
| Repeatable database setup | `compose.yaml`, `.env-example`, `npm run db:up`, and idempotent `npm run seed`                                                                                                |
| Boundary enforcement      | ESLint rejects forbidden imports and environment reads outside configuration; tests inject representative violations through lintText without changing source files           |

The existing OpenAPI document was read and left unchanged. The public string resource ID (e.g. res-101) is translated to MongoDB's ObjectId internally; response serialization exposes only contract fields. Dates are serialized in UTC. Unknown non-empty type filters still return 200 with an empty array, preserving the student's reviewed Lab 2 behavior.

A per-resource write inside a MongoDB transaction prevents concurrent overlap checks from both succeeding. The internal bookingVersion field never appears in the API. This requires a replica set; the provided local setup initializes a single-node rs0. An index alone would not prevent overlapping bookings.

## Executed checks

| Check                                                       | Observed result                                                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run db:up`                                             | MongoDB image downloaded; project-specific container/volume created; replica set initialization exited 0 |
| `npm run check`                                             | Strict TypeScript, ESLint, and Prettier passed                                                           |
| `npm run build`                                             | Passed                                                                                                   |
| `npm test`                                                  | 21 passed, 0 failed, with a real local MongoDB replica set                                               |
| `npm run seed`                                              | Missing demo resources inserted; no existing application records erased                                  |
| Development server + curl health                            | 200 with expected JSON                                                                                   |
| curl resources                                              | 200, four seeded resources                                                                               |
| curl `?type=ROOM`                                           | 200, two ROOM resources                                                                                  |
| curl `?type=STUDY_ROOM`                                     | 200, empty array                                                                                         |
| curl `?type=`                                               | 400 VALIDATION_ERROR                                                                                     |
| curl create reservation                                     | 201, generated id, PENDING status, original public resource ID                                           |
| curl duplicate reservation                                  | 409 DOUBLE_BOOKING                                                                                       |
| curl user's reservations                                    | 200, saved reservation                                                                                   |
| Stop development server, start compiled server              | Saved reservation's complete response remained identical                                                 |
| Unreachable database at port 29999                          | Startup exited 1 and printed `connect ECONNREFUSED 127.0.0.1:29999`                                      |
| Standalone (non-replica-set) MongoDB                        | Startup and `npm run seed` exited 1 with a message to run `npm run db:up`                                |
| Live responses against the contract schemas                 | 11 requests matched the dereferenced OpenAPI schemas (Ajv, run outside the project)                      |
| 60 concurrent overlapping bookings across two API processes | 1 × 201 and 59 × 409; no overlapping active reservations stored                                          |
| GitHub visibility                                           | Public; switched back from private on 2026-10-05 so the instructor can open the repository URL           |

The tests retain all Lab 2 HTTP scenarios and additionally cover ObjectId persistence, no internal-field leakage, idempotent seeding that preserves custom resource names, CONFIRMED/CANCELLED behavior, stored data after disconnect/reconnect, database failure mapped to 500, replica-set detection, and negative ESLint boundary probes. Each run uses a fresh random `campushub_test_*` database, then removes only that database. Application data is not cleared by automated tests.

## What changed in the test environment

Lab 2's process-local fixtures needed no database. Lab 3 requires:

1. A running MongoDB replica set and configured connection URI.
2. Resource documents created before booking tests (`npm run seed`).
3. An isolated database for automated tests (`TEST_MONGODB_URI`; the test runner selects a unique database name).

Restarting the API no longer resets reservations. Repeating a previously successful curl booking can return 409 across restarts; choose a fresh interval for a new 201 scenario. The database's Docker volume persists when `npm run db:down` is used.

## Review follow-ups

- Startup and `npm run seed` now reject a standalone MongoDB. Previously both succeeded there and every reservation POST returned 500.
- Startup and seed failures print the cause (unreachable database, invalid `MONGODB_URI` or `PORT`, port in use, standalone server) instead of one generic message.
- `user.model.ts` was renamed to `User.model.ts`, and `initializeModels` moved from the seed service to `src/services/persistence.service.ts`.
- `AGENTS.md`: the lab-specific section was folded into durable boundary, naming, API contract, and Persistence rules.

## Required student manual audit — NO AI

Part 3 of the assignment says: “Conduct a manual code audit (NO AI)”. The student must inspect the actual source without treating the automated findings above as completion of that requirement. No boxes below were checked by the agent.

- [ ] Open Resource.model.ts and Reservation.model.ts; verify exported typed interfaces, required properties, enums, Date fields, and ObjectId reference. Confirm no raw any types.
- [ ] Open both controllers; check that they know service methods, not Mongoose models or queries. Explain how awaited failures reach the final error middleware.
- [ ] Open both services; confirm that queries and booking logic live here and there are no Express requests, responses, or HTTP status codes.
- [ ] Open the routers and app.ts; confirm exact Lab 2 route paths and middleware ordering.
- [ ] Open src/config/, server.ts, and .env-example; verify environment configuration is centralized and the database connects before the listener starts.
- [ ] Personally rerun the README curl examples and understand why the database and seed step are now needed.
- [ ] Submit the repository URL to the Lab 3 Canvas assignment.

The handout contains a contradictory sentence about ORM methods being used in controllers. The implementation follows its repeated, explicit boundary: controllers call services, and services own database interactions.
