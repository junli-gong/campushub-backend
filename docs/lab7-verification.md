# Lab 7 — Dynamic test generation and edge-case prediction

Verified by the coding agent on 2026-11-09. No independent student review or Canvas submission is claimed.

## Deliverables and commands

- `jest.config.ts` and `tsconfig.jest.json`: Node environment, TypeScript transform, serial execution, three test suites, separate directory-level coverage gates.
- `src/test/setup.ts`: real MongoMemoryReplSet, pinned MongoDB 8.0.16/WiredTiger, generated database name, ownership checks before deletion, cleanup and shutdown.
- `src/services/__tests__/reservation.service.test.ts`: 42 isolated service tests, including 32 generated boundary cases.
- `src/services/__tests__/validation.service.test.ts`: 32 pure validation cases.
- `src/routes/__tests__/reservation.routes.test.ts`: 17 Supertest HTTP cases.
- `src/test/run-regression.ts`: preserves the original 24 Node tests and supplies a temporary test URI, without relying on Docker or `.env`.

```sh
npm ci
npm test
npx jest --coverage
npm run test:regression
npm --prefix client test
```

Both normal Jest execution and the handout's exact coverage command completed successfully. `npm run test:coverage` is the explicit serial equivalent. The first invocation downloads a platform-specific MongoDB binary; subsequent runs cache it. The test database is a disposable real process with temporary WiredTiger storage, not an application in-memory fallback and not a guarantee of RAM-only storage.

## Edge cases and test design

| Risk / prediction                      | Assertion                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Server fields accepted from a caller   | Extra id/status fields and missing required fields rejected                                                                             |
| Invalid timestamp parsing              | Invalid leap days, month/day bounds, timezone bounds, seconds/minutes, missing offsets, excess precision and non-string values rejected |
| Zero/negative interval                 | HTTP validation returns 400; direct service attempts reject and roll back bookingVersion/insert                                         |
| Exact or timezone-equivalent duplicate | DOUBLE_BOOKING, no second persisted reservation                                                                                         |
| One-millisecond overlap                | Rejected both at service and HTTP boundaries                                                                                            |
| Adjacent interval                      | Allowed; half-open intervals share no occupied millisecond                                                                              |
| Missing or unavailable resource        | Rejected without inserting a booking                                                                                                    |
| Resource creation                      | Seed creates fixtures; additional model fixture can be retrieved; repeat seeding preserves edits                                        |
| Status transitions                     | Confirm/cancel idempotency, CANCELLED terminal state, preserved history, rebooking after cancellation                                   |
| Resource disabled after booking        | Existing reservation still cancellable                                                                                                  |
| Dangling reference                     | Explicit service failure, no partially updated reservation                                                                              |
| Concurrent booking race                | Eight simultaneous attempts yield exactly one success and seven DOUBLE_BOOKING rejections; one document persists                        |
| Query filter mistakes                  | Counts, returned type, availability booleans and exact public fields checked; malformed/repeated filters rejected                       |
| Unexpected service failure             | Injected error returns sanitized 500 through Express; private details do not escape                                                     |

The interval generator uses eight start offsets and four positive lengths around a fixed `[10,20)` millisecond booking. An independent oracle enumerates occupied integer milliseconds and checks set membership, rather than copying the service's `$lt`/`$gt` predicate. The matrix is deterministic and rerunnable; it is bounded fuzzing, not an exhaustive proof over every timestamp.

The service suite exercises services directly but uses actual isolated MongoDB persistence, as allowed by the handout. Resource creation is through seed/model fixtures because no resource-creation HTTP endpoint exists in the contract. No endpoint was invented for testing. Only the unexpected-500 HTTP case mocks a service; overlap and concurrency checks retain real transactions.

## Coverage report

Scope: **all production files in `src/services/` and `src/controllers/`**. Tests alone are excluded. Models, middleware, configuration, frontend, and test helpers are outside the requested denominator; this is not a claim of 100% whole-repository coverage.

