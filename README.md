# CampusHub Backend

CS 5500 Lab 1: Context Engineering & Repository Initialization.

## Setup

Requires Node.js >=24.21.0 and npm >=11.19.1.

```sh
npm ci
cp .env-example .env
npm run dev
```

In another terminal:

```sh
curl -i http://localhost:3000/api/v1/health
```

Expected: HTTP 200, JSON content type, and:

```json
{ "status": "ok", "service": "campushub-backend" }
```

`PORT` defaults to 3000. The health endpoint reports process liveness; MongoDB is not required or checked. `MONGODB_URI` is a placeholder for future labs. Unknown routes return HTTP 404 with `{ "error": "Not found" }`.

## Commands

- `npm run dev`: run TypeScript using ts-node, loading `.env` if present.
- `npm run check`: strict type checking, type-aware ESLint, and Prettier check.
- `npm run format`: format the repository.
- `npm run build`: compile to ignored `dist/`.
- `npm start`: run the compiled server, loading `.env` if present.

## Architecture and context

`AGENTS.md` governs the authorized stack, architectural boundaries, typing, error handling, and Git conventions.

```text
src/
  app.ts                         Express composition
  server.ts                      Configuration and listener
  routes/health.routes.ts        Route-to-controller mapping
  controllers/health.controller.ts  HTTP response and status
  services/health.service.ts     Health result without HTTP dependencies
  models/                        Reserved for Mongoose schemas/interfaces
  middleware/not-found.middleware.ts  JSON 404 for unknown routes
  middleware/error.middleware.ts   Central error handling
  types/                         Explicit payload interfaces
```

The health handler is synchronous, so it creates no promises. Future async handlers must await service calls and rely on Express 5's rejection forwarding to the terminal error middleware. No database queries, tenant data, or authentication are needed for this exercise.

Only Express and Mongoose are runtime dependencies. Configuration and source use TypeScript/JSON; generated JavaScript, installed dependencies, and local environment files are excluded from Git.

## Review and submission

`VERIFICATION.md` records the automated checks and the student's manual review. The repository is hosted as a private GitHub repository and its URL is submitted to Canvas.
