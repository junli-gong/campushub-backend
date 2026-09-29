# Lab 2 verification

Executed by the coding agent on 2026-09-28 (America/Los_Angeles), using Node.js v26.3.0 and npm 11.19.1. This records automated review, not student review or a Canvas submission.

## Contract-first generation

Created and reviewed `docs/openapi.json` before writing the implementation, then applied the lab's code-generation instruction using that JSON contract as authoritative. JSON is an explicitly permitted alternative to YAML.

The deliverables are:

- `docs/openapi.json`: OpenAPI 3.0.3, base URL `/api/v1`, all three required endpoints plus the existing health endpoint, reusable User/Resource/Reservation/request/error schemas.
- `src/types/reservation.ts`: interfaces and enums matching the contract. Requests contain exactly four writable fields; responses add generated id and status.
- `src/routes/reservation.routes.ts`: POST `/reservations` and GET `/reservations/user/:userId`, mounted under `/api/v1`. Express `:userId` corresponds to OpenAPI `{userId}`.
- `src/routes/resource.routes.ts`: GET `/resources` with the documented type filter.
- Controllers, services, and Mongoose schemas follow the revised `AGENTS.md` boundaries. The runnable lab uses in-memory data, not a live database.

## Results

| Check                              | Result                                                             |
| ---------------------------------- | ------------------------------------------------------------------ |
| `npm run check`                    | TypeScript strict checking, type-aware ESLint, and Prettier passed |
| `npm run build`                    | Passed                                                             |
| `npm test`                         | 14 tests passed, 0 failed                                          |
| Redocly CLI 2.55.0                 | Valid OpenAPI description; 0 errors, 4 advisory warnings           |
| `npm run dev` + curl resource list | 200, four resources                                                |
| curl `?type=ROOM`                  | 200, two ROOM resources                                            |
| curl `?type=`                      | 400, VALIDATION_ERROR                                              |
| curl reservation creation          | 201, generated id and PENDING status                               |
| curl duplicate reservation         | 409, DOUBLE_BOOKING                                                |
| curl user reservation list         | 200, only that user's active reservations                          |
| `npm start` after build            | Health 200, LAB-filtered resources 200, reservation creation 201   |

The 14 tests cover real HTTP resource listing/filtering, empty/invalid/repeated filters, response fields, overlapping/equal/contained/containing intervals, timezone-equivalent intervals, adjacent intervals, different resources, user isolation, missing/extra/wrong-type fields, invalid real calendar dates, invalid timezones, reversed/equal ranges, malformed/oversized JSON, simultaneous duplicate attempts, database-free model validation, JSON 404, and async error forwarding to a sanitized JSON 500.

The Redocly advisory warnings are intentional lab-scope choices: no public license is assigned; the server is localhost as required; the input-free health endpoint has no invented 4xx response; User is a domain component with no invented user-management endpoint. Syntax, references, and required operation definitions pass validation. Authentication is explicitly absent via `security: []`.

## Audit decisions

- Use ROOM/EQUIPMENT/LAB from the domain requirements; the handout's STUDY_ROOM example conflicts with that enum. STUDY_ROOM returns 400.
- Split creation input from the full Reservation response so clients do not choose id/status; this matches the supplied POST example.
- `format: date-time` plus a pattern documents timestamp syntax. Runtime checks additionally reject impossible calendar dates and ensure endTime > startTime.
- Active means PENDING or CONFIRMED. Conflict intervals are half-open, allowing adjacent reservations.
- Error responses now use code/message, including existing 404 and 500 paths. Lab 1's verification record remains historical.
- Controllers use explicitly typed HTTP response status codes; services contain no HTTP dependencies. Routes contain mapping only.
- Mongoose document dates use Date; HTTP payloads use ISO strings. These models are preparatory and are not used by the in-memory services. Future persistence must explicitly serialize documents and implement concurrency-safe booking.
- The demo has no authentication, production tenant isolation, durable storage, or cross-process conflict protection. No extra API endpoints or runtime dependencies were added.
- The existing GitHub repository is currently public. Its visibility was left unchanged during Lab 2.

## Student follow-up

- [ ] Personally audit the OpenAPI fields, generated interfaces, paths, and status codes.
- [ ] Run the README curl examples locally.
- [ ] Submit the repository link to the Lab 2 Canvas assignment.