**91/91 Jest tests passed across 3 suites. Statement coverage: 100% (128/128); branch coverage: 100% (77/77); functions: 100% (26/26); lines: 100% (122/122).**

| File                                        | Statements   | Branches     |
| ------------------------------------------- | ------------ | ------------ |
| `src/controllers/health.controller.ts`      | 3/3 (100%)   | 0/0 (100%)   |
| `src/controllers/reservation.controller.ts` | 14/14 (100%) | 0/0 (100%)   |
| `src/controllers/resource.controller.ts`    | 4/4 (100%)   | 0/0 (100%)   |
| `src/services/health.service.ts`            | 2/2 (100%)   | 0/0 (100%)   |
| `src/services/persistence.service.ts`       | 4/4 (100%)   | 0/0 (100%)   |
| `src/services/reservation.service.ts`       | 40/40 (100%) | 14/14 (100%) |
| `src/services/resource.service.ts`          | 8/8 (100%)   | 10/10 (100%) |
| `src/services/seed.service.ts`              | 7/7 (100%)   | 0/0 (100%)   |
| `src/services/validation.service.ts`        | 46/46 (100%) | 53/53 (100%) |

Controllers contain no instrumented branches (0/0, reported as 100% by Jest); they delegate validation/business decisions to services. All 77 measured service branches were exercised. Configuration enforces 81%, separately on each directory, so an aggregate score cannot mask a low service/controller result. No Istanbul ignore comments or production-file exclusions were added. No threshold was lowered after failure.

[Machine-readable coverage summary](lab7/coverage-summary.json) uses repository-relative paths. To regenerate the full browsable HTML and LCOV output, run `npx jest --coverage` and open `coverage/index.html`. The checked-in JSON snapshot is from that successful run; generated bundles remain ignored.

## Adversarial quality check

A temporary mutation changed the overlap end comparison from `$gt` to `$gte`. The 32 interval cases then reported **4 failures and 28 passes**, correctly detecting that adjacent bookings were being rejected. The mutation was reverted in a `finally` block and the production service was verified byte-for-byte identical to the original. The successful coverage report above was produced from the unmutated source. This probe demonstrates one concrete regression the suite catches; it is not a full mutation-testing score.

## Actual setup failure and recovery

The first Jest run downloaded MongoDB successfully but could not connect through Mongoose: `Missing required sub-document 'driver' in the client metadata document`. Pure validation tests passed; persistence tests did not run successfully, so that run was not accepted as coverage evidence.

This matches the MongoDB driver's [NODE-7832 Jest compatibility issue](https://jira.mongodb.org/browse/NODE-7832). The fixture now explicitly supplies the native Node OS adapter in its **test-only** Mongoose connection. Production connection code and database behavior were not changed. The [Memory Server replica-set documentation](https://typegoose.github.io/mongodb-memory-server/docs/guides/quick-start-guide/) informed the replica-set setup needed for transactions. The subsequent full run passed with 100% coverage; no additional coverage-gap tests or reduced thresholds were needed.

## Regression and scope checks

- `npm run check`: passed strict TypeScript/shared declarations, ESLint, formatting.
- `npm run build`: passed.
- `npm test`: 91 passed.
- `npx jest --coverage`: 91 passed; coverage gates satisfied.
- `npm run test:regression`: 24 passed on an independent temporary replica set, including architecture probes, model validation, persistence, and HTTP errors.
- `npm --prefix client test`: all 6 existing API-client tests passed.
- Existing application source and OpenAPI behavior were preserved. ESLint exceptions apply only to test directories and the test subprocess environment forwarding; production import/environment rules remain enforced.
- npm audit also reports dependency advisories, including a high-severity body-parser 2.3.0 advisory already present in the pre-lab lockfile, plus development-tool findings. These tests and coverage numbers do not establish dependency security. No force-upgrade or unrelated runtime dependency migration was performed.

## Submission

Repository: https://github.com/junli-gong/campushub-backend . Keep it public for instructor access and submit the link to Canvas after reviewing the report. No manual-review checkbox has been completed on the student's behalf.
