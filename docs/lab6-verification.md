# Lab 6 — Refactoring audit and context optimization

Date: 2026-11-02. The agent implemented the refactoring and ran the checks under Verification. Review checks, follow-ups, and the student review follow at the end.

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
- `CLAUDE.md`: a small entry point that imports AGENTS with `@AGENTS.md`, avoiding another full copy.
- `.cursorignore`: dependency/build directories, lockfiles, logs, bundle maps, generated material, and historical lab evidence excluded. Authoritative `docs/openapi.json` remains visible.
- `.ignore`: a symlink to `.cursorignore`. ripgrep reads it automatically, so ripgrep-based agent search applies the same rules with no flags.

| File                 | Before lines | After lines | Before bytes | After bytes |
| -------------------- | -----------: | ----------: | -----------: | ----------: |
| AGENTS.md            |           73 |          36 |       10,035 |       5,423 |
| BookingForm.tsx      |          134 |          91 |        4,111 |       2,798 |
| UserReservations.tsx |          148 |         108 |        4,584 |       3,168 |
| App.tsx              |          132 |          93 |        4,330 |       3,172 |

The canonical context shrank **46.0% by UTF-8 bytes**, and its whitespace-delimited word count fell from **1,378 to 707**. The agent's first pass reached 34 lines, 4,961 bytes, and 649 words; review restored the tenant-scoping and file-naming rules. These are reproducible file-size/context proxies, not a claim about exact model tokens, billing, or total conversation consumption. The additional hook interfaces increase some supporting source size; the improvement is focused context and a single mutation lifecycle, not a claim that every repository line count decreased.

### Ignore-file effect

Measured with ripgrep 14.1.1 at the repository root after review. `--no-ignore-dot` turns `.ignore` off, so each pair isolates its effect; `.gitignore` already hides `node_modules/`, `dist/`, and `.env` in both columns.

| Command                     | Without `.ignore` | With `.ignore` |
| --------------------------- | ----------------: | -------------: |
| `rg --files .`              |          70 files |       56 files |
| `rg -l createReservation .` |           9 files |        7 files |

The 14 hidden files are both lockfiles, `VERIFICATION.md`, the Lab 2–6 verification records, the Lab 4 steering log, and the Lab 5–6 screenshots.

Query: **Where is reservation creation implemented, and where are its errors mapped?**

```sh
rg -n 'function (createReservation|handleError)' .
```

Actual output with `.ignore`:

```text
./src/services/reservation.service.ts:28:export async function createReservation(
./src/controllers/reservation.controller.ts:18:export async function createReservationHandler(
./src/middleware/errorHandler.ts:6:export function handleError(
./client/src/api/campushubApi.ts:105:export async function createReservation(
```

Answer: the controller validates and awaits the creation service; the service owns the transactional overlap check and insert; the final `handleError` middleware maps rejected promises to JSON errors; the client's `createReservation` sends the POST. Without `.ignore`, the same search also matches the sample output quoted in this record.

The agent's first pass ran this query as `rg --ignore-file .cursorignore … src` through `npm run context:files`. Review found that the `src` path argument alone produced the same result, so it did not show the ignore file working, and the script failed on a machine without ripgrep. Ignore files are a search aid, not a security boundary; excluded files remain readable by explicit path.

### Lightweight Codex query

Run on 2026-11-02 with the Codex CLI bundled in the VS Code extension (`codex-cli 0.164.0-alpha.11.1`): a fresh `codex exec -s read-only` session at the repository root, prompt _"Where is reservation creation implemented, and where are its errors mapped? Answer from the source only and do not modify any files."_ `git status` was clean before and after each run. Token counts come from the session's `turn.completed` event and are summed over every model request in the run, including the loaded `AGENTS.md`.

