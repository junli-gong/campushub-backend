# CampusHub agent context

## Scope and authorized stack

- Apply these rules to every change in this repository. Read this file before generating code.
- CampusHub is a multi-tenant campus resource management backend.
- Write application code exclusively in TypeScript. Never create or commit JavaScript (`.js`, `.cjs`, `.mjs`) source files. Compiler-generated JavaScript in ignored `dist/` is allowed.
- Runtime dependencies are limited to Express and Mongoose; Node.js built-ins are allowed. Use Mongoose for MongoDB access. Do not add other packages without explicit user approval.
- Approved development tools: TypeScript, ts-node, @types/node, @types/express, ESLint, @eslint/js, typescript-eslint, and Prettier. Use Node's built-in test runner for tests.

## Architectural boundaries

- Follow routes → controllers → services, with models as the persistence definitions.
- `src/app.ts`: compose Express, mount routers and error middleware, and export the application. `src/server.ts`: process configuration and listener startup only.
- `src/routes/`: route definitions and middleware mapping only; no inline handlers or business logic.
- `src/controllers/`: typed request/response handling and HTTP status management only. Call services; never import models, Mongoose, or issue database queries.
- `src/services/`: business logic and persistence orchestration through models; never depend on Express, requests, responses, or HTTP status codes. Keep logic pure when no persistence is required.
- `src/models/`: Mongoose schemas and explicit document interfaces only. No controllers, service logic, or connections.
- `src/middleware/`: cross-cutting HTTP concerns such as terminal error handling. `src/types/`: shared explicit interfaces.
- Future tenant-owned data must carry a tenant identifier. Scope every tenant read/write to the authenticated tenant; never trust a request body tenant identifier by itself. Do not invent authentication or database access for this lab.

## Typing, safety, and style

- Enable TypeScript strict mode, noUncheckedIndexedAccess, and exactOptionalPropertyTypes.
- Explicitly annotate all function parameters and return types. Define named TypeScript interfaces for structured function inputs/outputs, API payloads, and database documents; use primitives for scalar values and Express's typed interfaces for HTTP boundaries.
- Never use explicit `any`, suppress type errors, or use unsafe casts to bypass checking. Narrow unknown values safely.
- Do not leave promises unhandled. Await service calls in async controllers; Express 5 forwards rejected handler promises to the final four-argument error middleware. Handle promise failures outside Express explicitly.
- Use ESLint's type-aware no-floating-promises and no-misused-promises rules. Use Prettier for formatting.
- Do not expose exception details or secrets in responses. Keep `.env`, `node_modules/`, and `dist/` out of Git; maintain a non-secret `.env-example`.
- The baseline health endpoint is a liveness check, independent of MongoDB. Do not claim database readiness from it.

## Verification and Git

- Run `npm run check` and `npm run build` after code changes. Start the local server and verify `GET /api/v1/health` returns HTTP 200 and the documented JSON payload.
- Review generated code against the boundaries above. Document actual verification outcomes without fabricating human review or test results.
- Keep commits focused; use `type: concise description` (for example, `feat: add layered health endpoint`).
- Provide concise PR/diff descriptions covering what changed, why the context boundaries shaped the implementation, and verification performed.
- Human review remains required by the lab: the student must personally review this context file and generated output before submission.
