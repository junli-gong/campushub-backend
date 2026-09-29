# Lab 2 verification record

Verified on 2026-09-28 (America/Los_Angeles), using Node.js v26.3.0 and npm 11.19.1.

## Contract-first generation

`docs/openapi.json` was written first. The lab's code-generation prompt was then applied with that JSON contract as authoritative. JSON is an explicitly permitted alternative to YAML.

The deliverables are:

- `docs/openapi.json`: OpenAPI 3.0.3, base URL `/api/v1`, all three required endpoints plus the existing health endpoint, and reusable User/Resource/Reservation/request/error schemas built from shared Identifier, Timestamp, and enum schemas.
- `src/types/reservation.ts`: interfaces and enums matching the contract. Requests contain exactly four writable fields; responses add generated id and status.
- `src/routes/reservation.routes.ts`: POST `/reservations` and GET `/reservations/user/:userId`, mounted under `/api/v1`. Express `:userId` corresponds to OpenAPI `{userId}`.
- `src/routes/resource.routes.ts`: GET `/resources` with the documented type filter.
- Controllers, services, and Mongoose schemas follow the `AGENTS.md` boundaries. The runnable lab uses in-memory data, not a live database.

## Results

| Check                                        | Result                                                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm run check`                              | TypeScript strict checking, type-aware ESLint, and Prettier passed                                    |
| `npm run build`                              | Passed                                                                                                |
| `npm test`                                   | 15 tests passed, 0 failed                                                                             |
| `npm run contract:lint` (Redocly CLI 2.55.0) | Valid OpenAPI description; 0 errors, 4 advisory warnings                                              |
| Live responses against contract schemas      | 11 requests covering every documented 200/201/400/409 response matched the dereferenced schemas (Ajv) |
| curl resource list                           | 200, four resources                                                                                   |
| curl `?type=ROOM`                            | 200, two ROOM resources                                                                               |
| curl `?type=STUDY_ROOM`                      | 200, empty array                                                                                      |
| curl `?type=`                                | 400, `VALIDATION_ERROR`, "type must be a non-empty string when provided."                             |
| curl reservation creation                    | 201, generated id and PENDING status                                                                  |
| curl duplicate reservation                   | 409, `DOUBLE_BOOKING`                                                                                 |
| curl user reservation list                   | 200, only that user's active reservations                                                             |
| curl missing field, invalid date, `%ZZ` path | 400, `VALIDATION_ERROR`                                                                               |
| `npm start` after build                      | Health 200, reservation creation 201                                                                  |

The 15 tests cover real HTTP resource listing and filtering; unmatched, empty, and repeated filters; response fields; overlapping, equal, contained, and containing intervals; timezone-equivalent intervals; adjacent intervals; different resources; user isolation; missing, extra, and wrong-type fields; invalid calendar dates and timezones; reversed and equal ranges; malformed URLs and JSON; oversized JSON; simultaneous duplicate attempts; database-free model validation; JSON 404; and async error forwarding to a sanitized JSON 500.

The Ajv contract check ran from a scratch directory against `redocly bundle --dereferenced` output and is not a project dependency.

The Redocly warnings are intentional: no public license is assigned; the server is localhost as required; the input-free health endpoint has no invented 4xx response; User is a domain component with no invented user-management endpoint. Authentication is explicitly absent via `security: []`.

## Audit decisions

- `Resource.type` uses the ROOM/EQUIPMENT/LAB enum from the domain requirements. The `type` query filter is a non-empty string, as the handout's `?type=` error message implies, so its `STUDY_ROOM` example returns 200 with an empty array.
- `format: date-time` plus a pattern documents timestamp syntax. Runtime checks additionally reject impossible calendar dates and ensure endTime > startTime.
- Active means PENDING or CONFIRMED. Conflict intervals are half-open, allowing adjacent reservations.
- Error responses now use code/message, including existing 404 and 500 paths. Lab 1's verification record remains historical.
- Mongoose document dates use Date; HTTP payloads use ISO strings. These models are preparatory and are not used by the in-memory services. Future persistence must explicitly serialize documents and implement concurrency-safe booking.
- The demo has no authentication, production tenant isolation, durable storage, or cross-process conflict protection. No extra API endpoints or runtime dependencies were added.
- The existing GitHub repository is currently public. Its visibility was left unchanged during Lab 2.

## Student review

Reviewed by Tim Gong on 2026-09-28.

- [x] Audited the OpenAPI fields, generated interfaces, route paths, and status codes against the contract (answers below).
- [x] Ran the README curl examples locally, including the handout's `?type=STUDY_ROOM` request.
- [x] Submitted the repository URL to the Lab 2 Canvas assignment.

Part 3 audit questions:

1. **Do the generated route paths match the spec exactly?** Yes. `GET /resources`, `POST /reservations`, and `GET /reservations/user/:userId` are mounted under `/api/v1`, which matches `servers[0].url`. Express `:userId` is OpenAPI `{userId}`.
2. **Are 201, 400, 409, and 500 correctly typed in the response handlers?** Yes. The create handler's response is typed `Response<Reservation, …, 201>`, the list handlers use `200`, the error middleware is limited to `400 | 409 | 500`, and the not-found middleware to `404`. The status-code type parameter comes from `express-serve-static-core`, which `@types/express` already installs, so no dependency was added.
3. **Do request body properties match the schema fields?** Yes. `CreateReservationRequest` has exactly the four contract fields, and the validator rejects missing, extra, and wrong-type fields with 400.

The POST body references `CreateReservationRequest` rather than `Reservation`. The handout's own example omits `id` and `status`, and clients must not set server-owned fields. `Reservation` adds them for responses.

Follow-ups applied during review:

- `?type=STUDY_ROOM` returned 400, contradicting the handout's expected 200. The filter now accepts any non-empty string, and unmatched values return an empty array.
- A malformed percent-encoded path such as `/reservations/user/%ZZ` returned 500. All 4xx request parsing errors now return 400 `VALIDATION_ERROR`.
- OpenAPI: each operation has its own 400 description; shared schemas and an `InternalError` response replace repeated inline definitions; error examples were added; `info.version` is 1.0.0.
- `contract:lint` no longer overrides the npm user config, which also failed on Windows.
- `AGENTS.md`: the lab-specific section became a durable API contract section, and `npm test` and `contract:lint` were added to verification. A student reminder was removed from `README.md`.
