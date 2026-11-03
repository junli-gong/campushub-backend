# Lab 6 — Refactoring audit and context optimization

Date: 2026-11-02. Agent-performed implementation and verification; no independent student review or Canvas submission is claimed.

## Audit of Labs 1–5

| Area                | Observed before refactoring                                                                                                               | Decision                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Express controllers | Already await services without inline try/catch                                                                                           | Preserve the existing Express 5 error-forwarding behavior; do not invent duplicate handlers to remove                      |
| Backend errors      | One terminal handler existed at error.middleware.ts                                                                                       | Move to the required errorHandler.ts; update imports, preserving all mappings and headers-sent behavior                    |
| BookingForm         | 134 lines combining date state, validation, API mutation, duplicate guard, loading, errors, and rendering                                 | Extract useBooking; retain markup and local-time conversion                                                                |
| UserReservations    | 148 lines, close to the suggested 150-line threshold; fetching, resource-name lookup, cancellation, refresh, and rendering mixed together | Extract useReservations; retain active-only view, name-to-ID fallback, retry and refresh behavior                          |
| Mutation workflows  | Creation and cancellation repeat a ref lock, loading/input state, feedback, busy callbacks, try/catch/finally                             | Share that lifecycle in useReservationMutation; callers retain operation-specific validation and refresh                   |
| Root UI             | Workspace selection/refresh wiring mixed into App                                                                                         | Move the existing Workspace composition to its own component without adding state or behavior                              |
| API interfaces      | Frontend already reused backend DTOs, but coupled to src/types; health/error declarations lived separately                                | Move public contracts to shared/contracts.d.ts; keep route params, DomainError and persistence document types backend-only |
| Fetch/error parsing | Already centralized in campushubApi; stale-read guard already in useAsyncList                                                             | Reuse these rather than adding parallel helpers                                                                            |
| Context             | 73-line rules file repeated layer restrictions and verification instructions                                                              | Consolidate rules; preserve contract, transaction, data-safety and tooling constraints                                     |

No component was falsely reported as exceeding 150 lines: the largest targeted component was near that threshold. MongoDB document interfaces remain separate because ObjectId and Date storage fields are not the string-based API DTOs.

## Structured refactoring direction

The executed direction was to preserve API behavior, rename/reuse the existing terminal middleware rather than implement a second one, extract reservation state into hooks, centralize the repeated mutation lifecycle, move public interfaces into a declaration-only shared layer, and validate all changes with existing tests plus browser regression. No new dependencies or API endpoints were introduced.

## Context optimization artifacts and measurement

- `AGENTS.md`: canonical, pruned project instructions.
- `CLAUDE.md`: a small entry point referring to AGENTS, avoiding another full copy.
- `.cursorignore`: dependency/build directories, lockfiles, logs, bundle maps, generated material, and historical lab evidence excluded. Authoritative `docs/openapi.json` remains visible.
- `npm run context:files`: explicitly applies `.cursorignore` and scopes discovery to `src`, `client/src`, and `shared`.

| File                 | Before lines | After lines | Before bytes | After bytes |
| -------------------- | -----------: | ----------: | -----------: | ----------: |
| AGENTS.md            |           73 |          34 |       10,035 |       4,961 |
| BookingForm.tsx      |          134 |          91 |        4,111 |       2,798 |
| UserReservations.tsx |          148 |         108 |        4,584 |       3,168 |
| App.tsx              |          132 |          93 |        4,330 |       3,172 |

The canonical context shrank **50.6% by UTF-8 bytes**, and its whitespace-delimited word count fell from **1,378 to 649**. These are reproducible file-size/context proxies, not a claim about exact model tokens, billing, or total conversation consumption. The additional hook interfaces increase some supporting source size; the improvement is focused context and a single mutation lifecycle, not a claim that every repository line count decreased.

### Lightweight agent query

Query: **Where is reservation creation implemented, and where are its errors mapped?**

```sh
rg -n --ignore-file .cursorignore 'function (createReservation|handleError)' src
```

Actual output:

```text
src/services/reservation.service.ts:28:export async function createReservation(
src/controllers/reservation.controller.ts:18:export async function createReservationHandler(
src/middleware/errorHandler.ts:6:export function handleError(

```

Answer: the controller validates and awaits the creation service; the service owns the transactional overlap check and insert; the final handleError middleware maps rejected promises to JSON errors. The query returned only these three source locations under `src/`, without loading lockfiles, bundles, screenshots or historical logs. The source manifest also included the shared declarations and client hooks. A separate ignore check confirmed lockfiles/builds/dependencies/maps/historical screenshots are excluded, while `docs/openapi.json` and `shared/contracts.d.ts` remain visible.

Ignore files are not security boundaries. No claim is made that Codex automatically honors `.cursorignore`; the recorded commands explicitly load it. Historical reports remain available through deliberate reads.

## Verification

| Check                 | Result                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Backend npm run check | Passed strict TypeScript, architecture ESLint, Prettier                                           |
| Backend npm run build | Passed; existing dist/server.js entry point preserved                                             |
| Backend npm test      | 24 passed, 0 failed                                                                               |
| Client npm run check  | Passed strict TypeScript, typed ESLint, Prettier                                                  |
| Client npm test       | 6 passed, 0 failed                                                                                |
| Client npm run build  | Passed production build                                                                           |
| OpenAPI contract      | Unchanged byte-for-byte from the pre-refactor file                                                |
| Scope review          | No dependency changes; no inline controller try/catch; no duplicate public interface declarations |

### Browser regression against real persistence

Headless Chrome exercised the production Vite preview against Express and a seeded, isolated `campushub_test_lab6_*` MongoDB database. The ten completed check groups were:

1. Available-resource directory and resource-type filtering.
2. Invalid time intervals rejected before sending POST.
3. Successful creation, UTC conversion, resource-name display, immediate dashboard refresh, busy cleanup, and **two submit events in the same browser task producing only one POST**.
4. Real overlap returning 409 with the original explicit alert and re-enabled form/student selector.
5. Injected cancellation 500 retaining the booking and allowing retry; successful cancellation removing it; **two immediate cancel clicks producing only one PATCH**; busy callbacks restored.
6. Rebooking the freed interval and persistence across a page reload.
7. Student switching without retaining another student's booking state.
8. Injected list-fetch network error ending loading, followed by successful Refresh.
9. Deliberately delayed old resource-filter response not replacing newer results.
10. No uncaught browser errors; desktop and 390px mobile screenshots reviewed with no horizontal overflow.

The real API handled creation, conflicts, cancellation, and rebooking. Failure/delay cases were deliberately injected to exercise state recovery, not misrepresented as actual backend incidents. Existing backend tests also verified malformed inputs, JSON 404, sanitized 500, reconnect persistence, model schemas, and concurrent conflict prevention.

[Desktop screenshot](lab6/desktop.png) · [Mobile screenshot](lab6/mobile.png)

## Submission

Push the refactoring and these artifacts to the existing public repository and submit its URL to Canvas: https://github.com/junli-gong/campushub-backend . Review this audit and the new hook boundaries before submission. Student review is not marked complete by the agent.
