# CampusHub agent context

## Scope and authorized stack

- Apply these rules to every change in this repository. Read this file before generating code.
- CampusHub is a multi-tenant campus resource management backend.
- Write application code exclusively in TypeScript. Never create or commit JavaScript (`.js`, `.cjs`, `.mjs`) source files. Compiler-generated JavaScript in ignored `dist/` is allowed.
- Runtime dependencies are limited to Express and Mongoose; Node.js built-ins are allowed. Use Mongoose for MongoDB access. Do not add other packages without explicit user approval.
- Approved development tools: TypeScript, ts-node, @types/node, @types/express, ESLint, @eslint/js, typescript-eslint, and Prettier. Use Node's built-in test runner for tests.

## Architectural boundaries

- Follow routes → controllers → services, with models as the persistence definitions.
- `src/app.ts`: compose Express, mount routers, then the not-found middleware, then the terminal error middleware, and export the application. `src/server.ts`: process configuration and listener startup only.
- `src/routes/`: route definitions and middleware mapping only; no inline handlers or business logic.
- `src/controllers/`: typed request/response handling and HTTP status management only. Call services; never import models, Mongoose, or issue database queries.
- `src/services/`: business logic, and the only layer that calls models. Because controllers may not query the database and models hold only schemas, persistence calls belong here. Never depend on Express, requests, responses, or HTTP status codes. Keep functions pure when possible. Services may hold process-local in-memory state only while no persistence has been requested.
- `src/models/`: Mongoose schemas and explicit document interfaces only. No controllers, service logic, or connections.
- `src/middleware/`: cross-cutting HTTP concerns such as not-found and terminal error handling. `src/types/`: shared explicit interfaces.
- Future tenant-owned data must carry a tenant identifier. Scope every tenant read/write to the authenticated tenant; never trust a request body tenant identifier by itself. Do not add authentication, tenancy, or database access beyond what the current task requests.

## Naming and API conventions

- Name files by resource and layer: `src/routes/<resource>.routes.ts`, `src/controllers/<resource>.controller.ts`, `src/services/<resource>.service.ts`, `src/models/<resource>.model.ts`, `src/middleware/<concern>.middleware.ts`, and shared interfaces in `src/types/<resource>.ts`.
- Use named exports only in `src/`; no default exports.
- Mount every router under `/api/v1` in `src/app.ts`; routers declare paths relative to that prefix.
- Respond with JSON only. Error responses use `ErrorResponse` (`{ "code": string, "message": string }`) from `src/types/error.ts`: invalid input returns 400 `VALIDATION_ERROR`, unknown routes return 404 from the not-found middleware, and unexpected errors return 500 from the terminal error middleware.

## Typing, safety, and style

- Enable TypeScript strict mode, noUncheckedIndexedAccess, and exactOptionalPropertyTypes.
- Explicitly annotate all function parameters and return types. Define named TypeScript interfaces for structured function inputs/outputs, API payloads, and database documents; use primitives for scalar values and Express's typed interfaces for HTTP boundaries.
- Never use explicit `any`, suppress type errors, or use unsafe casts to bypass checking. Narrow unknown values safely.
- Do not leave promises unhandled. Await service calls in async controllers; Express 5 forwards rejected handler promises to the final four-argument error middleware. Handle promise failures outside Express explicitly.
- Use ESLint's type-aware no-floating-promises and no-misused-promises rules. Use Prettier for formatting.
- Do not expose exception details or secrets in responses. Keep `.env`, `node_modules/`, and `dist/` out of Git; maintain a non-secret `.env-example`.
- The baseline health endpoint is a liveness check, independent of MongoDB. Do not claim database readiness from it.

## Verification and Git

- Run `npm run check`, `npm run build`, and `npm test` after code changes, and `npm run contract:lint` after contract changes (it runs a pinned Redocly CLI through npx; do not add it as a dependency). Start the local server and verify `GET /api/v1/health` returns HTTP 200 and the documented JSON payload, and that an unknown route returns a JSON 404.
- Review generated code against the boundaries above. Document actual verification outcomes without fabricating human review or test results.
- Keep commits focused; use `type: concise description` (for example, `feat: add layered health endpoint`).
- Provide concise PR/diff descriptions covering what changed, why the context boundaries shaped the implementation, and verification performed.

## API contract

- `docs/openapi.json` is the authoritative API contract. Read it before changing routes, controllers, validation, types, or responses. Change the contract first, then update `src/types/`, routes, and tests to match. Never add endpoints, fields, or status codes that the contract does not define.
- Keep client-writable request schemas separate from response schemas when the server owns fields. Reservation creation accepts only `resourceId`, `userId`, `startTime`, and `endTime`; the server generates `id` and sets `status` to PENDING.
- Resource types are ROOM, EQUIPMENT, and LAB. The `type` filter accepts any non-empty string, and a value matching no type returns an empty array.
- Active reservations are PENDING or CONFIRMED. Booking intervals are half-open `[startTime, endTime)`: reject an overlapping active reservation for the same resource with 409 `DOUBLE_BOOKING`, and allow adjacent bookings.
