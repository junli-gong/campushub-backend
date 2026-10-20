# Lab 4 verification

Verified by the coding agent on 2026-10-19; student review is not asserted.

## Implementation decisions

The existing creation transaction and half-open overlap rule were preserved. Status changes also write the resource within a transaction, so creation, confirmation, and cancellation serialize on that resource. Driver retries re-read the reservation after a write conflict. CANCELLED is terminal and cannot resurrect a slot after it has been rebooked. Repeating a transition returns the same public reservation. Cancelling an unavailable resource remains possible because status changes do not filter the resource by isAvailable.

Part 1 requires CONFIRMED and CANCELLED status updates; therefore `/confirm` was added alongside the explicit `/cancel` endpoint. Part 2 requests all bookings, so user history includes CANCELLED; this intentionally supersedes Lab 2's active-only listing. Public payloads retain the same fields and expose no internal database identifiers. Routes, controllers, services, and models retain their enforced boundaries.

## Automated checks

- `npm run check`: passed strict TypeScript, ESLint, and Prettier.
- `npm run build`: passed.
- `npm test`: 24 passed, 0 failed, using an isolated `campushub_test_*` database on the local MongoDB replica set.
- `npm run contract:lint`: passed, 0 errors, 6 warnings. Four are existing recommendations (license metadata, localhost server, health has no 4xx response, unused User schema). Two flag path-template ambiguity between `/reservations/user/{userId}` and the new action routes. The actual methods differ (GET vs PATCH), Express dispatch is unambiguous, and the cancellation path is explicitly prescribed by the lab; the paths were retained.

Coverage includes old overlap boundaries, timezone-equivalent intervals, invalid bodies/dates, concurrent duplicate creation, model validation, architecture restrictions, persistence across reconnect, and sanitized 500 responses. New coverage checks true/false and combined filters, invalid/repeated availability values, real PATCH confirmation/cancellation, idempotency, missing/invalid IDs, cancellation history, immediate rebooking, and concurrent confirmation/cancellation without resurrection.

## Separate HTTP smoke verification

Ran the compiled server on port 3104 with an independently seeded random `campushub_test_manual_*` database. Requests were issued outside the Node test runner with Python's HTTP client. This is agent-run verification, not a claim that the student manually performed it.

| Request / scenario                        | Observed result                                |
| ----------------------------------------- | ---------------------------------------------- |
| GET health                                | 200, documented liveness JSON                  |
| GET unknown route                         | 404 NOT_FOUND                                  |
| GET resources?type=ROOM&isAvailable=false | 200, only res-104                              |
| GET resources?isAvailable=bad             | 400 VALIDATION_ERROR                           |
| POST fresh reservation                    | 201 PENDING                                    |
| Repeat same POST                          | 409 DOUBLE_BOOKING                             |
| PATCH confirm                             | 200 CONFIRMED                                  |
| PATCH cancel                              | 200 CANCELLED                                  |
| Repeat PATCH cancel                       | 200, same reservation                          |
| PATCH confirm after cancellation          | 409 INVALID_TRANSITION                         |
| POST same slot after cancellation         | 201, new reservation ID                        |
| GET user history                          | 200, cancelled booking and new pending booking |
| PATCH cancel nonexistent ID               | 404 NOT_FOUND                                  |

The smoke server was stopped and only its temporary test database was dropped. Existing application data was preserved. Database failure and unexpected-handler 500 cases were exercised by the automated suite.

## Submission

Submit the repository URL to Canvas: https://github.com/junli-gong/campushub-backend . Repository visibility remains public for instructor access. The steering log records the actual incomplete-update incident and its recovery. The student should review the business rules and log before submitting; no independent student evaluation has been fabricated.
