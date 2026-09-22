# Lab 1 verification record

Verified on 2026-09-21 (America/Los_Angeles).

## Generation task

The lab's verification prompt was applied after authoring and reading `AGENTS.md`:

> Generate a initial Express server file (src/app.ts) and a baseline health-check endpoint (GET /api/v1/health).

The resulting app mounts a route module, which maps the controller to a pure health service. No database access is needed for liveness.

## Agent review

- Strict TypeScript, explicit function parameter/return types, named response interfaces, and no explicit `any` in application source.
- Routes contain mapping only; controllers handle HTTP; services contain no Express dependencies. Models are reserved for future Mongoose schemas.
- Runtime packages are Express and Mongoose only.
- The current endpoint is synchronous. A four-argument terminal middleware handles errors; the context requires awaiting future async service calls and Express 5 rejection forwarding.
- `.env`, `node_modules/`, and `dist/` are ignored. `.env-example` contains only local placeholder configuration.
- ESLint configuration uses `.mts` and Node's native TypeScript loader flag, avoiding an additional config-loader dependency or handwritten JavaScript.

## Executed checks

| Check                           | Result                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Node.js                         | v26.3.0, meets lab minimum                                                                                        |
| npm                             | 11.19.1 (upgraded from 11.16.0), meets lab minimum                                                                |
| Clean installation              | `npm ci` passed with the default user configuration; 0 reported vulnerabilities                                   |
| `npm run check`                 | TypeScript, ESLint, and Prettier all passed                                                                       |
| `npm run build`                 | Passed; compiled output in `dist/`                                                                                |
| `npm run dev` + health request  | HTTP 200 with expected JSON                                                                                       |
| `npm start` + health request    | HTTP 200 with expected JSON                                                                                       |
| Unknown route, `POST /health`   | HTTP 404, `application/json`, `{"error":"Not found"}`                                                             |
| `npm run dev` without `.env`    | Starts on default port 3000; health returns HTTP 200                                                              |
| Invalid `PORT=abc`              | Startup fails with `PORT must be an integer between 1 and 65535`                                                  |
| Lint rule probes (scratch copy) | Explicit `any`, a floating promise, and a missing return type are each reported as errors                         |
| Async handler throws            | Terminal error middleware returns HTTP 500 `{"error":"Internal server error"}`; detail is logged server-side only |

Observed response for both development and compiled execution:

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"status":"ok","service":"campushub-backend"}
```

## Student review

Reviewed by Tim Gong on 2026-09-21.

- [x] Read and revised `AGENTS.md`: removed lab-only notes, stated that services are the only layer that calls models, and added file naming, named-export, `/api/v1` mounting, and JSON error-format conventions.
- [x] Inspected generated TypeScript against the lab's three boundary questions: strict typing is used; files follow the designated directory layout; no forbidden dependencies or inline route logic were introduced.
- [x] Ran the endpoint and confirmed the response.
- [x] Confirmed the GitHub repository is private.
- [ ] Submit the repository URL to Canvas.

Follow-ups applied during review:

- Unknown routes now return a JSON 404 through `src/middleware/not-found.middleware.ts` instead of Express's default HTML page.
- `dev` and `start` load `.env` only if present.
- npm was upgraded to the lab's required version, and machine-specific setup notes were removed from `README.md`.
