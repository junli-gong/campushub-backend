# Lab 9 — Reservation journeys

Both [Gherkin scenarios](../e2e/scenarios/reservation.feature) run as [Playwright tests](../e2e/reservation.spec.ts) against the React directory, Express routes, and MongoDB reservation transactions. The scenario names match the test names.

| Scenario                                           | Observed outcome                                                                                                                                                                                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A student books an available study room            | Filtering to Study rooms removes the printer. Submitting Study Room 302 returns 201. The page shows the success message, and reopening My Bookings shows one PENDING reservation for the requested slot.                                        |
| A second student tries to book an occupied printer | The first student books 3D Printer A through the UI. The second receives 409 with `DOUBLE_BOOKING` and the conflict alert. Reading both students' histories confirms the first reservation is intact and the second student has no reservation. |

On November 23, 2026, `npx playwright test` passed both scenarios in Chromium, Firefox, and WebKit on macOS (6/6). Repeating each scenario twice in the same run with three workers passed 12/12. Backend checks passed 91 Jest tests and 24 Node regression tests. The client passed its six API tests.

Each run starts with seeded resources. Parallel workers use distinct time slots, and teardown cancels bookings for the test's unique students. The browser uses UTC, and persisted timestamps are compared as instants. On macOS, the Firefox project gives the browser its own application data directory under the ignored test output.

The [setup and run instructions](../README.md#browser-reservation-journeys) reproduce the local check. On GitHub, the `Reservation journeys (Chromium, Firefox, WebKit)` job in [CampusHub CI](https://github.com/junli-gong/campushub-backend/actions/workflows/ci.yml) runs the same suite on Ubuntu.
