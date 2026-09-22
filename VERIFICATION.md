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

| Check                          | Result                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| Node.js                        | v26.3.0, meets lab minimum                                                           |
| Required npm                   | 11.19.1 run via npx; system npm remains 11.16.0                                      |
| Clean installation             | `npx --userconfig=/dev/null --yes npm@11.19.1 ci` passed; 0 reported vulnerabilities |
| `npm run check`                | TypeScript, ESLint, and Prettier all passed                                          |
| `npm run build`                | Passed; compiled output in `dist/`                                                   |
| `npm run dev` + health request | HTTP 200 with expected JSON                                                          |
| Unknown route                  | HTTP 404                                                                             |
| `npm start` + health request   | HTTP 200 with expected JSON                                                          |

Observed response for both development and compiled execution:

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"status":"ok","service":"campushub-backend"}
```

The isolated npm user configuration avoids an incompatible machine-level `allow-scripts` setting. No global npm installation or user configuration was changed. Sandbox network and localhost restrictions required running installation and live HTTP checks with network access enabled.

## Required student review

These are agent verification results, not a claim that student review occurred.

- [ ] Personally read and adjust `AGENTS.md` as needed.
- [ ] Inspect generated TypeScript against the lab's three boundary questions.
- [ ] Run the endpoint and confirm the response yourself.
- [ ] Confirm the GitHub repository is private and submit its URL to Canvas.
