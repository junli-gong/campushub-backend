# CampusHub agent context

## Scope and context

- CampusHub is a multi-tenant campus resource system. Express/Mongoose backend: `src/`; React/Vite client: `client/src/`; declaration-only API types: `shared/contracts.d.ts`.
- `.cursorignore` filters Cursor; its `.ignore` symlink makes ripgrep-based search apply the same rules without flags. They hide dependencies, builds, lockfiles, logs, maps, and historical lab records. Read only relevant source, `docs/openapi.json` for API work, and excluded files only by explicit path when needed. These files are a search aid, not access control.
- TypeScript application code only, named exports, explicit interfaces and function types; strict checking, no `any`, unsafe casts, ignored type errors, or unhandled promises. Use Prettier and the existing typed ESLint rules.
- Keep dependencies within the existing manifests (Express/Mongoose backend; React/React DOM/Vite frontend; approved TypeScript/ESLint/Prettier/Node test tooling). Lab 7 authorizes Jest, ts-jest, Supertest, mongodb-memory-server and their types as development dependencies. Other new packages need task authorization.

## Boundaries

- Routes map handlers; controllers validate input, await services, and set HTTP status. Express 5 forwards rejected promises to `src/middleware/errorHandler.ts`; do not add repetitive controller try/catch or a second error handler.
- Services own business logic and ORM calls, without Express/HTTP dependencies. Models define schemas and document interfaces only. Configuration owns environment reads and connection lifecycle; scripts orchestrate services.
- Name files `<resource>.routes.ts`, `<resource>.controller.ts`, `<resource>.service.ts`, `<concern>.middleware.ts`, and `<Model>.model.ts` with a PascalCase model; the terminal handler is `errorHandler.ts`.
- `app.ts` mounts routers under `/api/v1`, not-found middleware, then the terminal error handler. `server.ts` manages startup/shutdown. Connect and initialize indexes before listening. Health is liveness, not database readiness.
- API DTOs are declared once in `shared/contracts.d.ts`, imported with `import type`. The app configs skip `.d.ts` files, so `shared/tsconfig.json` (run by `npm run typecheck`) checks them. Keep Express route params, domain error classes, and MongoDB document shapes in the backend. Do not import server runtime into the browser.
- Frontend components render UI with explicit prop interfaces and CSS Modules. API I/O stays in `client/src/api/campushubApi.ts`; reservation state lives in `useBooking`, `useReservations`, and the shared `useReservationMutation` hook. Reuse `useAsyncList` for stale-response protection.
- Preserve loading/error/retry states, the 15-second timeout, immediate duplicate-write guards, and student-switch locking during mutations. Demo student IDs are not authentication; convert local inputs to UTC and render times locally.

## Contract and persistence invariants

- `docs/openapi.json` is authoritative. For intentional API changes update it first, then shared types, implementation, and tests. Never invent response fields or statuses.
- Creation accepts exactly resourceId, userId, startTime, endTime; server owns id and PENDING status. Validate real dates, timezone, precision ≤3 fractional digits, and end > start.
- Resource types: ROOM/EQUIPMENT/LAB. Nonempty unknown type filters return `[]`; empty/repeated values return 400. isAvailable accepts exactly `true`/`false` and combines with type using AND.
- Half-open overlap: existing.start < new.end AND existing.end > new.start. Only PENDING/CONFIRMED block a slot; adjacent bookings are allowed. The API user list includes CANCELLED history; My Bookings displays active entries only.
- Confirm/cancel return 200 Reservation and are idempotent. CANCELLED is terminal: confirming it returns 409 INVALID_TRANSITION; cancellation never returns 409. Missing IDs return 404 NOT_FOUND.
- JSON errors use ErrorResponse: 400 VALIDATION_ERROR, 409 DOUBLE_BOOKING/INVALID_TRANSITION, 404 NOT_FOUND, sanitized 500 INTERNAL_ERROR. Never leak internal exceptions or MongoDB fields.
- Creation and status changes share the resource bookingVersion write inside a transaction. Never replace this with unprotected find-then-create. Requires a replica set; no in-memory fallback. Public IDs remain strings; stored references use ObjectId.
- Tenant-owned data must carry a tenant ID; scope every read/write to the authenticated tenant, never a request-body tenant ID alone. Do not add authentication or tenancy beyond the task.
- Seed explicitly/idempotently without overwriting data. Tests may query models but only drop their unique `campushub_test_*` database. Preserve `.env`, production data, and user edits; never commit secrets/builds/dependencies.

## Verification and delivery

- Backend: `npm run check`, `npm run build`, `npm test`; run `npm run contract:lint` if the contract changes. `npm test` uses Jest and an ephemeral MongoMemoryReplSet; `npm run test:coverage` enforces >80% statements/branches separately for services and controllers. `npm run test:regression` runs the original Node suite on its own ephemeral replica set. Production/local development still uses `npm run db:up`. Seed explicitly and verify health 200 / unknown-route JSON 404.
- Frontend: `npm --prefix client run check`, `npm --prefix client test`, `npm --prefix client run build`; browser-check affected reservation workflows. Declare client tools in its own manifest and preserve its Prettier config.
- Keep architecture probes in sync with ESLint boundaries. Record actual checks and limitations, never fabricate student review or token measurements. Keep commits focused (`type: description`); submit/push as authorized, preserving instructor access.

- Jest fixtures live in `src/test/`; suites in service/route `__tests__` directories may access models for isolated setup. Only the regression launcher may forward process.env to a child process with a generated TEST_MONGODB_URI. Do not loosen production layer rules or mock away transaction semantics.