| Run                                                                    | Commands | Files read                                                                                                                                             | Input tokens (cached) | Output tokens |
| ---------------------------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------: | ------------: |
| Extension's bundled ripgrep 15.2.0 on `PATH`, as in the IDE            |        3 | `rg` over `src` and `shared/contracts.d.ts`; then the reservation route, controller, and service, `validation.service.ts`, `errorHandler.ts`, `app.ts` |       67,856 (42,880) |         1,078 |
| Plain shell without ripgrep (`rg` exited 127; fell back to `find src`) |        9 | The same six files plus `src/types/error.ts`                                                                                                           |      104,657 (81,152) |           878 |

Both answers cited only `src/` files and gave the same mapping: `VALIDATION_ERROR` 400, `NOT_FOUND` 404, `DOUBLE_BOOKING` and `INVALID_TRANSITION` 409, Express 4xx errors such as malformed JSON 400 `VALIDATION_ERROR`, and anything else a sanitized 500 `INTERNAL_ERROR`. Neither run read lab records, lockfiles, screenshots, dependencies, or build output, and neither wrote files. One path guessed in the ripgrep run (`src/errors`) did not exist.

Codex limited its own searches to `src` and `shared/contracts.d.ts`, following `AGENTS.md`, so this query gave `.ignore` nothing to hide; the unscoped counts above show what it removes. The two runs on identical code differ by 35% in input tokens, so a single run is too noisy for a before/after token comparison, and none is claimed.

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

## Review checks

| Check                                                   | Observed result                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Audit figures                                           | Line, byte, and word counts above match `git show` of the Lab 5 commit; its controllers contained no try/catch                                                                                                                                                                                                                                                                                                                                   |
| Backend `check`, `build`, `npm test`, contract lint     | Passed: 24 tests; the 6 known Redocly warnings; `docs/openapi.json` byte-identical to Lab 5; `dist/server.js` unchanged and no `dist/shared` emitted                                                                                                                                                                                                                                                                                             |
| Fresh clone of the agent's commit                       | Root and `client/` `npm ci`, `check`, and `build`, plus the 6 client tests, passed                                                                                                                                                                                                                                                                                                                                                               |
| HTTP responses validated with Ajv against the contract  | 29 of 29 matched their documented status and schema: filters, 201/409/400 creation cases, idempotent confirm and cancel, `INVALID_TRANSITION`, 404s, JSON 404; no `_id`, `__v`, or `bookingVersion`                                                                                                                                                                                                                                              |
| 25 concurrent overlapping bookings, 3 rounds            | Each round: one 201 and twenty-four 409                                                                                                                                                                                                                                                                                                                                                                                                          |
| Independent headless Chrome run on the production build | 24 checks passed: directory and type filter; invalid interval sent no POST; two submits in one task sent one POST; student ID and resource buttons locked while saving; UTC payload; resource name in My Bookings; 409 alert with a usable form; cancel 500 kept the booking; two cancel clicks sent one PATCH; rebook and reload; student switch; list failure and Refresh; stale filter response ignored; no overflow at 390px; no page errors |
| Typo injected into `shared/contracts.d.ts`              | Before review: backend and client `tsc` both passed and the field became `any`. After review: `npm run typecheck` fails with TS2552                                                                                                                                                                                                                                                                                                              |

## Student review

Reviewed by Tim Gong on 2026-11-02.

- [x] Reviewed the agent output against the Lab 6 requirements and confirmed the review findings.
- [x] Ran a lightweight Codex query and recorded its token usage and the files it read (see Lightweight Codex query).
- [ ] Submitted the repository URL to the Lab 6 Canvas assignment.

Follow-ups applied during review:

- `shared/tsconfig.json` type-checks the shared declarations, which the application configs skipped through `skipLibCheck`; `npm run typecheck` runs it.
- `.ignore` links to `.cursorignore` so ripgrep-based search applies the rules without flags; `npm run context:files` was removed.
- `CLAUDE.md` imports `AGENTS.md` instead of linking to it.
- `AGENTS.md` again states the multi-tenant scoping rule and the file naming convention.
- The unused shared `User` type and the `CreateReservationDTO` alias were removed; the package description no longer names a lab range.
- `README.md`: the Lab 6 section became Agent context and Architecture text, and this record is listed under Review records.
