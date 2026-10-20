# Lab 4 — Agent steering log

Date: 2026-10-19. This record describes actual agent execution and self-review. It does not claim that the student issued a remediation prompt or completed an independent manual review. The observed incident was an incomplete multi-file update, not a fabricated hallucination or repeated failure loop.

### Incident 1: User-history implementation changed but regression expectations stayed active-only

- **Initial Agent Output:** The first implementation updated OpenAPI to 1.1.0 and removed the active-status filter from `listUserReservations`, following Lab 4's “all bookings” requirement. It left the existing status test and README unchanged. Running the previous suite failed: the test expected `{ status: 200, body: [] }` after cancellation, but received the cancelled booking. Node reported 19 passes and 2 failures across 21 tests (one failing subtest plus its parent).
- **Root Cause:** The agent updated the service and contract without completing the related test/documentation changes. The old test also mutated MongoDB directly, so it could not validate the new controller/route wiring. This was context drift between the reviewed Lab 2 semantics and Lab 4's new requirement.
- **Remediation Prompt:** The agent used this self-review instruction in the execution conversation: “回归测试发现了一个实际遗漏：实现已按 Lab 4 返回全部预约，但旧测试仍要求取消后列表为空。我会同步测试与文档，并把原先直接改数据库状态的测试改为调用新接口，验证完整请求流程。” This was agent self-correction, not a quote attributed to the student.
- **Resolution:** Retained the new contract's all-bookings semantics. Changed status tests to call PATCH over real HTTP, assert CANCELLED history, verify immediate rebooking, repeated cancellation, and rejection of confirmation after cancellation. Updated README and AGENTS. The complete revised suite passed 24/24 tests; strict type checking, lint, formatting, build, and separate HTTP smoke checks also passed. All previous test cases ran; the superseded active-only expectation was intentionally migrated rather than removed.

### Additional execution observations

The first database startup failed because Docker Desktop was not running. Starting Docker and rerunning `npm run db:up` resolved it; no in-memory fallback was added. OpenAPI validation passed with six warnings, documented in the verification record. Neither observation is presented as an agent hallucination.
