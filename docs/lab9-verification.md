# Lab 9 — Reservation journeys

Both [Gherkin scenarios](../e2e/scenarios/reservation.feature) run as [Playwright tests](../e2e/reservation.spec.ts) against the React directory, Express routes, and MongoDB reservation transactions. The scenario names match the test names.

| Scenario                                           | Observed outcome                                                                                                                                                                                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A student books an available study room            | Filtering to Study rooms removes the printer. Submitting Study Room 302 returns 201. The page shows the success message, and reopening My Bookings shows one PENDING reservation at the requested local time.                                   |
| A second student tries to book an occupied printer | The first student books 3D Printer A through the UI. The second receives 409 with `DOUBLE_BOOKING` and the conflict alert. Reading both students' histories confirms the first reservation is intact and the second student has no reservation. |

The scenarios use the application's actual behavior rather than the handout's sample wording. A new reservation is PENDING, not confirmed, so the success step expects "Reservation created. You can find it in My Bookings." The conflict step expects the alert the client shows for `DOUBLE_BOOKING`.

On November 23, 2026, `npx playwright test` passed both scenarios in Chromium, Firefox, and WebKit on macOS (6/6). Repeating each scenario twice in the same run with three workers passed 12/12. Backend checks passed 91 Jest tests and 24 Node regression tests. The client passed its six API tests.

Each run starts with seeded resources. Parallel workers use distinct time slots, and teardown cancels bookings for the test's unique students. The browser runs in `Asia/Kolkata` (UTC+05:30, no daylight saving time): the spec types local wall-clock times, then expects the stored UTC instants and the times My Bookings renders in that zone. On macOS, the Firefox project gives the browser its own application data directory under the ignored test output; without it, Firefox failed to launch on the macOS 27 machine used here.

The [setup and run instructions](../README.md#browser-reservation-journeys) reproduce the local check. On GitHub, the `Reservation journeys (Chromium, Firefox, WebKit)` job in [CampusHub CI](https://github.com/junli-gong/campushub-backend/actions/workflows/ci.yml) runs the same suite in the official Ubuntu Playwright image, as the runner user. Its browser version matches the Playwright Test release in the project lockfile. [Run 45328635946](https://github.com/junli-gong/campushub-backend/actions/runs/45328635946) passed 6/6 there before review.

## Review checks

| Check                                          | Observed result                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend and client checks                      | `npm run check`, `build`, `ci:check` (3), `npm test` (91 Jest + 24 regression); client `check`, 6 tests, and `build` passed                                                                                                                                                                                                     |
| Local browser runs                             | 6/6, then 12/12 with `--repeat-each 2`; afterwards ports 3109 and 5179 were free and no `mongod` process remained                                                                                                                                                                                                               |
| Locators                                       | Only `getByRole`, `getByLabel`, and `getByText`; no CSS or XPath selectors, and no client changes were needed                                                                                                                                                                                                                   |
| Single-line breaks in a scratch copy, Chromium | Before review the suite caught 4 of 6: the server ignoring conflicts, storing CONFIRMED instead of PENDING, and changed success or conflict text. It missed the client treating local input as UTC and rendering times in UTC, because the browser ran in UTC. With the browser in `Asia/Kolkata`, all 6 fail at least one test |
| Firefox without its macOS data directory       | Both Firefox tests failed with `browserType.launch: Failed to launch the browser process`; the setting is kept for macOS only                                                                                                                                                                                                   |
| Missing `await` on an assertion                | `npm run lint` now covers `e2e/` and reports `@typescript-eslint/no-floating-promises`                                                                                                                                                                                                                                          |

## Student review

Reviewed by Tim Gong on 2026-11-23.

- [x] Reviewed the scenarios, Playwright configuration, and specs against the Lab 9 requirements and confirmed the review findings.
- [ ] Submitted the repository URL to the Lab 9 Canvas assignment.

Follow-ups applied during review:

- The browser runs in a non-UTC time zone, the spec enters local times, and the first scenario checks the requested local time, so a missing local-to-UTC conversion fails the suite.
- `npm run lint` checks the Playwright specs with the typed ESLint rules.
- This record explains the handout wording differences and lists the review checks; `README.md` lists it under Review records like the other labs.
