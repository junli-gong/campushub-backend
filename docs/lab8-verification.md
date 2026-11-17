# Lab 8 — Auto-Healing CI/CD Pipelines

## Baseline verification

Verified on November 16, 2026 (America/Los_Angeles).

- Workflow: `.github/workflows/ci.yml`, commit `5e5c9ea1db30708a48ec83cae8169ae610062b98`.
- [Successful main CI run](https://github.com/junli-gong/campushub-backend/actions/runs/44017865693): lint, types, formatting, CI runner checks, build, tests and coverage passed. Auto-fix correctly skipped.
- Jest: 91/91 passed; Node regression: 24/24 passed; patch-validator tests: 2/2 passed.
- Jest coverage: 100% statements, branches, functions and lines for services/controllers.

## Repair design

The failed test exit status is preserved despite capturing output with `tee`. The downstream `auto-fix` job checks both `failure()` and the test-step outcome. It accepts only owner-authored, same-repository reservation-service-only PRs. The orchestrator comes from the trusted base revision; the candidate comes from the exact failed head.

Pinned Ollama runs `qwen2.5-coder:7b` locally on the Actions runner. The prompt includes actual failure output, the service source and the PR diff. The model must return a small exact replacement, applied only if its old text is unique. No hard-coded repair fallback exists. The original checks/build/tests/coverage must pass before publishing. Only the `auto-fix` job has write permissions, and only its publishing step is given the token (`GH_TOKEN`); the job still runs the PR's own code, which is acceptable only because it is limited to owner-authored same-repository PRs. The patch PR targets the broken branch. No automatic approval or merge is implemented.

GitHub Models was not used because [GitHub documents its retirement](https://docs.github.com/en/github-models). The local model needs no personal API key. GitHub's combined “Allow GitHub Actions to create and approve pull requests” repository setting is necessary for bot-created PRs; the repository owner enabled it for this lab.

## Break-and-fix experiment

All runs happened on 2026-11-17 UTC (November 16, America/Los_Angeles).

| Stage                 | Evidence                                                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Intentional break     | [PR #1](https://github.com/junli-gong/campushub-backend/pull/1), branch `test/breaking-reservation-change`: the overlap predicate `endTime: { $gt }` became `$gte`, so a booking starting exactly when another ends returns 409. No test changed |
| Stage 1: test failure | [Run 44022397338](https://github.com/junli-gong/campushub-backend/actions/runs/44022397338), job `build-test`: 5 failed, 86 passed; the job failed and uploaded `test-results.log`                                                               |
| Stage 2: auto-fix     | Same run, job `auto-fix`: `qwen2.5-coder:7b` returned `$gte` → `$gt` on its first attempt (about 220 s on the CPU runner); the candidate passed 91 Jest tests, 24 regression tests, and the coverage gates before anything was pushed            |
| Remediation PR        | [PR #2](https://github.com/junli-gong/campushub-backend/pull/2), opened by `github-actions[bot]` from `fix/auto-heal-44022397338` into the broken branch; one commit, one changed line                                                           |
| Repair branch CI      | [Run 44023119002](https://github.com/junli-gong/campushub-backend/actions/runs/44023119002) on the repair commit `26ecfaa`: `build-test` passed, `auto-fix` skipped                                                                              |

The repaired `src/` tree is identical to `main`. PR #1 stays open as the experiment record and must not be merged; PR #2 is the only automatically generated pull request.

### Rejected model output

Four earlier runs published nothing; [lab8/rejected-attempts.json](lab8/rejected-attempts.json) keeps the raw model responses.

| Run                                                                                     | Model output                                             | Stopped by                                 |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| [44019616848](https://github.com/junli-gong/campushub-backend/actions/runs/44019616848) | `qwen2.5-coder:1.5b` returned identical before and after | No-op check                                |
| [44020007775](https://github.com/junli-gong/campushub-backend/actions/runs/44020007775) | Reversed the change (`$gt` → `$gte`)                     | Text not found in the current source       |
| [44020690373](https://github.com/junli-gong/campushub-backend/actions/runs/44020690373) | `$gte` → `$lte`                                          | Unchanged tests: 30 failures               |
| [44021569991](https://github.com/junli-gong/campushub-backend/actions/runs/44021569991) | Correct operator, but copied context lost indentation    | Exact-match check, three attempts in a row |

After each rejection the prompt or the patch handling changed: a larger model, a retry loop that feeds back the rejection reason and failing tests, an explicit statement of the half-open interval rule, and trimming unchanged context lines before matching. Tests and assertions were never edited.

### Limitations

- The final prompt states the overlap rule explicitly, including both strict inequalities. The model located the line and produced the replacement, but with that much guidance this run does not show that a 7B model can diagnose an arbitrary regression.
- The runner only handles pull requests that change `src/services/reservation.service.ts` alone, and only single small replacements in that file.
- Bot-created pull requests do not trigger `pull_request` workflows, so the runner dispatches CI on the repair branch; PR #2 therefore shows no check status on the PR page itself.
- Actions artifacts (`test-results`, `auto-heal-evidence`) expire after 30 days.

## Review checks

| Check                           | Observed result                                                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run logs of 44022397338         | `build-test` failed with 5 failed / 86 passed; `auto-fix` logged one applied candidate, 91 + 24 passing tests, 100% coverage, then the PR URL               |
| `auto-heal-evidence` artifact   | One model response; its `before`/`after` match the PR diff and the model diagnosis in the PR description                                                    |
| Repair commit                   | Authored by `github-actions[bot]`; changes one line in `src/services/reservation.service.ts`; `git diff main` shows no difference under `src/` or `shared/` |
| Local `main`                    | `npm run check`, `npm run ci:check` (3 tests), and `npm test` (91 Jest + 24 regression) passed                                                              |
| Repository workflow permissions | Default token is read-only; the "create and approve pull requests" setting is enabled, and only the `auto-fix` job requests write access                    |

## Student review

Reviewed by Tim Gong on 2026-11-16. The human-in-the-loop audit is in the [PR #2 description](https://github.com/junli-gong/campushub-backend/pull/2): the patch was accepted as correct and not merged; it also records that the model's explanation ("double bookings") was wrong and that the final prompt stated the endpoint rule.

- [x] Reviewed the workflow and scripts against the Lab 8 requirements and confirmed the review findings.
- [x] Inspected the PR #2 diff, confirmed that no test or assertion changed, and recorded the audit in the PR description.
- [x] Submitted the repository URL to the Lab 8 Canvas assignment.
