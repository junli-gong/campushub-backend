# Lab 4 — Agent steering log

Date: 2026-10-19. Incident 1 was found by reviewing the agent's output against the service code; the student confirmed it and instructed the agent to fix it. Incident 2 was found and corrected by the agent itself during implementation.

### Incident 1: Cancel endpoint documented a 409 it can never return

- **Initial Agent Output:** When adding the status endpoints to `docs/openapi.json`, the agent wrote `/reservations/{id}/cancel` as a copy of `/confirm`. Cancel reused confirm's description ("confirmation after cancellation returns 409") and its 409 `INVALID_TRANSITION` response ("cancelled reservation cannot be confirmed"). Cancellation never returns 409: `updateReservationStatus` rejects only CANCELLED → CONFIRMED, and repeating a cancellation returns 200 with the same reservation. The contract promised clients an error they could never receive.
- **Root Cause:** The agent derived the second operation from the first instead of from the service's transition rules, so the copy carried a response that applies only to confirmation. No automated check caught it: Redocly validates structure, not whether a documented response is reachable, and the tests check runtime behavior rather than the contract text.
- **Remediation Prompt:** The review finding stated that `/cancel` documents a 409 `INVALID_TRANSITION`, copied from `/confirm`, that it can never return. After confirming the finding, the student replied: “第三条问题你按你的思路来改就好了，别的我都检查测试过没有问题” ("For issue 3, fix it your way; I have checked and tested everything else and found no problems.")
- **Resolution:** Each status operation now has its own description. `/confirm` keeps its 409 with an `INVALID_TRANSITION` example that matches the service message; `/cancel` documents only 200, 400, 404, and 500. Verified with `npm run contract:lint` (0 errors), the full test suite (24/24), and a live comparison of 21 responses against the dereferenced contract, including repeated cancellation (200) and confirmation after cancellation (409 on `/confirm`). Fixed in commit `1fc56b2`.

### Incident 2: User-history implementation changed but regression expectations stayed active-only

- **Initial Agent Output:** The first implementation updated OpenAPI to 1.1.0 and removed the active-status filter from `listUserReservations`, following Lab 4's “all bookings” requirement. It left the existing status test and README unchanged. Running the previous suite failed: the test expected `{ status: 200, body: [] }` after cancellation, but received the cancelled booking. Node reported 19 passes and 2 failures across 21 tests (one failing subtest plus its parent).
- **Root Cause:** The agent updated the service and contract without completing the related test/documentation changes. The old test also mutated MongoDB directly, so it could not validate the new controller/route wiring. This was context drift between the reviewed Lab 2 semantics and Lab 4's new requirement.
- **Remediation Prompt:** The agent used this self-review instruction in the execution conversation: “回归测试发现了一个实际遗漏：实现已按 Lab 4 返回全部预约，但旧测试仍要求取消后列表为空。我会同步测试与文档，并把原先直接改数据库状态的测试改为调用新接口，验证完整请求流程。” This was agent self-correction, not a quote attributed to the student.
- **Resolution:** Retained the new contract's all-bookings semantics. Changed status tests to call PATCH over real HTTP, assert CANCELLED history, verify immediate rebooking, repeated cancellation, and rejection of confirmation after cancellation. Updated README and AGENTS. The complete revised suite passed 24/24 tests; strict type checking, lint, formatting, build, and separate HTTP smoke checks also passed. All previous test cases ran; the superseded active-only expectation was intentionally migrated rather than removed.

### Additional execution observations

The first database startup failed because Docker Desktop was not running. Starting Docker and rerunning `npm run db:up` resolved it; no in-memory fallback was added. OpenAPI validation passed with six warnings, documented in the verification record. Neither observation is presented as an agent hallucination.
