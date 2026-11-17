# Lab 8 — Auto-Healing CI/CD Pipelines

## Baseline verification

Verified on November 16, 2026 (America/Los_Angeles).

- Workflow: `.github/workflows/ci.yml`, commit `5e5c9ea1db30708a48ec83cae8169ae610062b98`.
- [Successful main CI run](https://github.com/junli-gong/campushub-backend/actions/runs/44017865693): lint, types, formatting, CI runner checks, build, tests and coverage passed. Auto-fix correctly skipped.
- Jest: 91/91 passed; Node regression: 24/24 passed; patch-validator tests: 2/2 passed.
- Jest coverage: 100% statements, branches, functions and lines for services/controllers.

## Repair design

The failed test exit status is preserved despite capturing output with `tee`. The downstream `auto-fix` job checks both `failure()` and the test-step outcome. It accepts only owner-authored, same-repository reservation-service-only PRs. The orchestrator comes from the trusted base revision; the candidate comes from the exact failed head.

Pinned Ollama runs `qwen2.5-coder:7b` locally on the Actions runner. The prompt includes actual failure output, the service source and the PR diff. The model must return a small exact replacement, applied only if its old text is unique. No hard-coded repair fallback exists. The original checks/build/tests/coverage must pass before publishing. The publishing step alone receives the write token, and the patch PR targets the broken branch. No automatic approval or merge is implemented.

GitHub Models was not used because [GitHub documents its retirement](https://docs.github.com/en/github-models). The local model needs no personal API key. GitHub's combined “Allow GitHub Actions to create and approve pull requests” repository setting is necessary for bot-created PRs; enabling that setting requires the owner's explicit approval in this session.

## Break-and-fix experiment status

Prepared local branch `test/breaking-reservation-change`, commit `9f48262`, changing only the overlap predicate from `$gt` to `$gte`. Existing Jest tests detect 5 failures and 86 passes, including adjacent-slot service cases and an HTTP boundary case (expected 201, received 409). Tests and assertions are unchanged. Main retains the correct predicate.

**Pending:** repository permission approval, remote break PR, actual model-generated remediation PR, passing repair CI and student review. The workflow implementation and green baseline are verified; the end-to-end auto-heal experiment is not yet claimed complete.

## Human-in-the-loop audit

Student review has not yet occurred. The generated repair PR will contain a checklist requiring inspection of the source diff, confirmation that tests were not weakened, review of passing verification, and a named reviewer/date/decision before acceptance. This document does not substitute automated checks for human review.
